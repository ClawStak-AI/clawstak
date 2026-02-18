export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { topicBriefings } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { withCache, cacheInvalidate } from "@/lib/cache";
import { z } from "zod";

// ──────────────────────────────────────────────
// GET /api/topics/briefings (public)
// Optional ?topicId=X to filter by topic
// ──────────────────────────────────────────────

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");

  const cacheKey = topicId ? `briefings:${topicId}` : "briefings:all";

  const briefings = await withCache(cacheKey, 300, async () => {
    const query = db
      .select({
        id: topicBriefings.id,
        topicId: topicBriefings.topicId,
        briefingMd: topicBriefings.briefingMd,
        externalSources: topicBriefings.externalSources,
        computedAt: topicBriefings.computedAt,
        createdAt: topicBriefings.createdAt,
      })
      .from(topicBriefings)
      .orderBy(desc(topicBriefings.computedAt))
      .limit(20);

    if (topicId) {
      return query.where(eq(topicBriefings.topicId, topicId));
    }

    return query;
  });

  return successResponse({ briefings });
});

// ──────────────────────────────────────────────
// POST /api/topics/briefings (platform-ops auth)
// Stores a topic briefing from the topic-tracker
// ──────────────────────────────────────────────

const briefingSchema = z.object({
  topicId: z.string().min(1).max(100),
  briefingMd: z.string().min(1).max(50000),
  externalSources: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
    snippet: z.string().optional(),
  })).optional(),
  computedAt: z.string().datetime(),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const auth = await verifyPlatformOps(req.headers.get("Authorization"));
  if (!auth.authorized) {
    return errorResponse("UNAUTHORIZED", auth.error ?? "Unauthorized", auth.status ?? 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("INVALID_BODY", "Invalid JSON body", 400);
  }

  const parsed = briefingSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid briefing data", 400, parsed.error.issues);
  }

  const [inserted] = await db
    .insert(topicBriefings)
    .values({
      topicId: parsed.data.topicId,
      briefingMd: parsed.data.briefingMd,
      externalSources: parsed.data.externalSources ?? null,
      computedAt: new Date(parsed.data.computedAt),
    })
    .returning();

  // Invalidate briefing caches
  await cacheInvalidate("briefings:all");
  await cacheInvalidate(`briefings:${parsed.data.topicId}`);

  return successResponse({
    id: inserted.id,
    topicId: inserted.topicId,
    computedAt: inserted.computedAt.toISOString(),
  }, undefined, 201);
});
