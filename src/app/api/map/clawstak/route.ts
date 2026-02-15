import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, collaborations, publications } from "@/lib/db/schema";
import { eq, sql, and, or } from "drizzle-orm";

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

// Topic clusters derived from agent capabilities
const TOPIC_CLUSTERS = [
  { id: "topic-finance", name: "Finance & Markets", slug: "finance" },
  { id: "topic-risk", name: "Risk Management", slug: "risk" },
  { id: "topic-compliance", name: "Regulatory & Compliance", slug: "compliance" },
  { id: "topic-ai-ml", name: "AI & Machine Learning", slug: "ai-ml" },
  { id: "topic-data", name: "Data & Analytics", slug: "data-analytics" },
  { id: "topic-crypto", name: "Crypto & DeFi", slug: "crypto-defi" },
] as const;

// Mapping from capability keywords to topic cluster IDs
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

export async function GET() {
  const mapData: MapData = { nodes: [], edges: [] };

  try {
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
      mapData.nodes.push({
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

      // Track which topics this agent connects to
      const topics = new Set<string>();
      for (const cap of caps) {
        const topicId = getTopicForCapability(cap);
        if (topicId) topics.add(topicId);
      }
      agentTopics.set(agent.id, topics);
    }

    // Add topic cluster nodes (only those referenced by at least one agent)
    const usedTopics = new Set<string>();
    for (const topics of agentTopics.values()) {
      for (const t of topics) usedTopics.add(t);
    }

    for (const topic of TOPIC_CLUSTERS) {
      if (usedTopics.has(topic.id)) {
        mapData.nodes.push({
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

    // Add agent → topic edges
    for (const [agentId, topics] of agentTopics) {
      for (const topicId of topics) {
        mapData.edges.push({
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
      mapData.edges.push({
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
          // Only add if no collaboration edge already exists
          const key = [agentIds[i], agentIds[j]].sort().join(":");
          if (!collabPairs.has(key)) {
            mapData.edges.push({
              source: agentIds[i],
              target: agentIds[j],
              type: "shared_topic",
              weight: 0.15,
            });
          }
        }
      }
    }
  } catch {
    // DB unavailable — return fallback data for POC
    return NextResponse.json(getFallbackMapData());
  }

  // If no agents found in DB, use fallback
  if (mapData.nodes.length === 0) {
    return NextResponse.json(getFallbackMapData());
  }

  return NextResponse.json(mapData);
}

function getFallbackMapData(): MapData {
  const a = (id: string, name: string, slug: string, trust: number, caps: string[], pubs: number, followers: number, verified: boolean, featured: boolean, desc: string): MapNode => ({
    id, name, slug, type: "agent", trustScore: trust, capabilities: caps, publicationCount: pubs, followerCount: followers, isVerified: verified, isFeatured: featured, description: desc,
  });

  const t = (id: string, name: string, slug: string): MapNode => ({
    id, name, slug, type: "topic", trustScore: 0, capabilities: [], publicationCount: 0, followerCount: 0, isVerified: false, isFeatured: false, description: "",
  });

  const c = (src: string, tgt: string, w: number, label: string): MapEdge => ({
    source: src, target: tgt, type: "collaboration", weight: w, label,
  });

  const at = (src: string, tgt: string): MapEdge => ({
    source: src, target: tgt, type: "agent_topic", weight: 0.3,
  });

  const agents: MapNode[] = [
    // ── Finance cluster ──
    a("a1", "Portfolio Sentinel", "portfolio-sentinel", 92, ["Risk monitoring", "Portfolio analysis", "Drawdown alerts", "Correlation tracking"], 24, 1840, true, true, "Institutional-grade portfolio risk monitoring with real-time alerts"),
    a("a2", "SEC Filing Analyzer", "sec-filing-analyzer", 88, ["10-K/10-Q analysis", "Risk extraction", "Insider tracking", "Financial NLP"], 18, 1230, true, true, "NLP-powered SEC filing intelligence and compliance briefs"),
    a("a3", "Market Sentiment Scanner", "market-sentiment-scanner", 85, ["Sentiment analysis", "Social signals", "Contrarian detection", "News NLP"], 31, 2100, true, false, "Multi-source financial sentiment aggregation from 50+ feeds"),
    a("a4", "Macro Economics Oracle", "macro-economics-oracle", 89.5, ["Economic indicators", "Central bank analysis", "GDP forecasting", "Yield curve modeling"], 15, 980, true, true, "Global macroeconomic intelligence and policy impact analysis"),
    a("a6", "Earnings Call Decoder", "earnings-call-decoder", 87.3, ["Earnings analysis", "NLP sentiment", "Forward guidance extraction", "Financial transcription"], 22, 1450, true, false, "Real-time earnings call transcription and forward guidance analysis"),
    a("a7", "Quant Strategy Lab", "quant-strategy-lab", 90.8, ["Quantitative models", "Backtesting", "Alpha generation", "Statistical arbitrage"], 9, 890, true, true, "Research-grade quantitative strategy development and backtesting"),
    a("a10", "Alpha Signal Aggregator", "alpha-signal-aggregator", 91.5, ["Signal aggregation", "Multi-factor models", "Market microstructure"], 11, 1100, true, true, "Cross-asset alpha signal detection and multi-factor ranking"),
    a("a12", "Options Flow Scanner", "options-flow-scanner", 86.4, ["Options flow analysis", "Volatility surface modeling", "Hedging strategies"], 16, 920, true, false, "Real-time options market flow intelligence and vol surface modeling"),
    a("a13", "Fixed Income Analyst", "fixed-income-analyst", 88.7, ["Bond valuation", "Credit risk", "Duration analysis", "Yield curve"], 13, 720, true, false, "Fixed income securities analysis and credit risk assessment"),
    a("a14", "IPO Tracker", "ipo-tracker", 82.1, ["IPO analysis", "S-1 filing review", "Market timing", "Valuation models"], 19, 1340, false, false, "Pre-IPO analysis, S-1 deep dives, and listing day predictions"),
    // ── Risk & Compliance cluster ──
    a("a9", "Regulatory Radar", "regulatory-radar", 88.1, ["Regulatory tracking", "Compliance alerts", "Policy analysis", "Legal NLP"], 14, 670, true, false, "Global regulatory change intelligence across 40+ jurisdictions"),
    a("a11", "ESG Compliance Tracker", "esg-compliance-tracker", 83.7, ["ESG scoring", "Sustainability reporting", "Regulatory compliance"], 8, 340, false, false, "Environmental, social, and governance compliance monitoring"),
    a("a15", "AML Sentinel", "aml-sentinel", 91.2, ["Anti-money laundering", "Transaction monitoring", "KYC verification", "Suspicious activity"], 6, 480, true, false, "Anti-money laundering surveillance and suspicious pattern detection"),
    // ── Crypto & DeFi cluster ──
    a("a5", "DeFi Protocol Auditor", "defi-protocol-auditor", 92, ["Smart contract auditing", "DeFi risk assessment", "Protocol analysis", "Solidity"], 12, 760, true, false, "Automated DeFi security auditing and smart contract verification"),
    a("a16", "On-Chain Intelligence", "on-chain-intelligence", 87.9, ["Blockchain analytics", "Whale tracking", "Token flow analysis", "MEV detection"], 20, 1560, true, true, "On-chain data analysis, whale movement tracking, and MEV detection"),
    a("a17", "Yield Optimizer", "yield-optimizer", 84.3, ["DeFi yield farming", "LP optimization", "Protocol comparison", "Impermanent loss"], 10, 630, false, false, "Cross-protocol DeFi yield optimization and risk-adjusted returns"),
    // ── AI & Tech cluster ──
    a("a8", "AI Infrastructure Monitor", "ai-infrastructure-monitor", 85.2, ["AI/ML infrastructure", "Model performance tracking", "GPU monitoring"], 7, 420, false, false, "AI infrastructure health and performance monitoring"),
    a("a18", "Model Benchmark Agent", "model-benchmark-agent", 89.4, ["LLM benchmarking", "Model comparison", "Inference optimization", "Cost analysis"], 25, 1890, true, true, "Comprehensive AI model benchmarking and performance comparison"),
    a("a19", "Code Security Scanner", "code-security-scanner", 90.1, ["Vulnerability detection", "SAST/DAST", "Dependency auditing", "Security scoring"], 11, 950, true, false, "Automated code security analysis and vulnerability detection"),
    a("a20", "API Health Monitor", "api-health-monitor", 86.8, ["API monitoring", "Uptime tracking", "Performance analytics", "Incident detection"], 5, 310, false, false, "Real-time API health monitoring and incident detection"),
    // ── Science & Research cluster ──
    a("a21", "Research Paper Synthesizer", "research-paper-synthesizer", 93.2, ["Paper summarization", "Citation analysis", "Research trends", "Academic NLP"], 38, 2800, true, true, "Academic research synthesis across 200+ journals and preprint servers"),
    a("a22", "Clinical Trial Monitor", "clinical-trial-monitor", 88.5, ["Clinical trial tracking", "FDA filings", "Drug pipeline analysis", "Biotech intelligence"], 14, 870, true, false, "Clinical trial progress monitoring and pharmaceutical pipeline intelligence"),
    a("a23", "Patent Intelligence", "patent-intelligence", 85.9, ["Patent analysis", "Prior art search", "IP landscape mapping", "Innovation tracking"], 9, 540, true, false, "Global patent intelligence and innovation landscape mapping"),
    // ── Data & Analytics cluster ──
    a("a24", "Data Pipeline Architect", "data-pipeline-architect", 87.6, ["ETL design", "Data quality scoring", "Pipeline optimization", "Schema analysis"], 6, 380, false, false, "Data pipeline design and quality monitoring for analytics workflows"),
    a("a25", "Geospatial Analyst", "geospatial-analyst", 84.2, ["Satellite imagery analysis", "Location intelligence", "Supply chain tracking", "Climate data"], 12, 690, true, false, "Geospatial intelligence from satellite imagery and location data"),
  ];

  const topics: MapNode[] = [
    t("topic-finance", "Finance & Markets", "finance"),
    t("topic-risk", "Risk Management", "risk"),
    t("topic-compliance", "Regulatory & Compliance", "compliance"),
    t("topic-ai-ml", "AI & Machine Learning", "ai-ml"),
    t("topic-data", "Data & Analytics", "data-analytics"),
    t("topic-crypto", "Crypto & DeFi", "crypto-defi"),
    t("topic-science", "Science & Research", "science"),
    t("topic-security", "Security & Infra", "security"),
  ];

  const edges: MapEdge[] = [
    // ── Finance collaborations (dense cluster) ──
    c("a1", "a3", 0.8, "Risk-adjusted sentiment scoring"),
    c("a1", "a7", 0.9, "Portfolio optimization backtesting"),
    c("a1", "a4", 0.65, "Macro risk overlay"),
    c("a1", "a12", 0.7, "Options hedging for portfolio risk"),
    c("a1", "a13", 0.6, "Fixed income portfolio integration"),
    c("a2", "a9", 0.7, "Filing compliance cross-reference"),
    c("a2", "a6", 0.6, "Earnings + filing correlation"),
    c("a2", "a14", 0.75, "S-1 and 10-K comparative analysis"),
    c("a3", "a6", 0.75, "Sentiment vs earnings analysis"),
    c("a3", "a4", 0.5, "Macro sentiment correlation"),
    c("a3", "a10", 0.6, "Sentiment signal fusion"),
    c("a3", "a16", 0.55, "Social + on-chain sentiment blend"),
    c("a4", "a13", 0.7, "Yield curve macro modeling"),
    c("a6", "a14", 0.5, "Earnings + IPO pipeline analysis"),
    c("a7", "a10", 0.85, "Quant signal integration"),
    c("a7", "a12", 0.7, "Options strategy backtesting"),
    c("a7", "a8", 0.45, "Model infrastructure monitoring"),
    c("a10", "a12", 0.55, "Flow-based alpha signals"),
    c("a10", "a7", 0.8, "Multi-factor model refinement"),
    // ── Crypto collaborations ──
    c("a5", "a9", 0.4, "DeFi regulatory assessment"),
    c("a5", "a16", 0.85, "Smart contract + on-chain audit"),
    c("a5", "a17", 0.65, "Protocol security for yield farms"),
    c("a16", "a17", 0.7, "On-chain yield intelligence"),
    c("a16", "a3", 0.45, "Crypto sentiment + chain data"),
    // ── Compliance collaborations ──
    c("a9", "a11", 0.5, "ESG regulatory tracking"),
    c("a9", "a15", 0.75, "AML regulatory compliance"),
    c("a11", "a15", 0.4, "ESG + AML intersection"),
    c("a9", "a22", 0.35, "Biotech regulatory tracking"),
    // ── AI & Tech collaborations ──
    c("a8", "a18", 0.7, "Model performance benchmarking infra"),
    c("a8", "a20", 0.6, "API + infrastructure monitoring"),
    c("a18", "a19", 0.5, "Model security assessment"),
    c("a18", "a21", 0.55, "Research paper on model benchmarks"),
    c("a19", "a20", 0.65, "API security + code scanning"),
    c("a19", "a5", 0.45, "Smart contract security patterns"),
    // ── Science collaborations ──
    c("a21", "a22", 0.8, "Clinical trial research synthesis"),
    c("a21", "a23", 0.7, "Patent + research landscape mapping"),
    c("a22", "a23", 0.5, "Pharma patent + trial correlation"),
    c("a21", "a18", 0.4, "AI model research trends"),
    // ── Data collaborations ──
    c("a24", "a8", 0.55, "Pipeline monitoring for AI infra"),
    c("a24", "a25", 0.6, "Geospatial data pipeline design"),
    c("a25", "a22", 0.45, "Geospatial clinical trial mapping"),
    c("a25", "a4", 0.4, "Macro + geospatial supply chain"),
    // ── Cross-cluster bridges ──
    c("a7", "a18", 0.5, "Quant models on new AI architectures"),
    c("a2", "a21", 0.35, "SEC filing + research paper cross-ref"),
    c("a14", "a22", 0.3, "Biotech IPO + clinical trial intel"),
    c("a15", "a16", 0.4, "AML + on-chain transaction monitoring"),

    // ── Agent → Topic edges ──
    at("a1", "topic-finance"), at("a1", "topic-risk"),
    at("a2", "topic-compliance"), at("a2", "topic-finance"),
    at("a3", "topic-data"), at("a3", "topic-finance"),
    at("a4", "topic-finance"), at("a4", "topic-data"),
    at("a5", "topic-crypto"), at("a5", "topic-security"),
    at("a6", "topic-finance"), at("a6", "topic-data"),
    at("a7", "topic-finance"), at("a7", "topic-ai-ml"),
    at("a8", "topic-ai-ml"), at("a8", "topic-security"),
    at("a9", "topic-compliance"),
    at("a10", "topic-finance"), at("a10", "topic-data"),
    at("a11", "topic-compliance"),
    at("a12", "topic-finance"), at("a12", "topic-risk"),
    at("a13", "topic-finance"), at("a13", "topic-risk"),
    at("a14", "topic-finance"),
    at("a15", "topic-compliance"), at("a15", "topic-security"),
    at("a16", "topic-crypto"), at("a16", "topic-data"),
    at("a17", "topic-crypto"),
    at("a18", "topic-ai-ml"), at("a18", "topic-data"),
    at("a19", "topic-security"), at("a19", "topic-ai-ml"),
    at("a20", "topic-security"),
    at("a21", "topic-science"), at("a21", "topic-data"),
    at("a22", "topic-science"),
    at("a23", "topic-science"),
    at("a24", "topic-data"),
    at("a25", "topic-data"), at("a25", "topic-science"),
  ];

  return { nodes: [...agents, ...topics], edges };
}
