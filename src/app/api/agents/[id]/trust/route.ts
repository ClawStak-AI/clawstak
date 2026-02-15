import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { agents, trustScoreHistory } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";
import { withCache } from "@/lib/cache";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type TrustEventType =
  | "milestone"
  | "publication"
  | "accuracy"
  | "endorsement"
  | "report"
  | "engagement";

interface TrustEvent {
  date: string;
  score: number;
  event: string;
  type: TrustEventType;
  delta: number;
}

interface TrustTimelineResponse {
  agent: {
    name: string;
    slug: string;
    trustScore: number;
    isVerified: boolean;
  };
  timeline: TrustEvent[];
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

interface Breakdown {
  consistency?: number;
  engagement?: number;
  quality?: number;
  collaboration?: number;
  verification?: number;
}

function inferEventType(breakdown: unknown, delta: number): TrustEventType {
  if (!breakdown || typeof breakdown !== "object") {
    return delta >= 0 ? "milestone" : "report";
  }
  const b = breakdown as Breakdown;

  // Find the dimension with the highest value to infer event type
  const scores: Array<[TrustEventType, number]> = [
    ["accuracy", b.quality ?? 0],
    ["engagement", b.engagement ?? 0],
    ["milestone", b.verification ?? 0],
    ["endorsement", b.collaboration ?? 0],
    ["publication", b.consistency ?? 0],
  ];

  if (delta < 0) return "report";

  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][0];
}

function describeEvent(type: TrustEventType, delta: number): string {
  const descriptions: Record<TrustEventType, string> = {
    milestone: "Trust score milestone reached",
    publication: "Publication consistency update",
    accuracy: "Quality assessment completed",
    endorsement: "Collaboration score updated",
    report: "Trust score adjustment",
    engagement: "Engagement metrics updated",
  };

  if (delta > 0) {
    return `${descriptions[type]} (+${delta})`;
  }
  if (delta < 0) {
    return `${descriptions[type]} (${delta})`;
  }
  return descriptions[type];
}

// ──────────────────────────────────────────────
// GET handler
// ──────────────────────────────────────────────

export const GET = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: slug } = await params;

  const data = await withCache<TrustTimelineResponse | null>(
    `trust-timeline:${slug}`,
    60,
    async () => {
      const agent = await db.query.agents.findFirst({
        where: eq(agents.slug, slug),
      });

      if (!agent) {
        return null;
      }

      const currentScore = Number(agent.trustScore ?? 0);

      // Fetch real trust score history (oldest first for delta computation)
      const history = await db
        .select({
          score: trustScoreHistory.score,
          breakdown: trustScoreHistory.breakdown,
          computedAt: trustScoreHistory.computedAt,
        })
        .from(trustScoreHistory)
        .where(eq(trustScoreHistory.agentId, agent.id))
        .orderBy(asc(trustScoreHistory.computedAt));

      const timeline: TrustEvent[] = history.map((h, i) => {
        const score = Number(h.score);
        const prevScore = i > 0 ? Number(history[i - 1].score) : score;
        const delta = Math.round((score - prevScore) * 100) / 100;
        const eventType = inferEventType(h.breakdown, delta);

        return {
          date: h.computedAt.toISOString().split("T")[0],
          score,
          event: describeEvent(eventType, delta),
          type: eventType,
          delta,
        };
      });

      return {
        agent: {
          name: agent.name,
          slug: agent.slug,
          trustScore: currentScore,
          isVerified: agent.isVerified,
        },
        timeline,
      };
    },
  );

  if (!data) {
    return errorResponse("NOT_FOUND", "Agent not found", 404);
  }

  return successResponse(data);
});
