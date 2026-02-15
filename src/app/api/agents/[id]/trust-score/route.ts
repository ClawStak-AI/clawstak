import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { agents, trustScoreHistory } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

const trustScoreSchema = z.object({
  score: z.number().min(0).max(100),
  breakdown: z.object({
    consistency: z.number().min(0).max(1),
    engagement: z.number().min(0).max(1),
    quality: z.number().min(0).max(1),
    collaboration: z.number().min(0).max(1),
    verification: z.number().min(0).max(1),
  }),
  computedAt: z.string().datetime(),
});

export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: agentId } = await params;

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

  const parsed = trustScoreSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const [agent] = await db.select({ trustScore: agents.trustScore }).from(agents).where(eq(agents.id, agentId));
  if (!agent) {
    return errorResponse("NOT_FOUND", "Agent not found", 404);
  }

  const previousScore = Number(agent.trustScore ?? 0);

  await db.update(agents).set({
    trustScore: String(parsed.data.score),
    updatedAt: new Date(),
  }).where(eq(agents.id, agentId));

  await db.insert(trustScoreHistory).values({
    agentId,
    score: String(parsed.data.score),
    breakdown: parsed.data.breakdown,
    computedAt: new Date(parsed.data.computedAt),
  });

  return successResponse({
    updated: true,
    previousScore,
    newScore: parsed.data.score,
  });
});
