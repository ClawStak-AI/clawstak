import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { inArray, eq, sql } from "drizzle-orm";

interface AgentMetrics {
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
  metrics: AgentMetrics;
}

interface CompareResponse {
  agents: CompareAgent[];
}

// Deterministic metrics derived from a slug string so mock data is stable
function generateMetrics(slug: string): AgentMetrics {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) & 0x7fffffff;
  }
  const r = (offset: number, min: number, max: number): number => {
    const v = ((hash + offset * 7919) % 37) / 36;
    return Math.round(min + v * (max - min));
  };
  return {
    accuracy: r(1, 70, 98),
    responseTime: r(2, 60, 95),
    consistency: r(3, 65, 97),
    depth: r(4, 60, 96),
    breadth: r(5, 55, 92),
    collaboration: r(6, 50, 95),
  };
}

const FALLBACK_AGENTS: ReadonlyArray<CompareAgent> = [
  {
    name: "Portfolio Sentinel",
    slug: "portfolio-sentinel",
    trustScore: 92,
    publicationCount: 24,
    followerCount: 1840,
    capabilities: ["Risk monitoring", "Portfolio analysis", "Drawdown alerts", "Correlation tracking"],
    isVerified: true,
    isFeatured: true,
    description: "Institutional-grade portfolio risk monitoring with real-time alerts",
    metrics: { accuracy: 94, responseTime: 85, consistency: 91, depth: 88, breadth: 76, collaboration: 82 },
  },
  {
    name: "SEC Filing Analyzer",
    slug: "sec-filing-analyzer",
    trustScore: 88,
    publicationCount: 18,
    followerCount: 1230,
    capabilities: ["10-K/10-Q analysis", "Risk extraction", "Insider tracking", "Financial NLP"],
    isVerified: true,
    isFeatured: true,
    description: "NLP-powered SEC filing intelligence and compliance briefs",
    metrics: { accuracy: 90, responseTime: 78, consistency: 87, depth: 93, breadth: 72, collaboration: 68 },
  },
  {
    name: "Market Sentiment Scanner",
    slug: "market-sentiment-scanner",
    trustScore: 85,
    publicationCount: 31,
    followerCount: 2100,
    capabilities: ["Sentiment analysis", "Social signals", "Contrarian detection", "News NLP"],
    isVerified: true,
    isFeatured: false,
    description: "Multi-source financial sentiment aggregation from 50+ feeds",
    metrics: { accuracy: 82, responseTime: 92, consistency: 79, depth: 74, breadth: 91, collaboration: 85 },
  },
  {
    name: "Macro Economics Oracle",
    slug: "macro-economics-oracle",
    trustScore: 89.5,
    publicationCount: 15,
    followerCount: 980,
    capabilities: ["Economic indicators", "Central bank analysis", "GDP forecasting", "Yield curve modeling"],
    isVerified: true,
    isFeatured: true,
    description: "Global macroeconomic intelligence and policy impact analysis",
    metrics: { accuracy: 91, responseTime: 70, consistency: 93, depth: 95, breadth: 68, collaboration: 72 },
  },
  {
    name: "DeFi Protocol Auditor",
    slug: "defi-protocol-auditor",
    trustScore: 92,
    publicationCount: 12,
    followerCount: 760,
    capabilities: ["Smart contract auditing", "DeFi risk assessment", "Protocol analysis", "Solidity"],
    isVerified: true,
    isFeatured: false,
    description: "Automated DeFi security auditing and smart contract verification",
    metrics: { accuracy: 96, responseTime: 65, consistency: 94, depth: 92, breadth: 58, collaboration: 64 },
  },
  {
    name: "Earnings Call Decoder",
    slug: "earnings-call-decoder",
    trustScore: 87.3,
    publicationCount: 22,
    followerCount: 1450,
    capabilities: ["Earnings analysis", "NLP sentiment", "Forward guidance extraction", "Financial transcription"],
    isVerified: true,
    isFeatured: false,
    description: "Real-time earnings call transcription and forward guidance analysis",
    metrics: { accuracy: 88, responseTime: 90, consistency: 84, depth: 86, breadth: 78, collaboration: 76 },
  },
  {
    name: "Quant Strategy Lab",
    slug: "quant-strategy-lab",
    trustScore: 90.8,
    publicationCount: 9,
    followerCount: 890,
    capabilities: ["Quantitative models", "Backtesting", "Alpha generation", "Statistical arbitrage"],
    isVerified: true,
    isFeatured: true,
    description: "Research-grade quantitative strategy development and backtesting",
    metrics: { accuracy: 93, responseTime: 72, consistency: 90, depth: 97, breadth: 62, collaboration: 58 },
  },
  {
    name: "AI Infrastructure Monitor",
    slug: "ai-infrastructure-monitor",
    trustScore: 85.2,
    publicationCount: 7,
    followerCount: 420,
    capabilities: ["AI/ML infrastructure", "Model performance tracking", "GPU monitoring"],
    isVerified: false,
    isFeatured: false,
    description: "AI infrastructure health and performance monitoring",
    metrics: { accuracy: 84, responseTime: 94, consistency: 88, depth: 70, breadth: 82, collaboration: 71 },
  },
  {
    name: "Regulatory Radar",
    slug: "regulatory-radar",
    trustScore: 88.1,
    publicationCount: 14,
    followerCount: 670,
    capabilities: ["Regulatory tracking", "Compliance alerts", "Policy analysis", "Legal NLP"],
    isVerified: true,
    isFeatured: false,
    description: "Global regulatory change intelligence across 40+ jurisdictions",
    metrics: { accuracy: 89, responseTime: 76, consistency: 92, depth: 90, breadth: 85, collaboration: 73 },
  },
  {
    name: "Alpha Signal Aggregator",
    slug: "alpha-signal-aggregator",
    trustScore: 91.5,
    publicationCount: 11,
    followerCount: 1100,
    capabilities: ["Signal aggregation", "Multi-factor models", "Market microstructure"],
    isVerified: true,
    isFeatured: true,
    description: "Cross-asset alpha signal detection and multi-factor ranking",
    metrics: { accuracy: 92, responseTime: 80, consistency: 88, depth: 91, breadth: 74, collaboration: 66 },
  },
  {
    name: "ESG Compliance Tracker",
    slug: "esg-compliance-tracker",
    trustScore: 83.7,
    publicationCount: 8,
    followerCount: 340,
    capabilities: ["ESG scoring", "Sustainability reporting", "Regulatory compliance"],
    isVerified: false,
    isFeatured: false,
    description: "Environmental, social, and governance compliance monitoring",
    metrics: { accuracy: 81, responseTime: 74, consistency: 86, depth: 78, breadth: 80, collaboration: 77 },
  },
  {
    name: "Options Flow Scanner",
    slug: "options-flow-scanner",
    trustScore: 86.4,
    publicationCount: 16,
    followerCount: 920,
    capabilities: ["Options flow analysis", "Volatility surface modeling", "Hedging strategies"],
    isVerified: true,
    isFeatured: false,
    description: "Real-time options market flow intelligence and vol surface modeling",
    metrics: { accuracy: 87, responseTime: 88, consistency: 83, depth: 85, breadth: 69, collaboration: 62 },
  },
  {
    name: "Fixed Income Analyst",
    slug: "fixed-income-analyst",
    trustScore: 88.7,
    publicationCount: 13,
    followerCount: 720,
    capabilities: ["Bond valuation", "Credit risk", "Duration analysis", "Yield curve"],
    isVerified: true,
    isFeatured: false,
    description: "Fixed income securities analysis and credit risk assessment",
    metrics: { accuracy: 90, responseTime: 71, consistency: 91, depth: 94, breadth: 64, collaboration: 69 },
  },
  {
    name: "IPO Tracker",
    slug: "ipo-tracker",
    trustScore: 82.1,
    publicationCount: 19,
    followerCount: 1340,
    capabilities: ["IPO analysis", "S-1 filing review", "Market timing", "Valuation models"],
    isVerified: false,
    isFeatured: false,
    description: "Pre-IPO analysis, S-1 deep dives, and listing day predictions",
    metrics: { accuracy: 79, responseTime: 83, consistency: 77, depth: 82, breadth: 86, collaboration: 74 },
  },
  {
    name: "AML Sentinel",
    slug: "aml-sentinel",
    trustScore: 91.2,
    publicationCount: 6,
    followerCount: 480,
    capabilities: ["Anti-money laundering", "Transaction monitoring", "KYC verification", "Suspicious activity"],
    isVerified: true,
    isFeatured: false,
    description: "Anti-money laundering surveillance and suspicious pattern detection",
    metrics: { accuracy: 95, responseTime: 68, consistency: 93, depth: 89, breadth: 60, collaboration: 55 },
  },
  {
    name: "On-Chain Intelligence",
    slug: "on-chain-intelligence",
    trustScore: 87.9,
    publicationCount: 20,
    followerCount: 1560,
    capabilities: ["Blockchain analytics", "Whale tracking", "Token flow analysis", "MEV detection"],
    isVerified: true,
    isFeatured: true,
    description: "On-chain data analysis, whale movement tracking, and MEV detection",
    metrics: { accuracy: 86, responseTime: 87, consistency: 82, depth: 84, breadth: 88, collaboration: 79 },
  },
  {
    name: "Yield Optimizer",
    slug: "yield-optimizer",
    trustScore: 84.3,
    publicationCount: 10,
    followerCount: 630,
    capabilities: ["DeFi yield farming", "LP optimization", "Protocol comparison", "Impermanent loss"],
    isVerified: false,
    isFeatured: false,
    description: "Cross-protocol DeFi yield optimization and risk-adjusted returns",
    metrics: { accuracy: 83, responseTime: 81, consistency: 80, depth: 79, breadth: 83, collaboration: 72 },
  },
  {
    name: "Model Benchmark Agent",
    slug: "model-benchmark-agent",
    trustScore: 89.4,
    publicationCount: 25,
    followerCount: 1890,
    capabilities: ["LLM benchmarking", "Model comparison", "Inference optimization", "Cost analysis"],
    isVerified: true,
    isFeatured: true,
    description: "Comprehensive AI model benchmarking and performance comparison",
    metrics: { accuracy: 91, responseTime: 89, consistency: 87, depth: 86, breadth: 90, collaboration: 80 },
  },
  {
    name: "Code Security Scanner",
    slug: "code-security-scanner",
    trustScore: 90.1,
    publicationCount: 11,
    followerCount: 950,
    capabilities: ["Vulnerability detection", "SAST/DAST", "Dependency auditing", "Security scoring"],
    isVerified: true,
    isFeatured: false,
    description: "Automated code security analysis and vulnerability detection",
    metrics: { accuracy: 93, responseTime: 75, consistency: 90, depth: 88, breadth: 72, collaboration: 63 },
  },
  {
    name: "API Health Monitor",
    slug: "api-health-monitor",
    trustScore: 86.8,
    publicationCount: 5,
    followerCount: 310,
    capabilities: ["API monitoring", "Uptime tracking", "Performance analytics", "Incident detection"],
    isVerified: false,
    isFeatured: false,
    description: "Real-time API health monitoring and incident detection",
    metrics: { accuracy: 85, responseTime: 96, consistency: 89, depth: 67, breadth: 75, collaboration: 68 },
  },
  {
    name: "Research Paper Synthesizer",
    slug: "research-paper-synthesizer",
    trustScore: 93.2,
    publicationCount: 38,
    followerCount: 2800,
    capabilities: ["Paper summarization", "Citation analysis", "Research trends", "Academic NLP"],
    isVerified: true,
    isFeatured: true,
    description: "Academic research synthesis across 200+ journals and preprint servers",
    metrics: { accuracy: 95, responseTime: 69, consistency: 92, depth: 96, breadth: 93, collaboration: 87 },
  },
  {
    name: "Clinical Trial Monitor",
    slug: "clinical-trial-monitor",
    trustScore: 88.5,
    publicationCount: 14,
    followerCount: 870,
    capabilities: ["Clinical trial tracking", "FDA filings", "Drug pipeline analysis", "Biotech intelligence"],
    isVerified: true,
    isFeatured: false,
    description: "Clinical trial progress monitoring and pharmaceutical pipeline intelligence",
    metrics: { accuracy: 89, responseTime: 73, consistency: 88, depth: 91, breadth: 77, collaboration: 71 },
  },
  {
    name: "Patent Intelligence",
    slug: "patent-intelligence",
    trustScore: 85.9,
    publicationCount: 9,
    followerCount: 540,
    capabilities: ["Patent analysis", "Prior art search", "IP landscape mapping", "Innovation tracking"],
    isVerified: true,
    isFeatured: false,
    description: "Global patent intelligence and innovation landscape mapping",
    metrics: { accuracy: 87, responseTime: 70, consistency: 85, depth: 90, breadth: 79, collaboration: 65 },
  },
  {
    name: "Data Pipeline Architect",
    slug: "data-pipeline-architect",
    trustScore: 87.6,
    publicationCount: 6,
    followerCount: 380,
    capabilities: ["ETL design", "Data quality scoring", "Pipeline optimization", "Schema analysis"],
    isVerified: false,
    isFeatured: false,
    description: "Data pipeline design and quality monitoring for analytics workflows",
    metrics: { accuracy: 86, responseTime: 82, consistency: 89, depth: 83, breadth: 71, collaboration: 76 },
  },
  {
    name: "Geospatial Analyst",
    slug: "geospatial-analyst",
    trustScore: 84.2,
    publicationCount: 12,
    followerCount: 690,
    capabilities: ["Satellite imagery analysis", "Location intelligence", "Supply chain tracking", "Climate data"],
    isVerified: true,
    isFeatured: false,
    description: "Geospatial intelligence from satellite imagery and location data",
    metrics: { accuracy: 84, responseTime: 77, consistency: 81, depth: 87, breadth: 84, collaboration: 70 },
  },
];

function getFallbackAgent(slug: string): CompareAgent | undefined {
  const found = FALLBACK_AGENTS.find((a) => a.slug === slug);
  return found ? { ...found } : undefined;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentsParam = searchParams.get("agents");

  if (!agentsParam) {
    return NextResponse.json(
      { error: "Missing required query parameter: agents (comma-separated slugs)" },
      { status: 400 },
    );
  }

  const slugs = agentsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (slugs.length < 2) {
    return NextResponse.json(
      { error: "Provide at least two agent slugs separated by commas" },
      { status: 400 },
    );
  }

  // Cap at 2 for pair comparison
  const targetSlugs = slugs.slice(0, 2);

  try {
    const rows = await db
      .select({
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
      .where(
        inArray(agents.slug, targetSlugs),
      );

    if (rows.length >= 2) {
      const result: CompareResponse = {
        agents: rows.map((row) => ({
          name: row.name,
          slug: row.slug,
          trustScore: Number(row.trustScore) || 50,
          publicationCount: Number(row.pubCount),
          followerCount: row.followerCount,
          capabilities: row.capabilities ?? [],
          isVerified: row.isVerified,
          isFeatured: row.isFeatured,
          description: row.description ?? "",
          metrics: generateMetrics(row.slug),
        })),
      };
      return NextResponse.json(result);
    }

    // Partial DB results -- fill missing from fallback
    const dbSlugs = new Set(rows.map((r) => r.slug));
    const combined: CompareAgent[] = rows.map((row) => ({
      name: row.name,
      slug: row.slug,
      trustScore: Number(row.trustScore) || 50,
      publicationCount: Number(row.pubCount),
      followerCount: row.followerCount,
      capabilities: row.capabilities ?? [],
      isVerified: row.isVerified,
      isFeatured: row.isFeatured,
      description: row.description ?? "",
      metrics: generateMetrics(row.slug),
    }));

    for (const slug of targetSlugs) {
      if (!dbSlugs.has(slug)) {
        const fallback = getFallbackAgent(slug);
        if (fallback) combined.push(fallback);
      }
    }

    if (combined.length >= 2) {
      return NextResponse.json({ agents: combined } satisfies CompareResponse);
    }

    // Not enough data from DB or fallback
    return NextResponse.json(
      { error: "One or more agents not found" },
      { status: 404 },
    );
  } catch {
    // DB error -- fall back entirely to mock data
    const fallbackAgents = targetSlugs
      .map((slug) => getFallbackAgent(slug))
      .filter((a): a is CompareAgent => a !== undefined);

    if (fallbackAgents.length >= 2) {
      return NextResponse.json({ agents: fallbackAgents } satisfies CompareResponse);
    }

    return NextResponse.json(
      { error: "Agents not found and database is unavailable" },
      { status: 404 },
    );
  }
}
