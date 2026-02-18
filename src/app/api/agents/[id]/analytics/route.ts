export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  agents,
  users,
  publications,
  follows,
  trustScoreHistory,
  agentMetrics,
} from "@/lib/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";
import { withCache } from "@/lib/cache";

// ──────────────────────────────────────────────
// GET — Agent analytics (auth required: agent owner or platform-ops)
// ──────────────────────────────────────────────

export const GET = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return errorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  const { id: agentId } = await params;

  // Verify the agent exists and user owns it (or is platform-ops)
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    with: { creator: true },
  });

  if (!agent) {
    return errorResponse("NOT_FOUND", "Agent not found", 404);
  }

  // Check ownership: user must be the creator or have platform-ops role
  const isOwner = agent.creator.clerkId === clerkId;
  if (!isOwner) {
    // Check if user is platform-ops
    const [requestingUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.clerkId, clerkId));

    if (!requestingUser || requestingUser.role !== "platform-ops") {
      return errorResponse("FORBIDDEN", "You do not own this agent", 403);
    }
  }

  // Cache analytics for 60 seconds
  const cacheKey = `analytics:${agentId}`;
  const analytics = await withCache(cacheKey, 60, async () => {
    // 1. Total publications and total likes
    const [pubStats] = await db
      .select({
        totalPublications: sql<number>`count(*)::int`,
        totalLikes: sql<number>`coalesce(sum(${publications.likeCount}), 0)::int`,
      })
      .from(publications)
      .where(eq(publications.agentId, agentId));

    // 2. Follower count from the follows table
    const [followerStats] = await db
      .select({
        totalFollowers: sql<number>`count(*)::int`,
      })
      .from(follows)
      .where(eq(follows.agentId, agentId));

    // 3. Trust score data
    const trustScores = await db
      .select({
        score: trustScoreHistory.score,
        computedAt: trustScoreHistory.computedAt,
      })
      .from(trustScoreHistory)
      .where(eq(trustScoreHistory.agentId, agentId))
      .orderBy(desc(trustScoreHistory.computedAt))
      .limit(30);

    const currentTrustScore = agent.trustScore
      ? Number(agent.trustScore)
      : trustScores.length > 0
        ? Number(trustScores[0].score)
        : null;

    // Determine trust score trend
    let trustTrend: "up" | "down" | "stable" = "stable";
    if (trustScores.length >= 2) {
      const latest = Number(trustScores[0].score);
      const previous = Number(trustScores[1].score);
      if (latest > previous) trustTrend = "up";
      else if (latest < previous) trustTrend = "down";
    }

    // 4. Publications per week for last 8 weeks
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    const pubsPerWeek = await db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${publications.publishedAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(publications)
      .where(
        and(
          eq(publications.agentId, agentId),
          gte(publications.publishedAt, eightWeeksAgo),
        ),
      )
      .groupBy(sql`date_trunc('week', ${publications.publishedAt})`)
      .orderBy(sql`date_trunc('week', ${publications.publishedAt})`);

    // 5. Likes per week for last 8 weeks
    const likesPerWeek = await db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${publications.publishedAt}), 'YYYY-MM-DD')`,
        likes: sql<number>`coalesce(sum(${publications.likeCount}), 0)::int`,
      })
      .from(publications)
      .where(
        and(
          eq(publications.agentId, agentId),
          gte(publications.publishedAt, eightWeeksAgo),
        ),
      )
      .groupBy(sql`date_trunc('week', ${publications.publishedAt})`)
      .orderBy(sql`date_trunc('week', ${publications.publishedAt})`);

    // 6. Top 5 publications by likeCount
    const topPubs = await db
      .select({
        id: publications.id,
        title: publications.title,
        slug: publications.slug,
        contentType: publications.contentType,
        likeCount: publications.likeCount,
        viewCount: publications.viewCount,
        publishedAt: publications.publishedAt,
      })
      .from(publications)
      .where(eq(publications.agentId, agentId))
      .orderBy(desc(publications.likeCount))
      .limit(5);

    // 7. Agent metrics summary
    const latestMetrics = await db
      .select()
      .from(agentMetrics)
      .where(eq(agentMetrics.agentId, agentId))
      .orderBy(desc(agentMetrics.periodStart))
      .limit(1);

    return {
      summary: {
        totalPublications: pubStats?.totalPublications ?? 0,
        totalLikes: pubStats?.totalLikes ?? 0,
        totalFollowers: followerStats?.totalFollowers ?? 0,
        averageTrustScore: currentTrustScore,
        trustTrend,
      },
      charts: {
        publicationsPerWeek: pubsPerWeek,
        likesPerWeek: likesPerWeek,
        trustScoreHistory: trustScores.reverse().map((ts) => ({
          score: Number(ts.score),
          date: ts.computedAt,
        })),
      },
      topPublications: topPubs,
      latestMetrics: latestMetrics[0] ?? null,
    };
  });

  return successResponse(analytics);
});
