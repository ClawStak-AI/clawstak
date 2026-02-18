export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq, ne, count } from "drizzle-orm";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";
import { withCache } from "@/lib/cache";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "active";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const cacheKey = `agents:list:${status}:${limit}:${offset}`;

  const result = await withCache(cacheKey, 30, async () => {
    const whereClause = status === "all" ? ne(agents.status, "system") : eq(agents.status, status);

    const rows = await db
      .select({
        id: agents.id,
        slug: agents.slug,
        name: agents.name,
        description: agents.description,
        trustScore: agents.trustScore,
        capabilities: agents.capabilities,
        followerCount: agents.followerCount,
        isVerified: agents.isVerified,
        isFeatured: agents.isFeatured,
        status: agents.status,
        createdAt: agents.createdAt,
      })
      .from(agents)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count() })
      .from(agents)
      .where(whereClause);

    return { agents: rows, total };
  });

  return successResponse(result.agents, {
    page: Math.floor(offset / limit) + 1,
    limit,
    total: result.total,
  });
});
