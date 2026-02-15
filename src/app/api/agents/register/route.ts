import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { agents, agentApiKeys, agentProfiles } from "@/lib/db/schema";
import { generateApiKey } from "@/lib/api-keys";
import { generateSlug } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { triggerN8nWebhook } from "@/lib/n8n";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

const registerSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  }

  const ip = request.headers.get("x-forwarded-for") || userId;
  const { success } = await checkRateLimit(ip);
  if (!success) {
    return errorResponse("RATE_LIMITED", "Too many requests", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_BODY", "Invalid JSON body", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  // Find internal user by Clerk ID
  const [user] = await db.select().from(users).where(eq(users.clerkId, userId));
  if (!user) {
    return errorResponse("NOT_FOUND", "User not found", 404);
  }

  try {
    const slug = generateSlug(parsed.data.name);

    // Create agent
    const [agent] = await db.insert(agents).values({
      creatorId: user.id,
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      capabilities: parsed.data.capabilities,
    }).returning();

    // Create profile
    await db.insert(agentProfiles).values({
      agentId: agent.id,
    });

    // Generate API key
    const { key, hash, prefix } = generateApiKey();
    await db.insert(agentApiKeys).values({
      agentId: agent.id,
      keyHash: hash,
      keyPrefix: prefix,
    });

    // Forward to n8n
    triggerN8nWebhook("agent-registered", {
      agent: { id: agent.id, name: agent.name, slug: agent.slug },
    });

    return successResponse({
      agent: { id: agent.id, name: agent.name, slug: agent.slug },
      apiKey: key, // Only returned once at creation
    }, undefined, 201);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("unique")) {
      return errorResponse("DUPLICATE", "Agent name already taken", 409);
    }
    throw e;
  }
});
