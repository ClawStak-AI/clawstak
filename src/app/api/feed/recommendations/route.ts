export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { feedRecommendations, publications, agents } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq, desc, and, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

// ──────────────────────────────────────────────
// Validation Schemas
// ──────────────────────────────────────────────

const recommendationItemSchema = z.object({
  publicationId: z.string().uuid(),
  score: z.number().min(0).max(100),
  reason: z.string().max(255).optional(),
  isTrending: z.boolean().default(false),
  computedAt: z.string().datetime(),
});

const batchRecommendationsSchema = z.object({
  recommendations: z.array(recommendationItemSchema).min(1).max(200),
});

// ──────────────────────────────────────────────
// POST — Batch upsert recommendation scores (platform-ops auth)
// ──────────────────────────────────────────────

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

  const parsed = batchRecommendationsSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const { recommendations } = parsed.data;

  let upserted = 0;
  const errors: Array<{ publicationId: string; error: string }> = [];

  // Batch upsert using onConflictDoUpdate (requires unique index on publicationId)
  const batchSize = 50;
  for (let i = 0; i < recommendations.length; i += batchSize) {
    const batch = recommendations.slice(i, i + batchSize);
    try {
      const values = batch.map((rec) => ({
        publicationId: rec.publicationId,
        score: String(rec.score),
        reason: rec.reason ?? null,
        isTrending: rec.isTrending,
        computedAt: new Date(rec.computedAt),
      }));

      await db
        .insert(feedRecommendations)
        .values(values)
        .onConflictDoUpdate({
          target: feedRecommendations.publicationId,
          set: {
            score: sql`excluded.score`,
            reason: sql`excluded.reason`,
            isTrending: sql`excluded.is_trending`,
            computedAt: sql`excluded.computed_at`,
          },
        });

      upserted += batch.length;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      for (const rec of batch) {
        errors.push({ publicationId: rec.publicationId, error: message });
      }
    }
  }

  return successResponse({
    upserted,
    total: recommendations.length,
    errors: errors.length > 0 ? errors : undefined,
  }, undefined, errors.length > 0 && upserted === 0 ? 207 : 200);
});

// ──────────────────────────────────────────────
// GET — Read top recommendations (public)
// ──────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const page = parseInt(searchParams.get("page") || "1");
  const offset = (page - 1) * limit;
  const trendingOnly = searchParams.get("trending") === "true";

  const conditions = [isNotNull(publications.publishedAt)];
  if (trendingOnly) {
    conditions.push(eq(feedRecommendations.isTrending, true));
  }

  const rows = await db
    .select({
      id: feedRecommendations.id,
      publicationId: feedRecommendations.publicationId,
      score: feedRecommendations.score,
      reason: feedRecommendations.reason,
      isTrending: feedRecommendations.isTrending,
      computedAt: feedRecommendations.computedAt,
      title: publications.title,
      slug: publications.slug,
      contentType: publications.contentType,
      tags: publications.tags,
      viewCount: publications.viewCount,
      likeCount: publications.likeCount,
      publishedAt: publications.publishedAt,
      agentName: agents.name,
      agentSlug: agents.slug,
      agentAvatar: agents.avatarUrl,
    })
    .from(feedRecommendations)
    .innerJoin(publications, eq(feedRecommendations.publicationId, publications.id))
    .innerJoin(agents, eq(publications.agentId, agents.id))
    .where(and(...conditions))
    .orderBy(desc(feedRecommendations.score))
    .limit(limit)
    .offset(offset);

  return successResponse(rows, { page, limit });
});
