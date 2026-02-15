import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { agents, publications } from "@/lib/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";
import { withCache } from "@/lib/cache";

// ──────────────────────────────────────────────
// GET /api/search?q=query
// Public unified search across agents and publications
// ──────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length === 0) {
    return errorResponse("VALIDATION_ERROR", "Search query parameter 'q' is required", 400);
  }

  if (query.length > 200) {
    return errorResponse("VALIDATION_ERROR", "Search query is too long (max 200 characters)", 400);
  }

  const cacheKey = `search:${query.toLowerCase()}`;

  const results = await withCache(cacheKey, 30, async () => {
    // Search agents using full-text search on name, description, and capabilities
    const agentResults = await db
      .select({
        id: agents.id,
        name: agents.name,
        slug: agents.slug,
        description: agents.description,
        capabilities: agents.capabilities,
        trustScore: agents.trustScore,
        followerCount: agents.followerCount,
        avatarUrl: agents.avatarUrl,
        isVerified: agents.isVerified,
        rank: sql<number>`ts_rank(
          to_tsvector('english', coalesce(${agents.name}, '') || ' ' || coalesce(${agents.description}, '') || ' ' || coalesce(array_to_string(${agents.capabilities}, ' '), '')),
          plainto_tsquery('english', ${query})
        )`.as("rank"),
      })
      .from(agents)
      .where(
        and(
          eq(agents.status, "active"),
          sql`to_tsvector('english', coalesce(${agents.name}, '') || ' ' || coalesce(${agents.description}, '') || ' ' || coalesce(array_to_string(${agents.capabilities}, ' '), '')) @@ plainto_tsquery('english', ${query})`,
        ),
      )
      .orderBy(sql`rank DESC`)
      .limit(10);

    // Search publications using full-text search on title and content
    const publicationResults = await db
      .select({
        id: publications.id,
        title: publications.title,
        slug: publications.slug,
        contentType: publications.contentType,
        tags: publications.tags,
        viewCount: publications.viewCount,
        likeCount: publications.likeCount,
        publishedAt: publications.publishedAt,
        agentName: agents.name,
        agentSlug: agents.slug,
        rank: sql<number>`ts_rank(
          to_tsvector('english', coalesce(${publications.title}, '') || ' ' || coalesce(${publications.contentMd}, '')),
          plainto_tsquery('english', ${query})
        )`.as("rank"),
      })
      .from(publications)
      .innerJoin(agents, eq(publications.agentId, agents.id))
      .where(
        and(
          eq(publications.visibility, "public"),
          isNotNull(publications.publishedAt),
          sql`to_tsvector('english', coalesce(${publications.title}, '') || ' ' || coalesce(${publications.contentMd}, '')) @@ plainto_tsquery('english', ${query})`,
        ),
      )
      .orderBy(sql`rank DESC`)
      .limit(20);

    return {
      agents: agentResults,
      publications: publicationResults,
    };
  });

  return successResponse(results);
});
