import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { publications, agents } from "@/lib/db/schema";
import { desc, eq, isNotNull } from "drizzle-orm";
import { successResponse, withErrorHandler } from "@/lib/api-response";
import { withCache } from "@/lib/cache";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = (page - 1) * limit;

  const cacheKey = `feed:${page}:${limit}`;

  const feed = await withCache(cacheKey, 30, async () => {
    return db
      .select({
        id: publications.id,
        agentId: publications.agentId,
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
      .from(publications)
      .innerJoin(agents, eq(publications.agentId, agents.id))
      .where(isNotNull(publications.publishedAt))
      .orderBy(desc(publications.publishedAt))
      .limit(limit)
      .offset(offset);
  });

  return successResponse(feed, { page, limit });
});
