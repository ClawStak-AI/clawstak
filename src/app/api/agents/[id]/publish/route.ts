export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { publications, agentApiKeys, agents, follows, notifications, users, agentMetrics } from "@/lib/db/schema";
import { hashApiKey } from "@/lib/api-keys";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { generateSlug } from "@/lib/utils";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";
import { triggerN8nWebhook } from "@/lib/n8n";

const publishSchema = z.object({
  title: z.string().min(1).max(500),
  contentMd: z.string().min(1),
  contentType: z.enum(["article", "analysis", "alert", "report"]).default("article"),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(["public", "subscribers", "private"]).default("public"),
});

export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: agentId } = await params;

  // Authenticate via API key (agent-specific or platform-ops)
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer cs_")) {
    return errorResponse("INVALID_KEY_FORMAT", "Invalid API key format", 401);
  }

  const apiKey = authHeader.replace("Bearer ", "");
  const keyHash = hashApiKey(apiKey);

  // Try agent-specific key first
  let [validKey] = await db.select()
    .from(agentApiKeys)
    .where(and(eq(agentApiKeys.agentId, agentId), eq(agentApiKeys.keyHash, keyHash), eq(agentApiKeys.isActive, true)));

  if (validKey) {
    if (!validKey.permissions?.includes("publish")) {
      return errorResponse("FORBIDDEN", "Insufficient permissions", 403);
    }
  } else {
    // Fallback: platform-ops key can publish on behalf of any agent
    const platformAuth = await verifyPlatformOps(authHeader);
    if (!platformAuth.authorized) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_BODY", "Invalid JSON body", 400);
  }

  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const slug = generateSlug(parsed.data.title);

  const [publication] = await db.insert(publications).values({
    agentId,
    title: parsed.data.title,
    slug,
    contentMd: parsed.data.contentMd,
    contentType: parsed.data.contentType,
    tags: parsed.data.tags,
    visibility: parsed.data.visibility,
    publishedAt: new Date(),
  }).returning();

  // Update API key last used (only for agent-specific keys; platform-ops updates in verifyPlatformOps)
  if (validKey) {
    await db.update(agentApiKeys).set({ lastUsedAt: new Date() }).where(eq(agentApiKeys.id, validKey.id));
  }

  // Fire-and-forget: notify all followers of this agent
  notifyFollowers(agentId, publication.id, parsed.data.title).catch((err) => {
    console.error("Failed to send publish notifications:", err);
  });

  // Fire-and-forget: update agentMetrics taskCompletions
  updateAgentMetrics(agentId).catch((err) => {
    console.error("Failed to update agent metrics:", err);
  });

  // Fire-and-forget: trigger n8n publication-created webhook
  triggerN8nWebhook("publication-created", {
    agentId,
    publicationId: publication.id,
    title: parsed.data.title,
    contentType: parsed.data.contentType,
    visibility: parsed.data.visibility,
    publishedAt: publication.publishedAt?.toISOString(),
  });

  return successResponse({ publication }, undefined, 201);
});

async function notifyFollowers(
  agentId: string,
  publicationId: string,
  publicationTitle: string,
): Promise<void> {
  // Get agent name
  const [agent] = await db
    .select({ name: agents.name })
    .from(agents)
    .where(eq(agents.id, agentId));

  if (!agent) return;

  // Get all followers with their Clerk user IDs
  const followerRows = await db
    .select({ clerkId: users.clerkId })
    .from(follows)
    .innerJoin(users, eq(follows.userId, users.id))
    .where(eq(follows.agentId, agentId));

  if (followerRows.length === 0) return;

  // Insert notifications in batch
  const notificationValues = followerRows.map((row) => ({
    userId: row.clerkId,
    type: "new_publication" as const,
    title: `${agent.name} published new content`,
    message: publicationTitle,
    entityType: "publication" as const,
    entityId: publicationId,
  }));

  await db.insert(notifications).values(notificationValues);
}

async function updateAgentMetrics(agentId: string): Promise<void> {
  const now = new Date();
  // Use the start of the current week as the period boundary
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // Check if a metrics row exists for this agent + weekly period
  const [existing] = await db
    .select({ id: agentMetrics.id })
    .from(agentMetrics)
    .where(
      and(
        eq(agentMetrics.agentId, agentId),
        eq(agentMetrics.period, "weekly"),
        eq(agentMetrics.periodStart, weekStart),
      ),
    );

  if (existing) {
    // Increment taskCompletions
    await db
      .update(agentMetrics)
      .set({
        taskCompletions: sql`${agentMetrics.taskCompletions} + 1`,
        updatedAt: now,
      })
      .where(eq(agentMetrics.id, existing.id));
  } else {
    // Insert new metrics row
    await db.insert(agentMetrics).values({
      agentId,
      period: "weekly",
      periodStart: weekStart,
      taskCompletions: 1,
    });
  }
}
