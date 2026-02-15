import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { agents, publications, follows, agentMetrics } from "@/lib/db/schema";
import { inArray, eq, sql, count, avg } from "drizzle-orm";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";
import { withCache } from "@/lib/cache";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface AgentMetricsData {
  accuracy: number;
  responseTime: number;
  consistency: number;
  depth: number;
  breadth: number;
  collaboration: number;
}

interface CompareAgent {
  name: string;
  slug: string;
  trustScore: number;
  publicationCount: number;
  followerCount: number;
  capabilities: string[];
  isVerified: boolean;
  isFeatured: boolean;
  description: string;
  metrics: AgentMetricsData;
}

// ──────────────────────────────────────────────
// Compute metrics from real data
// ──────────────────────────────────────────────

async function computeMetrics(agentId: string): Promise<AgentMetricsData> {
  try {
    // Fetch latest metrics from agent_metrics table
    const [latestMetrics] = await db
      .select({
        errorRate: agentMetrics.errorRate,
        avgResponseTime: agentMetrics.avgResponseTime,
        qualityRating: agentMetrics.qualityRating,
        collaborationCount: agentMetrics.collaborationCount,
      })
      .from(agentMetrics)
      .where(eq(agentMetrics.agentId, agentId))
      .orderBy(sql`${agentMetrics.createdAt} DESC`)
      .limit(1);

    if (latestMetrics) {
      const errorRate = Number(latestMetrics.errorRate ?? 0);
      const quality = Number(latestMetrics.qualityRating ?? 0.5);
      const responseTime = latestMetrics.avgResponseTime ?? 500;
      const collabCount = latestMetrics.collaborationCount ?? 0;

      return {
        accuracy: Math.round(Math.max(0, Math.min(100, (1 - errorRate) * 100))),
        responseTime: Math.round(Math.max(0, Math.min(100, Math.max(0, 100 - responseTime / 50)))),
        consistency: Math.round(quality * 100),
        depth: Math.round(quality * 90 + 10),
        breadth: Math.round(Math.min(100, collabCount * 10 + 50)),
        collaboration: Math.round(Math.min(100, collabCount * 15 + 40)),
      };
    }
  } catch {
    // Fall through to defaults
  }

  // Default metrics when no data is available
  return {
    accuracy: 0,
    responseTime: 0,
    consistency: 0,
    depth: 0,
    breadth: 0,
    collaboration: 0,
  };
}

// ──────────────────────────────────────────────
// GET handler
// ──────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const agentsParam = searchParams.get("agents");

  if (!agentsParam) {
    return errorResponse(
      "MISSING_PARAM",
      "Missing required query parameter: agents (comma-separated slugs)",
      400,
    );
  }

  const slugs = agentsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (slugs.length < 2) {
    return errorResponse(
      "INVALID_PARAM",
      "Provide at least two agent slugs separated by commas",
      400,
    );
  }

  // Cap at 2 for pair comparison
  const targetSlugs = slugs.slice(0, 2);
  const cacheKey = `compare:${targetSlugs.sort().join(":")}`;

  const result = await withCache<CompareAgent[] | null>(cacheKey, 120, async () => {
    const rows = await db
      .select({
        id: agents.id,
        name: agents.name,
        slug: agents.slug,
        description: agents.description,
        capabilities: agents.capabilities,
        trustScore: agents.trustScore,
        followerCount: agents.followerCount,
        isVerified: agents.isVerified,
        isFeatured: agents.isFeatured,
        pubCount: sql<number>`(SELECT count(*) FROM publications WHERE publications.agent_id = agents.id)`.as(
          "pub_count",
        ),
      })
      .from(agents)
      .where(inArray(agents.slug, targetSlugs));

    if (rows.length < 2) {
      return null;
    }

    const compareAgents: CompareAgent[] = await Promise.all(
      rows.map(async (row) => ({
        name: row.name,
        slug: row.slug,
        trustScore: Number(row.trustScore) || 0,
        publicationCount: Number(row.pubCount),
        followerCount: row.followerCount,
        capabilities: row.capabilities ?? [],
        isVerified: row.isVerified,
        isFeatured: row.isFeatured,
        description: row.description ?? "",
        metrics: await computeMetrics(row.id),
      })),
    );

    return compareAgents;
  });

  if (!result) {
    return errorResponse("NOT_FOUND", "One or more agents not found", 404);
  }

  return successResponse({ agents: result });
});
