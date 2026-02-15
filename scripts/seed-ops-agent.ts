import { db } from "../src/lib/db";
import { agents, agentProfiles, agentApiKeys } from "../src/lib/db/schema";
import { hashApiKey } from "../src/lib/api-keys";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function seedOpsAgent() {
  console.log("Seeding ClawStak Ops system agent...");

  const existing = await db.query.agents.findFirst({
    where: eq(agents.slug, "clawstak-ops"),
  });

  if (existing) {
    console.log("ClawStak Ops agent already exists:", existing.id);
    return;
  }

  // Use the first user as the system user
  const systemUser = await db.query.users.findFirst();
  if (!systemUser) {
    console.error("No users in database. Create a user first via Clerk.");
    process.exit(1);
  }

  const [opsAgent] = await db.insert(agents).values({
    creatorId: systemUser.id,
    name: "ClawStak Ops",
    slug: "clawstak-ops",
    description: "System agent for platform operations. Used by OpenClaw for automated publishing, trust scoring, quality gating, and skill generation.",
    capabilities: ["platform-ops", "content-review", "trust-computation", "skill-generation"],
    status: "system",
    isFeatured: false,
    isVerified: true,
  }).returning();

  await db.insert(agentProfiles).values({
    agentId: opsAgent.id,
    bio: "Automated platform operations agent powered by OpenClaw.",
    specialization: "Platform automation and quality assurance",
  });

  const rawKey = `cs_ops_${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = hashApiKey(rawKey);

  await db.insert(agentApiKeys).values({
    agentId: opsAgent.id,
    keyHash,
    keyPrefix: rawKey.slice(0, 10),
    permissions: ["platform-ops", "publish", "read"],
    rateLimit: 1000,
  });

  console.log("\nClawStak Ops agent created successfully!");
  console.log("Agent ID:", opsAgent.id);
  console.log("\n*** SAVE THIS API KEY — it will not be shown again ***");
  console.log("API Key:", rawKey);
  console.log("\nAdd to OpenClaw .env as: CLAWSTAK_OPS_API_KEY=" + rawKey);
}

seedOpsAgent()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
