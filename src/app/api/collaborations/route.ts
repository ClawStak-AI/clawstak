export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { collaborations, agents } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq, and, or, count } from "drizzle-orm";
import { z } from "zod";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

const createCollaborationSchema = z.object({
  requestingAgentId: z.string().uuid(),
  providingAgentId: z.string().uuid(),
  taskDescription: z.string().min(1).max(5000),
  negotiatedTerms: z.record(z.string(), z.unknown()).optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return errorResponse("UNAUTHORIZED", auth.error ?? "Unauthorized", auth.status ?? 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_BODY", "Invalid JSON body", 400);
  }

  const parsed = createCollaborationSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const { requestingAgentId, providingAgentId, taskDescription, negotiatedTerms } = parsed.data;

  if (requestingAgentId === providingAgentId) {
    return errorResponse("VALIDATION_ERROR", "An agent cannot collaborate with itself", 400);
  }

  // Verify both agents exist
  const [requestingAgent] = await db
    .select({ id: agents.id, name: agents.name })
    .from(agents)
    .where(eq(agents.id, requestingAgentId));

  if (!requestingAgent) {
    return errorResponse("NOT_FOUND", "Requesting agent not found", 404);
  }

  const [providingAgent] = await db
    .select({ id: agents.id, name: agents.name })
    .from(agents)
    .where(eq(agents.id, providingAgentId));

  if (!providingAgent) {
    return errorResponse("NOT_FOUND", "Providing agent not found", 404);
  }

  const [collaboration] = await db
    .insert(collaborations)
    .values({
      requestingAgentId,
      providingAgentId,
      taskDescription,
      negotiatedTerms: negotiatedTerms ?? null,
      status: "proposed",
    })
    .returning();

  return successResponse({ collaboration }, undefined, 201);
});

const statusFilter = z.enum(["proposed", "active", "completed", "rejected"]).optional();

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return errorResponse("UNAUTHORIZED", auth.error ?? "Unauthorized", auth.status ?? 401);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const agentId = searchParams.get("agentId");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  if (status) {
    const statusParsed = statusFilter.safeParse(status);
    if (!statusParsed.success) {
      return errorResponse("VALIDATION_ERROR", "Invalid status filter. Must be: proposed, active, completed, or rejected", 400);
    }
  }

  // Build where conditions
  const conditions = [];

  if (status) {
    conditions.push(eq(collaborations.status, status));
  }

  if (agentId) {
    conditions.push(
      or(
        eq(collaborations.requestingAgentId, agentId),
        eq(collaborations.providingAgentId, agentId),
      )!,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: collaborations.id,
      requestingAgentId: collaborations.requestingAgentId,
      providingAgentId: collaborations.providingAgentId,
      status: collaborations.status,
      taskDescription: collaborations.taskDescription,
      negotiatedTerms: collaborations.negotiatedTerms,
      resultPayload: collaborations.resultPayload,
      qualityScore: collaborations.qualityScore,
      completedAt: collaborations.completedAt,
      createdAt: collaborations.createdAt,
      updatedAt: collaborations.updatedAt,
    })
    .from(collaborations)
    .where(whereClause)
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(collaborations)
    .where(whereClause);

  return successResponse(rows, {
    page: Math.floor(offset / limit) + 1,
    limit,
    total,
  });
});
