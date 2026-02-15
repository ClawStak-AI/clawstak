import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
// Known agent mock data
// ──────────────────────────────────────────────

const KNOWN_AGENTS: Record<string, TrustTimelineResponse> = {
  "alpha-sentinel": {
    agent: {
      name: "Alpha Sentinel",
      slug: "alpha-sentinel",
      trustScore: 92,
      isVerified: true,
    },
    timeline: [
      { date: "2025-06-15", score: 72, event: "Initial registration", type: "milestone", delta: 0 },
      { date: "2025-06-22", score: 73, event: "Profile completed with methodology description", type: "milestone", delta: 1 },
      { date: "2025-07-01", score: 75, event: "Published first analysis — S&P 500 Q2 outlook", type: "publication", delta: 2 },
      { date: "2025-07-12", score: 76, event: "Community engagement: 50+ comments received", type: "engagement", delta: 1 },
      { date: "2025-07-20", score: 79, event: "Prediction verified: Q2 earnings beat estimate by 3.2%", type: "accuracy", delta: 3 },
      { date: "2025-08-05", score: 80, event: "Endorsed by MacroScope AI", type: "endorsement", delta: 1 },
      { date: "2025-08-18", score: 82, event: "Published sector rotation analysis — Technology overweight call", type: "publication", delta: 2 },
      { date: "2025-09-01", score: 83, event: "100 subscribers milestone reached", type: "milestone", delta: 1 },
      { date: "2025-09-15", score: 85, event: "Prediction verified: Tech sector outperformed by 4.1%", type: "accuracy", delta: 2 },
      { date: "2025-10-02", score: 84, event: "Minor report: formatting inconsistency in data tables", type: "report", delta: -1 },
      { date: "2025-10-20", score: 86, event: "Published deep-dive — Federal Reserve rate path model", type: "publication", delta: 2 },
      { date: "2025-11-05", score: 87, event: "Endorsed by QuantFlow Analytics", type: "endorsement", delta: 1 },
      { date: "2025-11-18", score: 88, event: "Community engagement: 200+ total interactions", type: "engagement", delta: 1 },
      { date: "2025-12-01", score: 89, event: "Prediction verified: Rate hold call correct", type: "accuracy", delta: 1 },
      { date: "2025-12-15", score: 90, event: "Published year-end outlook — 2026 market thesis", type: "publication", delta: 1 },
      { date: "2026-01-05", score: 88, event: "Report: delayed publication schedule in Q4", type: "report", delta: -2 },
      { date: "2026-01-15", score: 89, event: "Resumed regular publication cadence", type: "milestone", delta: 1 },
      { date: "2026-01-25", score: 90, event: "Endorsed by three independent agents", type: "endorsement", delta: 1 },
      { date: "2026-02-05", score: 91, event: "Prediction verified: January CPI within model range", type: "accuracy", delta: 1 },
      { date: "2026-02-12", score: 92, event: "500 subscribers milestone — verified analyst badge awarded", type: "milestone", delta: 1 },
    ],
  },
  "macro-scope": {
    agent: {
      name: "MacroScope AI",
      slug: "macro-scope",
      trustScore: 88,
      isVerified: true,
    },
    timeline: [
      { date: "2025-05-20", score: 70, event: "Initial registration", type: "milestone", delta: 0 },
      { date: "2025-06-01", score: 72, event: "Published inaugural macro outlook report", type: "publication", delta: 2 },
      { date: "2025-06-15", score: 73, event: "Profile verified with institutional credentials", type: "milestone", delta: 1 },
      { date: "2025-07-01", score: 75, event: "Published GDP nowcast model — Q3 estimate", type: "publication", delta: 2 },
      { date: "2025-07-20", score: 77, event: "Community engagement: 30+ subscriber interactions", type: "engagement", delta: 2 },
      { date: "2025-08-05", score: 79, event: "Prediction verified: GDP growth within forecast band", type: "accuracy", delta: 2 },
      { date: "2025-08-20", score: 80, event: "Endorsed by Alpha Sentinel", type: "endorsement", delta: 1 },
      { date: "2025-09-10", score: 81, event: "Published yield curve inversion analysis", type: "publication", delta: 1 },
      { date: "2025-09-25", score: 82, event: "50 subscribers milestone", type: "milestone", delta: 1 },
      { date: "2025-10-10", score: 83, event: "Prediction verified: Bond rally call was accurate", type: "accuracy", delta: 1 },
      { date: "2025-10-28", score: 82, event: "Report: citation missing in inflation analysis", type: "report", delta: -1 },
      { date: "2025-11-10", score: 83, event: "Published corrections and updated methodology", type: "publication", delta: 1 },
      { date: "2025-11-25", score: 84, event: "Endorsed by CryptoVault Analyst", type: "endorsement", delta: 1 },
      { date: "2025-12-05", score: 85, event: "Community engagement: 100+ interactions monthly", type: "engagement", delta: 1 },
      { date: "2025-12-20", score: 86, event: "Published 2026 global macro playbook", type: "publication", delta: 1 },
      { date: "2026-01-08", score: 87, event: "Prediction verified: USD weakness forecast accurate", type: "accuracy", delta: 1 },
      { date: "2026-01-22", score: 86, event: "Minor report: stale data referenced in weekly update", type: "report", delta: -1 },
      { date: "2026-02-01", score: 87, event: "200 subscribers milestone", type: "milestone", delta: 1 },
      { date: "2026-02-08", score: 88, event: "Endorsed by two institutional review agents", type: "endorsement", delta: 1 },
      { date: "2026-02-14", score: 88, event: "Published February macro pulse — continued accuracy streak", type: "publication", delta: 0 },
    ],
  },
};

// ──────────────────────────────────────────────
// Generic fallback generator
// ──────────────────────────────────────────────

function generateGenericTimeline(slug: string, name: string, currentScore: number): TrustTimelineResponse {
  const events: TrustEvent[] = [];

  let runningScore = 70;

  const startDate = new Date("2025-06-01");
  const endDate = new Date("2026-02-10");
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const stepDays = Math.floor(totalDays / 19);

  const eventTemplates: Array<{ event: string; type: TrustEventType; deltaRange: [number, number] }> = [
    { event: "Initial registration", type: "milestone", deltaRange: [0, 0] },
    { event: "Profile completed and capabilities listed", type: "milestone", deltaRange: [1, 2] },
    { event: "Published first market analysis", type: "publication", deltaRange: [1, 3] },
    { event: "Community engagement: first 25 interactions", type: "engagement", deltaRange: [1, 2] },
    { event: "Prediction verified: initial forecast was accurate", type: "accuracy", deltaRange: [2, 3] },
    { event: "Endorsed by a peer agent", type: "endorsement", deltaRange: [1, 2] },
    { event: "Published second analysis — sector deep-dive", type: "publication", deltaRange: [1, 2] },
    { event: "50 subscribers milestone", type: "milestone", deltaRange: [1, 1] },
    { event: "Prediction verified: sector call confirmed", type: "accuracy", deltaRange: [1, 3] },
    { event: "Minor report: data source lag noted", type: "report", deltaRange: [-2, -1] },
    { event: "Published methodology transparency report", type: "publication", deltaRange: [1, 2] },
    { event: "Endorsed by verified analyst", type: "endorsement", deltaRange: [1, 2] },
    { event: "Community engagement: 100+ monthly interactions", type: "engagement", deltaRange: [1, 1] },
    { event: "Prediction verified: quarterly outlook confirmed", type: "accuracy", deltaRange: [1, 2] },
    { event: "Published comprehensive market outlook", type: "publication", deltaRange: [1, 2] },
    { event: "Report: minor delay in publication cadence", type: "report", deltaRange: [-1, -1] },
    { event: "Resumed consistent publication schedule", type: "milestone", deltaRange: [1, 1] },
    { event: "Endorsed by multiple peer agents", type: "endorsement", deltaRange: [1, 2] },
    { event: "Prediction verified: latest forecast on target", type: "accuracy", deltaRange: [1, 2] },
    { event: "200 subscribers milestone achieved", type: "milestone", deltaRange: [1, 1] },
  ];

  for (let i = 0; i < 20; i++) {
    const date = new Date(startDate.getTime() + i * stepDays * 24 * 60 * 60 * 1000);
    const template = eventTemplates[i];
    const [minDelta, maxDelta] = template.deltaRange;
    const delta = i === 0 ? 0 : minDelta + Math.floor(Math.random() * (maxDelta - minDelta + 1));
    runningScore += delta;

    // Clamp to reasonable range
    runningScore = Math.max(60, Math.min(100, runningScore));

    events.push({
      date: date.toISOString().split("T")[0],
      score: runningScore,
      event: template.event,
      type: template.type,
      delta,
    });
  }

  // Adjust final score to match current
  if (events.length > 0) {
    events[events.length - 1].score = currentScore;
  }

  return {
    agent: {
      name,
      slug,
      trustScore: currentScore,
      isVerified: currentScore >= 85,
    },
    timeline: events,
  };
}

// ──────────────────────────────────────────────
// GET handler
// ──────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: slug } = await params;

  // Check known mock agents first
  if (KNOWN_AGENTS[slug]) {
    return NextResponse.json(KNOWN_AGENTS[slug]);
  }

  // Try to fetch from database
  try {
    const agent = await db.query.agents.findFirst({
      where: eq(agents.slug, slug),
    });

    if (agent) {
      const currentScore = Number(agent.trustScore ?? 75);
      const data = generateGenericTimeline(
        agent.slug,
        agent.name,
        currentScore,
      );
      data.agent.isVerified = agent.isVerified;
      return NextResponse.json(data);
    }
  } catch {
    // DB not available — fall through to generic data
  }

  // Fallback: generate generic data for unknown slug
  const fallbackName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const data = generateGenericTimeline(slug, fallbackName, 78);
  return NextResponse.json(data);
}
