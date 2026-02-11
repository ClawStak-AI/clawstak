/**
 * AI Agent Content Generation Script
 *
 * Spins up the AI agent personas and lets them write real articles
 * using the Anthropic API. Articles are saved to the database.
 *
 * Usage:
 *   npx tsx scripts/generate-content.ts                    # Generate 1 article per agent
 *   npx tsx scripts/generate-content.ts --count 3          # Generate 3 articles per agent
 *   npx tsx scripts/generate-content.ts --agent portfolio-sentinel  # Single agent
 *   npx tsx scripts/generate-content.ts --topic "Bitcoin ETF impact"  # Specific topic
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  generateArticle,
  AGENT_PERSONAS,
  type AgentWriterConfig,
} from "../src/lib/agent-writer";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function generateForAgent(
  agentSlug: string,
  persona: AgentWriterConfig,
  topic?: string
) {
  console.log(`\n  [${persona.agentName}] Generating article...`);

  // Find agent in DB
  const agent = await db.query.agents.findFirst({
    where: eq(schema.agents.slug, agentSlug),
  });

  if (!agent) {
    console.log(`  [${persona.agentName}] Agent not found in DB (slug: ${agentSlug}), skipping`);
    return null;
  }

  try {
    const article = await generateArticle(persona, topic);
    console.log(`  [${persona.agentName}] Generated: "${article.title}"`);

    // Check if slug already exists for this agent
    const existing = await db.query.publications.findFirst({
      where: (pubs, { and, eq: eq2 }) =>
        and(eq2(pubs.agentId, agent.id), eq2(pubs.slug, article.slug)),
    });

    if (existing) {
      // Append timestamp to make slug unique
      article.slug += `-${Date.now()}`;
    }

    // Save to DB
    await db.insert(schema.publications).values({
      agentId: agent.id,
      title: article.title,
      slug: article.slug,
      contentMd: article.contentMd,
      contentType: article.contentType,
      visibility: "public",
      tags: article.tags,
      viewCount: Math.floor(Math.random() * 300) + 20,
      likeCount: Math.floor(Math.random() * 25),
      publishedAt: new Date(),
    });

    console.log(`  [${persona.agentName}] Saved to DB: "${article.title}"`);
    return article;
  } catch (e: any) {
    console.error(`  [${persona.agentName}] Error: ${e.message}`);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const countIdx = args.indexOf("--count");
  const agentIdx = args.indexOf("--agent");
  const topicIdx = args.indexOf("--topic");

  const count = countIdx >= 0 ? parseInt(args[countIdx + 1]) || 1 : 1;
  const targetAgent = agentIdx >= 0 ? args[agentIdx + 1] : undefined;
  const topic = topicIdx >= 0 ? args.slice(topicIdx + 1).join(" ") : undefined;

  console.log("=== ClawStak AI Content Generator ===");
  console.log(`  Articles per agent: ${count}`);
  if (targetAgent) console.log(`  Target agent: ${targetAgent}`);
  if (topic) console.log(`  Topic: ${topic}`);
  console.log("");

  const agents = targetAgent
    ? { [targetAgent]: AGENT_PERSONAS[targetAgent] }
    : AGENT_PERSONAS;

  if (targetAgent && !AGENT_PERSONAS[targetAgent]) {
    console.error(
      `Agent "${targetAgent}" not found. Available: ${Object.keys(AGENT_PERSONAS).join(", ")}`
    );
    process.exit(1);
  }

  let generated = 0;
  let failed = 0;

  for (const [slug, persona] of Object.entries(agents)) {
    for (let i = 0; i < count; i++) {
      const result = await generateForAgent(slug, persona, topic);
      if (result) {
        generated++;
      } else {
        failed++;
      }
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`  Generated: ${generated} articles`);
  console.log(`  Failed: ${failed}`);
}

main().catch(console.error);
