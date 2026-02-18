export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { topics, agents, publications } from "@/lib/db/schema";
import { sql, isNotNull, desc } from "drizzle-orm";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";
import { withCache, cacheInvalidate } from "@/lib/cache";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { z } from "zod";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface TopicResult {
  id: string;
  name: string;
  agentCount: number;
  publicationCount: number;
  activity: string;
  trending: boolean;
  recentAgents: string[] | null;
}

// ──────────────────────────────────────────────
// Capability-to-topic mapping (fallback for
// computing topics from DB when no stored data)
// ──────────────────────────────────────────────

const TOPIC_MAP: ReadonlyArray<{ id: string; name: string; keywords: readonly string[] }> = [
  { id: "finance", name: "Finance & Markets", keywords: ["portfolio", "market", "earnings", "quant", "trading", "financial", "equity", "stock", "bond", "yield", "valuation", "ipo"] },
  { id: "risk", name: "Risk Management", keywords: ["risk", "drawdown", "volatility", "hedging", "var", "correlation"] },
  { id: "compliance", name: "Regulatory & Compliance", keywords: ["sec", "regulatory", "compliance", "filing", "legal", "aml", "kyc", "esg"] },
  { id: "ai-ml", name: "AI & Machine Learning", keywords: ["ai", "ml", "model", "neural", "nlp", "llm", "benchmark", "inference", "gpu"] },
  { id: "data-analytics", name: "Data & Analytics", keywords: ["data", "analytics", "sentiment", "signal", "pipeline", "etl", "geospatial"] },
  { id: "crypto-defi", name: "Crypto & DeFi", keywords: ["defi", "crypto", "blockchain", "protocol", "smart contract", "token", "mev", "yield farm"] },
  { id: "science", name: "Science & Research", keywords: ["research", "paper", "clinical", "trial", "patent", "academic", "journal"] },
  { id: "security", name: "Security & Infrastructure", keywords: ["security", "vulnerability", "sast", "dast", "api monitor", "incident", "uptime"] },
];

function classifyCapabilities(capabilities: string[]): Set<string> {
  const matched = new Set<string>();
  for (const cap of capabilities) {
    const lower = cap.toLowerCase();
    for (const topic of TOPIC_MAP) {
      if (topic.keywords.some((kw) => lower.includes(kw))) {
        matched.add(topic.id);
      }
    }
  }
  return matched;
}

// ──────────────────────────────────────────────
// Compute topics from DB (fallback when no
// stored topic data exists)
// ──────────────────────────────────────────────

async function computeTopicsFromDb(): Promise<TopicResult[]> {
  const agentRows = await db
    .select({
      name: agents.name,
      capabilities: agents.capabilities,
    })
    .from(agents)
    .where(sql`${agents.status} = 'active'`);

  const pubRows = await db
    .select({
      tags: publications.tags,
    })
    .from(publications)
    .where(isNotNull(publications.publishedAt));

  const topicAgents = new Map<string, Set<string>>();
  const topicPubCount = new Map<string, number>();

  for (const t of TOPIC_MAP) {
    topicAgents.set(t.id, new Set());
    topicPubCount.set(t.id, 0);
  }

  for (const agent of agentRows) {
    const caps = agent.capabilities ?? [];
    const matched = classifyCapabilities(caps);
    for (const topicId of matched) {
      topicAgents.get(topicId)?.add(agent.name);
    }
  }

  for (const pub of pubRows) {
    const tags = pub.tags ?? [];
    const matched = classifyCapabilities(tags);
    for (const topicId of matched) {
      topicPubCount.set(topicId, (topicPubCount.get(topicId) ?? 0) + 1);
    }
  }

  return TOPIC_MAP.map((t) => {
    const agentNames = topicAgents.get(t.id) ?? new Set();
    const agentCount = agentNames.size;
    const publicationCount = topicPubCount.get(t.id) ?? 0;
    return {
      id: t.id,
      name: t.name,
      agentCount,
      publicationCount,
      activity: String(agentCount + publicationCount),
      trending: false,
      recentAgents: Array.from(agentNames).slice(0, 5),
    };
  }).filter((t) => t.agentCount > 0 || t.publicationCount > 0);
}

// ──────────────────────────────────────────────
// GET /api/topics (public)
// Reads stored topic data from DB, falls back
// to live computation if no stored data exists
// ──────────────────────────────────────────────

export const GET = withErrorHandler(async () => {
  const result = await withCache<TopicResult[]>("topics:all", 300, async () => {
    // Try reading from the topics table first
    const stored = await db
      .select()
      .from(topics)
      .orderBy(desc(topics.activity));

    if (stored.length > 0) {
      return stored.map((t) => ({
        id: t.id,
        name: t.name,
        agentCount: t.agentCount,
        publicationCount: t.publicationCount,
        activity: t.activity,
        trending: t.trending,
        recentAgents: t.recentAgents,
      }));
    }

    // Fallback: compute from agents + publications
    return computeTopicsFromDb();
  });

  return successResponse({ topics: result });
});

// ──────────────────────────────────────────────
// PUT /api/topics (platform-ops auth)
// Accepts computed topic data from the
// topic-tracker skill and upserts into DB
// ──────────────────────────────────────────────

const topicSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  agentCount: z.number().int().min(0),
  publicationCount: z.number().int().min(0),
  activity: z.number().min(0),
  trending: z.boolean(),
  recentAgents: z.array(z.string()).max(10),
});

const putBodySchema = z.object({
  topics: z.array(topicSchema).min(1).max(50),
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
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

  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid topic data", 400, parsed.error.issues);
  }

  const now = new Date();

  // Upsert each topic using raw SQL for ON CONFLICT
  for (const t of parsed.data.topics) {
    await db
      .insert(topics)
      .values({
        id: t.id,
        name: t.name,
        agentCount: t.agentCount,
        publicationCount: t.publicationCount,
        activity: String(t.activity),
        trending: t.trending,
        recentAgents: t.recentAgents,
        computedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: topics.id,
        set: {
          name: sql`EXCLUDED.name`,
          agentCount: sql`EXCLUDED.agent_count`,
          publicationCount: sql`EXCLUDED.publication_count`,
          activity: sql`EXCLUDED.activity`,
          trending: sql`EXCLUDED.trending`,
          recentAgents: sql`EXCLUDED.recent_agents`,
          computedAt: sql`EXCLUDED.computed_at`,
          updatedAt: sql`EXCLUDED.updated_at`,
        },
      });
  }

  // Invalidate cache so next GET returns fresh data
  await cacheInvalidate("topics:all");

  return successResponse({ updated: parsed.data.topics.length });
});
