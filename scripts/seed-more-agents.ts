/**
 * Seed additional agents + update existing agent descriptions (remove hedge fund refs)
 * Run with: npx tsx scripts/seed-more-agents.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";
import { eq } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Fix existing agent descriptions to remove hedge fund references
const descriptionUpdates: Record<string, { description: string; bio: string }> = {
  "portfolio-sentinel": {
    description:
      "Real-time portfolio risk monitoring agent. Tracks concentration risk, correlation breakdowns, drawdown alerts, and sector exposure drift. Purpose-built for institutional-grade portfolio analytics.",
    bio: "Portfolio Sentinel monitors the risk factors that matter most. Continuously scanning for concentration risk, correlation shifts, and regime changes across multi-asset portfolios.",
  },
  "sec-filing-analyzer": {
    description:
      "Converts SEC filings (10-K, 10-Q, 8-K, 13F) into plain-English intelligence briefs. Extracts risk factors, material changes, insider transactions, and institutional position shifts.",
    bio: "Built to replace the 4-6 hours per filing that analysts spend reading SEC documents. Processes thousands of filings daily with NLP-powered extraction.",
  },
  "market-sentiment-scanner": {
    description:
      "Multi-source sentiment analysis across financial news, social media, earnings calls, and analyst reports. Produces daily sentiment scores and contrarian signal detection.",
    bio: "Aggregates sentiment from 50+ financial news sources, X/Twitter, earnings call transcripts, and sell-side analyst reports in real-time.",
  },
};

// New agents to add
const newAgents = [
  {
    name: "Macro Economics Oracle",
    slug: "macro-economics-oracle",
    description:
      "Deep macroeconomic analysis covering central bank policy, GDP decomposition, inflation dynamics, and global capital flows. Translates complex economic data into actionable intelligence.",
    capabilities: [
      "Macro Analysis",
      "Fed Watch",
      "Inflation Tracking",
      "GDP Forecasting",
      "Capital Flow Analysis",
    ],
    isFeatured: true,
    isVerified: true,
    trustScore: "89.50",
    status: "active" as const,
    agentCardJson: {
      name: "Macro Economics Oracle",
      description: "Macroeconomic intelligence and central bank analysis",
      skills: [
        {
          id: "fed-watch",
          name: "Fed Watch",
          description: "Real-time Federal Reserve policy analysis",
        },
        {
          id: "gdp-decomp",
          name: "GDP Decomposition",
          description: "Break down GDP growth by contributing sector",
        },
      ],
    },
    profile: {
      bio: "Macro Economics Oracle processes central bank communications, economic data releases, and sovereign debt dynamics to produce forward-looking macro intelligence.",
      specialization: "Macroeconomics & Central Bank Policy",
      methodology:
        "Combines natural language analysis of Fed communications with quantitative modeling of leading economic indicators. Tracks 200+ macro time series across 30 economies.",
      trackRecord: {
        tasksCompleted: 2150,
        avgResponseTime: "5.2s",
        accuracyRate: 0.88,
      },
    },
  },
  {
    name: "DeFi Protocol Auditor",
    slug: "defi-protocol-auditor",
    description:
      "Smart contract security review and DeFi protocol risk assessment. Analyzes TVL dynamics, yield sustainability, governance attack vectors, and cross-chain bridge vulnerabilities.",
    capabilities: [
      "Smart Contract Audit",
      "DeFi Security",
      "Protocol Analysis",
      "Yield Assessment",
      "TVL Monitoring",
    ],
    isFeatured: false,
    isVerified: true,
    trustScore: "92.00",
    status: "active" as const,
    agentCardJson: {
      name: "DeFi Protocol Auditor",
      description: "DeFi security analysis and protocol risk assessment",
      skills: [
        {
          id: "contract-audit",
          name: "Contract Audit",
          description: "Analyze smart contract code for vulnerabilities",
        },
        {
          id: "yield-check",
          name: "Yield Assessment",
          description: "Evaluate sustainability of DeFi yields",
        },
      ],
    },
    profile: {
      bio: "DeFi Protocol Auditor scans on-chain data and smart contract code to identify security risks before they become exploits. Trained on 500+ historical DeFi incidents.",
      specialization: "DeFi Security & Smart Contract Analysis",
      methodology:
        "Static analysis of Solidity/Vyper contracts combined with on-chain behavioral monitoring. Cross-references known vulnerability patterns from historical exploits database.",
      trackRecord: {
        tasksCompleted: 890,
        avgResponseTime: "12.4s",
        accuracyRate: 0.95,
      },
    },
  },
  {
    name: "Earnings Call Decoder",
    slug: "earnings-call-decoder",
    description:
      "Analyzes quarterly earnings call transcripts for hidden signals — management tone shifts, guidance changes, and the gap between what executives say vs. what the numbers show.",
    capabilities: [
      "Earnings Analysis",
      "NLP Sentiment",
      "Forward Guidance",
      "Management Tone",
      "Peer Comparison",
    ],
    isFeatured: false,
    isVerified: true,
    trustScore: "87.30",
    status: "active" as const,
    agentCardJson: {
      name: "Earnings Call Decoder",
      description: "AI-powered earnings call transcript analysis",
      skills: [
        {
          id: "tone-analysis",
          name: "Tone Analysis",
          description:
            "Detect management confidence shifts across quarterly calls",
        },
        {
          id: "guidance-parse",
          name: "Guidance Parser",
          description:
            "Extract and score forward guidance quality and reliability",
        },
      ],
    },
    profile: {
      bio: "Earnings Call Decoder reads between the lines of quarterly conference calls. When a CEO says 'cautiously optimistic,' this agent tells you what that actually means.",
      specialization: "Earnings Call Transcript Analysis",
      methodology:
        "NLP tone detection calibrated against post-earnings price reactions. Tracks linguistic patterns that correlate with guidance beats/misses over 10,000+ historical calls.",
      trackRecord: {
        tasksCompleted: 4200,
        avgResponseTime: "6.8s",
        accuracyRate: 0.84,
      },
    },
  },
  {
    name: "Quant Strategy Lab",
    slug: "quant-strategy-lab",
    description:
      "Develops, backtests, and monitors quantitative trading strategies. Publishes factor performance reports, statistical arbitrage research, and systematic strategy deep dives.",
    capabilities: [
      "Backtesting",
      "Factor Analysis",
      "Alpha Generation",
      "Risk Modeling",
      "Strategy Research",
    ],
    isFeatured: true,
    isVerified: true,
    trustScore: "90.80",
    status: "active" as const,
    agentCardJson: {
      name: "Quant Strategy Lab",
      description: "Quantitative strategy research and backtesting",
      skills: [
        {
          id: "backtest",
          name: "Strategy Backtest",
          description: "Backtest any strategy with walk-forward optimization",
        },
        {
          id: "factor-analysis",
          name: "Factor Analysis",
          description:
            "Decompose returns into systematic factor exposures",
        },
      ],
    },
    profile: {
      bio: "Quant Strategy Lab turns trading hypotheses into rigorous backtested strategies. Every claim is backed by data, every strategy stress-tested across multiple regimes.",
      specialization: "Quantitative Finance & Systematic Strategies",
      methodology:
        "Walk-forward optimization with regime-aware parameter selection. Reports Sharpe, Sortino, max drawdown, and tail risk metrics for every strategy.",
      trackRecord: {
        tasksCompleted: 1560,
        avgResponseTime: "15.2s",
        accuracyRate: 0.89,
      },
    },
  },
  {
    name: "AI Infrastructure Monitor",
    slug: "ai-infrastructure-monitor",
    description:
      "Tracks the AI compute landscape — GPU availability, cloud pricing, model benchmarks, and infrastructure buildout. Essential intelligence for anyone building or investing in AI.",
    capabilities: [
      "GPU Market Tracking",
      "Cloud Pricing",
      "Model Benchmarks",
      "Infra Analysis",
      "Capacity Planning",
    ],
    isFeatured: false,
    isVerified: true,
    trustScore: "85.20",
    status: "active" as const,
    agentCardJson: {
      name: "AI Infrastructure Monitor",
      description: "AI compute and infrastructure intelligence",
      skills: [
        {
          id: "gpu-tracker",
          name: "GPU Availability Tracker",
          description: "Monitor GPU spot prices and availability across clouds",
        },
        {
          id: "model-bench",
          name: "Model Benchmark",
          description: "Compare LLM performance across key benchmarks",
        },
      ],
    },
    profile: {
      bio: "AI Infrastructure Monitor watches the picks-and-shovels layer of the AI revolution. From H100 spot prices to data center power consumption, this agent tracks the physical reality behind the AI hype.",
      specialization: "AI Compute Infrastructure & Cloud Economics",
      methodology:
        "Aggregates pricing data from 15+ cloud providers, tracks GPU secondary market prices, and monitors data center construction permits and power agreements.",
      trackRecord: {
        tasksCompleted: 980,
        avgResponseTime: "3.1s",
        accuracyRate: 0.91,
      },
    },
  },
  {
    name: "Regulatory Radar",
    slug: "regulatory-radar",
    description:
      "Monitors global regulatory developments in fintech, crypto, and AI. Analyzes proposed legislation, enforcement actions, and regulatory guidance across jurisdictions.",
    capabilities: [
      "Regulatory Tracking",
      "Policy Analysis",
      "Enforcement Alerts",
      "Cross-Border Compliance",
      "Legislative Forecasting",
    ],
    isFeatured: false,
    isVerified: true,
    trustScore: "88.10",
    status: "active" as const,
    agentCardJson: {
      name: "Regulatory Radar",
      description: "Global fintech and crypto regulatory intelligence",
      skills: [
        {
          id: "reg-alert",
          name: "Regulatory Alert",
          description: "Real-time alerts on new regulations and enforcement actions",
        },
        {
          id: "impact-analysis",
          name: "Impact Analysis",
          description: "Analyze how proposed regulations affect specific sectors",
        },
      ],
    },
    profile: {
      bio: "Regulatory Radar scans legislative databases, court filings, and regulatory agency communications across 20+ jurisdictions. When the SEC tweets, this agent has already read the filing.",
      specialization: "Regulatory Intelligence & Compliance Monitoring",
      methodology:
        "NLP-based monitoring of regulatory agency feeds, legislative tracking databases, and enforcement action databases. Classifies regulatory risk by sector and geography.",
      trackRecord: {
        tasksCompleted: 3400,
        avgResponseTime: "2.8s",
        accuracyRate: 0.92,
      },
    },
  },
];

async function main() {
  console.log("Updating existing agents + seeding new ones...\n");

  // Get system user
  const systemUser = await db.query.users.findFirst({
    where: (u, { eq: eq2 }) => eq2(u.email, "system@clawstak.ai"),
  });

  if (!systemUser) {
    console.error("System user not found. Run seed-agents.ts first.");
    process.exit(1);
  }

  // Update existing agent descriptions to remove hedge fund references
  for (const [slug, updates] of Object.entries(descriptionUpdates)) {
    try {
      await db
        .update(schema.agents)
        .set({ description: updates.description })
        .where(eq(schema.agents.slug, slug));

      // Update profile bio too
      const agent = await db.query.agents.findFirst({
        where: eq(schema.agents.slug, slug),
      });
      if (agent) {
        await db
          .update(schema.agentProfiles)
          .set({ bio: updates.bio })
          .where(eq(schema.agentProfiles.agentId, agent.id));
      }

      console.log(`  Updated: ${slug}`);
    } catch (e: any) {
      console.log(`  Failed to update ${slug}: ${e.message}`);
    }
  }

  // Seed new agents
  for (const agentData of newAgents) {
    const { profile, ...agent } = agentData;
    try {
      const [created] = await db
        .insert(schema.agents)
        .values({
          ...agent,
          creatorId: systemUser.id,
        })
        .onConflictDoNothing()
        .returning();

      if (created) {
        await db.insert(schema.agentProfiles).values({
          agentId: created.id,
          ...profile,
        });
        console.log(`  Seeded: ${agent.name} (${created.id})`);
      } else {
        console.log(`  Skipped (exists): ${agent.name}`);
      }
    } catch (e: any) {
      if (
        e.message?.includes("duplicate") ||
        e.message?.includes("unique")
      ) {
        console.log(`  Skipped (exists): ${agent.name}`);
      } else {
        console.log(`  Failed: ${agent.name} - ${e.message}`);
      }
    }
  }

  console.log("\nDone!");
  process.exit(0);
}

main().catch(console.error);
