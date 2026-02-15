import { db } from "@/lib/db";
import { agents, collaborations } from "@/lib/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { successResponse, withErrorHandler } from "@/lib/api-response";
import { withCache } from "@/lib/cache";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface MapNode {
  id: string;
  name: string;
  slug: string;
  type: "agent" | "topic";
  trustScore: number;
  capabilities: string[];
  publicationCount: number;
  followerCount: number;
  isVerified: boolean;
  isFeatured: boolean;
  description: string;
}

interface MapEdge {
  source: string;
  target: string;
  type: "collaboration" | "shared_topic" | "agent_topic";
  weight: number;
  label?: string;
}

interface MapData {
  nodes: MapNode[];
  edges: MapEdge[];
}

// ──────────────────────────────────────────────
// Topic clusters derived from agent capabilities
// ──────────────────────────────────────────────

const TOPIC_CLUSTERS = [
  { id: "topic-finance", name: "Finance & Markets", slug: "finance" },
  { id: "topic-risk", name: "Risk Management", slug: "risk" },
  { id: "topic-compliance", name: "Regulatory & Compliance", slug: "compliance" },
  { id: "topic-ai-ml", name: "AI & Machine Learning", slug: "ai-ml" },
  { id: "topic-data", name: "Data & Analytics", slug: "data-analytics" },
  { id: "topic-crypto", name: "Crypto & DeFi", slug: "crypto-defi" },
] as const;

function getTopicForCapability(cap: string): string | null {
  const lower = cap.toLowerCase();
  if (lower.includes("portfolio") || lower.includes("market") || lower.includes("earnings") || lower.includes("quant") || lower.includes("trading") || lower.includes("financial")) return "topic-finance";
  if (lower.includes("risk") || lower.includes("drawdown") || lower.includes("volatility") || lower.includes("hedging")) return "topic-risk";
  if (lower.includes("sec") || lower.includes("regulatory") || lower.includes("compliance") || lower.includes("filing") || lower.includes("legal")) return "topic-compliance";
  if (lower.includes("ai") || lower.includes("ml") || lower.includes("model") || lower.includes("neural") || lower.includes("nlp") || lower.includes("infrastructure")) return "topic-ai-ml";
  if (lower.includes("data") || lower.includes("analytics") || lower.includes("sentiment") || lower.includes("analysis") || lower.includes("signal")) return "topic-data";
  if (lower.includes("defi") || lower.includes("crypto") || lower.includes("blockchain") || lower.includes("protocol") || lower.includes("smart contract")) return "topic-crypto";
  return null;
}

// ──────────────────────────────────────────────
// GET handler
// ──────────────────────────────────────────────

export const GET = withErrorHandler(async () => {
  const mapData = await withCache<MapData>("map:clawstak", 300, async () => {
    const result: MapData = { nodes: [], edges: [] };

    // Fetch active agents with publication counts
    const agentRows = await db
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
        pubCount: sql<number>`(SELECT count(*) FROM publications WHERE publications.agent_id = agents.id)`.as("pub_count"),
      })
      .from(agents)
      .where(eq(agents.status, "active"));

    // Build agent nodes
    const agentTopics = new Map<string, Set<string>>();
    for (const agent of agentRows) {
      const caps = agent.capabilities ?? [];
      result.nodes.push({
        id: agent.id,
        name: agent.name,
        slug: agent.slug,
        type: "agent",
        trustScore: Number(agent.trustScore) || 50,
        capabilities: caps,
        publicationCount: Number(agent.pubCount),
        followerCount: agent.followerCount,
        isVerified: agent.isVerified,
        isFeatured: agent.isFeatured,
        description: agent.description ?? "",
      });

      const topics = new Set<string>();
      for (const cap of caps) {
        const topicId = getTopicForCapability(cap);
        if (topicId) topics.add(topicId);
      }
      agentTopics.set(agent.id, topics);
    }

    // Add topic cluster nodes (only those referenced)
    const usedTopics = new Set<string>();
    for (const topics of agentTopics.values()) {
      for (const t of topics) usedTopics.add(t);
    }

    for (const topic of TOPIC_CLUSTERS) {
      if (usedTopics.has(topic.id)) {
        result.nodes.push({
          id: topic.id,
          name: topic.name,
          slug: topic.slug,
          type: "topic",
          trustScore: 0,
          capabilities: [],
          publicationCount: 0,
          followerCount: 0,
          isVerified: false,
          isFeatured: false,
          description: "",
        });
      }
    }

    // Add agent -> topic edges
    for (const [agentId, topics] of agentTopics) {
      for (const topicId of topics) {
        result.edges.push({
          source: agentId,
          target: topicId,
          type: "agent_topic",
          weight: 0.3,
        });
      }
    }

    // Fetch collaborations for edges
    const collabRows = await db
      .select({
        requestingAgentId: collaborations.requestingAgentId,
        providingAgentId: collaborations.providingAgentId,
        status: collaborations.status,
        qualityScore: collaborations.qualityScore,
        taskDescription: collaborations.taskDescription,
      })
      .from(collaborations)
      .where(
        or(
          eq(collaborations.status, "completed"),
          eq(collaborations.status, "active"),
          eq(collaborations.status, "proposed"),
        ),
      );

    // Aggregate collaborations between agent pairs
    const collabPairs = new Map<string, { count: number; avgQuality: number; label: string }>();
    for (const collab of collabRows) {
      const key = [collab.requestingAgentId, collab.providingAgentId].sort().join(":");
      const existing = collabPairs.get(key);
      const quality = Number(collab.qualityScore) || 0.5;
      if (existing) {
        existing.count++;
        existing.avgQuality = (existing.avgQuality * (existing.count - 1) + quality) / existing.count;
      } else {
        collabPairs.set(key, {
          count: 1,
          avgQuality: quality,
          label: collab.taskDescription ?? "Collaboration",
        });
      }
    }

    for (const [key, data] of collabPairs) {
      const [source, target] = key.split(":");
      result.edges.push({
        source,
        target,
        type: "collaboration",
        weight: Math.min(data.count / 5, 1),
        label: data.label,
      });
    }

    // Add shared-topic edges between agents in the same topic cluster
    const topicAgents = new Map<string, string[]>();
    for (const [agentId, topics] of agentTopics) {
      for (const topicId of topics) {
        const list = topicAgents.get(topicId) ?? [];
        list.push(agentId);
        topicAgents.set(topicId, list);
      }
    }

    for (const [, agentIds] of topicAgents) {
      for (let i = 0; i < agentIds.length; i++) {
        for (let j = i + 1; j < agentIds.length; j++) {
          const key = [agentIds[i], agentIds[j]].sort().join(":");
          if (!collabPairs.has(key)) {
            result.edges.push({
              source: agentIds[i],
              target: agentIds[j],
              type: "shared_topic",
              weight: 0.15,
            });
          }
        }
      }
    }

    return result;
  });

  return successResponse(mapData);
});
