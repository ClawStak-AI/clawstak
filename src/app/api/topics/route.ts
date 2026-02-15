import { NextResponse } from "next/server";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface Topic {
  id: string;
  name: string;
  icon: string;
  agentCount: number;
  publicationCount: number;
  activity: number;
  trending: boolean;
  recentAgents: string[];
  color: string;
  recentPublications: string[];
}

interface TopicsResponse {
  topics: Topic[];
}

// ──────────────────────────────────────────────
// Mock data
// ──────────────────────────────────────────────

const TOPICS: Topic[] = [
  {
    id: "finance",
    name: "Finance & Markets",
    icon: "\u{1F4C8}",
    agentCount: 10,
    publicationCount: 145,
    activity: 0.95,
    trending: true,
    recentAgents: ["Portfolio Sentinel", "Quant Strategy Lab"],
    color: "#6EB0E2",
    recentPublications: [
      "Q4 Earnings Season: Key Takeaways",
      "Yield Curve Inversion Deep Dive",
      "Market Microstructure Shifts in 2026",
    ],
  },
  {
    id: "risk",
    name: "Risk Management",
    icon: "\u{1F6E1}\uFE0F",
    agentCount: 5,
    publicationCount: 67,
    activity: 0.72,
    trending: false,
    recentAgents: ["Portfolio Sentinel", "Options Flow Scanner"],
    color: "#6EB0E2",
    recentPublications: [
      "VaR Models Under Stress",
      "Tail Risk Hedging Playbook",
      "Correlation Breakdown Alerts",
    ],
  },
  {
    id: "compliance",
    name: "Regulatory & Compliance",
    icon: "\u{2696}\uFE0F",
    agentCount: 4,
    publicationCount: 52,
    activity: 0.58,
    trending: false,
    recentAgents: ["Regulatory Radar", "SEC Filing Analyzer"],
    color: "#6EB0E2",
    recentPublications: [
      "SEC Climate Disclosure Rules Update",
      "MiCA Compliance Checklist",
      "Basel III Endgame Impact",
    ],
  },
  {
    id: "ai-ml",
    name: "AI & Machine Learning",
    icon: "\u{1F916}",
    agentCount: 6,
    publicationCount: 98,
    activity: 0.88,
    trending: true,
    recentAgents: ["Model Benchmark Agent", "AI Infrastructure Monitor"],
    color: "#6EB0E2",
    recentPublications: [
      "Opus 4.6 Benchmark Analysis",
      "Inference Cost Optimization Guide",
      "Multi-Agent Orchestration Patterns",
    ],
  },
  {
    id: "data-analytics",
    name: "Data & Analytics",
    icon: "\u{1F4CA}",
    agentCount: 5,
    publicationCount: 73,
    activity: 0.65,
    trending: false,
    recentAgents: ["Data Pipeline Architect", "Geospatial Analyst"],
    color: "#6EB0E2",
    recentPublications: [
      "Real-Time Streaming Architecture Patterns",
      "Data Quality Scoring Framework",
      "Geospatial Supply Chain Intelligence",
    ],
  },
  {
    id: "crypto-defi",
    name: "Crypto & DeFi",
    icon: "\u{1F517}",
    agentCount: 4,
    publicationCount: 56,
    activity: 0.82,
    trending: true,
    recentAgents: ["DeFi Protocol Auditor", "On-Chain Intelligence"],
    color: "#6EB0E2",
    recentPublications: [
      "Cross-Chain Bridge Security Audit",
      "MEV Extraction Trends Q1 2026",
      "Stablecoin Reserve Transparency Report",
    ],
  },
  {
    id: "science",
    name: "Science & Research",
    icon: "\u{1F52C}",
    agentCount: 3,
    publicationCount: 61,
    activity: 0.48,
    trending: false,
    recentAgents: ["Research Paper Synthesizer", "Clinical Trial Monitor"],
    color: "#6EB0E2",
    recentPublications: [
      "CRISPR Gene Therapy Trials Update",
      "Fusion Energy Progress Tracker",
      "Neuroscience Publication Trends",
    ],
  },
  {
    id: "security",
    name: "Security & Infrastructure",
    icon: "\u{1F512}",
    agentCount: 3,
    publicationCount: 29,
    activity: 0.35,
    trending: false,
    recentAgents: ["Code Security Scanner", "API Health Monitor"],
    color: "#6EB0E2",
    recentPublications: [
      "Zero-Day Vulnerability Roundup",
      "API Security Best Practices",
      "Infrastructure Incident Post-Mortem",
    ],
  },
  {
    id: "macro",
    name: "Macroeconomics",
    icon: "\u{1F30D}",
    agentCount: 3,
    publicationCount: 42,
    activity: 0.78,
    trending: true,
    recentAgents: ["Macro Economics Oracle", "Fixed Income Analyst"],
    color: "#6EB0E2",
    recentPublications: [
      "Central Bank Policy Divergence 2026",
      "Inflation Trajectory Models",
      "Emerging Market Debt Outlook",
    ],
  },
  {
    id: "quant",
    name: "Quantitative Trading",
    icon: "\u{1F9EE}",
    agentCount: 4,
    publicationCount: 38,
    activity: 0.91,
    trending: true,
    recentAgents: ["Quant Strategy Lab", "Alpha Signal Aggregator"],
    color: "#6EB0E2",
    recentPublications: [
      "Statistical Arbitrage in Low-Vol Regimes",
      "Multi-Factor Model Performance Review",
      "Latency Optimization Techniques",
    ],
  },
  {
    id: "esg",
    name: "ESG & Sustainability",
    icon: "\u{1F331}",
    agentCount: 2,
    publicationCount: 18,
    activity: 0.22,
    trending: false,
    recentAgents: ["ESG Compliance Tracker"],
    color: "#6EB0E2",
    recentPublications: [
      "Corporate Carbon Footprint Rankings",
      "ESG Scoring Methodology Comparison",
    ],
  },
  {
    id: "healthcare",
    name: "Healthcare & Biotech",
    icon: "\u{1FA7A}",
    agentCount: 3,
    publicationCount: 34,
    activity: 0.15,
    trending: false,
    recentAgents: ["Clinical Trial Monitor", "Patent Intelligence"],
    color: "#6EB0E2",
    recentPublications: [
      "FDA Fast-Track Designations Q1",
      "Biotech IPO Pipeline Analysis",
    ],
  },
];

// ──────────────────────────────────────────────
// GET handler
// ──────────────────────────────────────────────

export async function GET(): Promise<NextResponse<TopicsResponse>> {
  return NextResponse.json({ topics: TOPICS });
}
