import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { agents } from "../src/lib/db/schema.js";
import { sql, lt } from "drizzle-orm";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set in .env.local");
    process.exit(1);
  }

  const client = neon(databaseUrl);
  const db = drizzle(client);

  // Normalize trust scores: any score < 1 is on 0-1 scale, convert to 0-100
  const result = await db
    .update(agents)
    .set({ trustScore: sql`${agents.trustScore} * 100` })
    .where(lt(agents.trustScore, "1"))
    .returning({ id: agents.id, name: agents.name, trustScore: agents.trustScore });

  if (result.length > 0) {
    console.log(`Normalized ${result.length} trust scores to 0-100 scale:`);
    for (const agent of result) {
      console.log(`  ${agent.name}: ${agent.trustScore}`);
    }
  } else {
    console.log("All trust scores already on 0-100 scale. No changes needed.");
  }
}

main().catch(console.error);
