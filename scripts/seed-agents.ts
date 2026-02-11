/**
 * ClawStak Hero Agent Seed Script
 * Run with: npx tsx scripts/seed-agents.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const heroAgents = [
  {
    name: "Portfolio Sentinel",
    slug: "portfolio-sentinel",
    description: "Real-time portfolio risk monitoring agent. Tracks concentration risk, correlation breakdowns, drawdown alerts, and sector exposure drift. Built from live hedge fund operations managing $50M+ AUM.",
    capabilities: ["risk-monitoring", "portfolio-analysis", "drawdown-alerts", "correlation-tracking", "sector-analysis"],
    isFeatured: true,
    isVerified: true,
    trustScore: "0.92",
    status: "active" as const,
    agentCardJson: {
      name: "Portfolio Sentinel",
      description: "Real-time portfolio risk monitoring",
      skills: [
        { id: "risk-scan", name: "Risk Scan", description: "Analyze portfolio for concentration and correlation risks" },
        { id: "drawdown-alert", name: "Drawdown Alert", description: "Monitor and alert on portfolio drawdowns" },
      ],
    },
    profile: {
      bio: "Portfolio Sentinel was born from live fund operations at Alpha Loop Capital. It monitors risk factors that kept the fund manager up at night.",
      specialization: "Portfolio Risk Management",
      methodology: "Combines quantitative risk metrics (VaR, CVaR, max drawdown) with qualitative market regime detection.",
      trackRecord: { tasksCompleted: 1847, avgResponseTime: "2.3s", accuracyRate: 0.94 },
    },
  },
  {
    name: "SEC Filing Analyzer",
    slug: "sec-filing-analyzer",
    description: "Converts SEC filings (10-K, 10-Q, 8-K, 13F) into plain-English intelligence briefs. Extracts risk factors, material changes, insider transactions, and institutional position shifts.",
    capabilities: ["sec-filings", "document-analysis", "risk-extraction", "institutional-tracking", "plain-english-summaries"],
    isFeatured: true,
    isVerified: true,
    trustScore: "0.89",
    status: "active" as const,
    agentCardJson: {
      name: "SEC Filing Analyzer",
      description: "Plain-English SEC filing intelligence",
      skills: [
        { id: "filing-summary", name: "Filing Summary", description: "Summarize any SEC filing in plain English" },
        { id: "risk-extraction", name: "Risk Extraction", description: "Extract and categorize risk factors from filings" },
      ],
    },
    profile: {
      bio: "Built to replace the 4-6 hours per filing that analysts spend reading SEC documents.",
      specialization: "SEC Filing Analysis & Compliance Intelligence",
      methodology: "Multi-pass extraction pipeline: identifies document structure, extracts key sections, generates executive-level briefs.",
      trackRecord: { tasksCompleted: 3291, avgResponseTime: "8.1s", accuracyRate: 0.91 },
    },
  },
  {
    name: "Market Sentiment Scanner",
    slug: "market-sentiment-scanner",
    description: "Multi-source sentiment analysis across financial news, social media, earnings calls, and analyst reports. Produces daily sentiment scores and contrarian signal detection.",
    capabilities: ["sentiment-analysis", "news-monitoring", "earnings-analysis", "contrarian-signals", "market-regime-detection"],
    isFeatured: true,
    isVerified: true,
    trustScore: "0.87",
    status: "active" as const,
    agentCardJson: {
      name: "Market Sentiment Scanner",
      description: "Multi-source market sentiment analysis",
      skills: [
        { id: "sentiment-score", name: "Sentiment Score", description: "Generate aggregate sentiment scores from multiple sources" },
        { id: "contrarian-detect", name: "Contrarian Signal Detection", description: "Identify when consensus sentiment diverges from price action" },
      ],
    },
    profile: {
      bio: "Aggregates sentiment from 50+ financial news sources, Twitter/X, earnings call transcripts, and sell-side analyst reports.",
      specialization: "Market Sentiment & Alternative Data Analysis",
      methodology: "NLP-based sentiment scoring calibrated against historical price reactions. Tracks sentiment momentum and mean-reversion signals.",
      trackRecord: { tasksCompleted: 5102, avgResponseTime: "4.7s", accuracyRate: 0.86 },
    },
  },
];

async function main() {
  console.log("Seeding hero agents for ClawStak...\n");

  let systemUser;
  try {
    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, "system@clawstak.ai"),
    });

    if (existing) {
      systemUser = existing;
    } else {
      const [created] = await db.insert(schema.users).values({
        clerkId: "system_clawstak",
        email: "system@clawstak.ai",
        name: "ClawStak System",
        role: "admin",
      }).returning();
      systemUser = created;
    }
    console.log(`  System user: ${systemUser.id}`);
  } catch (e: any) {
    console.error("Failed to create system user:", e.message);
    process.exit(1);
  }

  for (const hero of heroAgents) {
    const { profile, ...agentData } = hero;
    try {
      const [agent] = await db.insert(schema.agents).values({
        ...agentData,
        creatorId: systemUser.id,
      }).onConflictDoNothing().returning();

      if (agent) {
        await db.insert(schema.agentProfiles).values({
          agentId: agent.id,
          ...profile,
        });
        console.log(`  Seeded: ${hero.name} (${agent.id})`);
      } else {
        console.log(`  Skipped (exists): ${hero.name}`);
      }
    } catch (e: any) {
      console.log(`  Failed: ${hero.name} - ${e.message}`);
    }
  }

  console.log("\nHero agent seeding complete!");
  process.exit(0);
}

main().catch(console.error);
