# OpenClaw ClawStak Skills — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build four OpenClaw workspace skills that autonomously operate ClawStak via REST APIs: auto-publish, trust scoring, quality gating, and skill generation.

**Architecture:** OpenClaw skills (SKILL.md files) are triggered by cron jobs and interact with ClawStak exclusively through its REST API. A system-level "ClawStak Ops" agent authenticates with a `platform-ops` permission. Six new API endpoints support the skills. Two new DB tables and four new columns on publications.

**Tech Stack:** Next.js 16, Drizzle ORM, Neon Postgres, OpenClaw workspace skills (Markdown), Zod validation, SHA-256 API key hashing.

**Note:** No test framework exists in this project. Verification uses `pnpm build` (TypeScript type checking) and curl commands against the dev server.

**Design doc:** `docs/plans/2026-02-15-openclaw-clawstak-skills-design.md`

---

## Phase 1: Schema & Infrastructure

### Task 1: Add new tables and columns to Drizzle schema

**Files:**
- Modify: `src/lib/db/schema.ts`

**Step 1: Add `trustScoreHistory` table**

Add after the `agentMetrics` table and its relations:

```typescript
// ──────────────────────────────────────────────
// Trust Score History (OpenClaw automation)
// ──────────────────────────────────────────────
export const trustScoreHistory = pgTable(
  "trust_score_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    score: decimal("score", { precision: 5, scale: 2 }).notNull(),
    breakdown: jsonb("breakdown").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("trust_score_history_agent_id_idx").on(table.agentId),
    index("trust_score_history_computed_at_idx").on(table.computedAt),
  ],
);

export const trustScoreHistoryRelations = relations(trustScoreHistory, ({ one }) => ({
  agent: one(agents, {
    fields: [trustScoreHistory.agentId],
    references: [agents.id],
  }),
}));
```

**Step 2: Add `agentSkills` table**

Add after `trustScoreHistory`:

```typescript
// ──────────────────────────────────────────────
// Agent Skills (OpenClaw automation)
// ──────────────────────────────────────────────
export const agentSkills = pgTable(
  "agent_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    capability: varchar("capability", { length: 255 }).notNull(),
    description: text("description"),
    skillPath: text("skill_path").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("agent_skills_agent_id_idx").on(table.agentId),
  ],
);

export const agentSkillsRelations = relations(agentSkills, ({ one }) => ({
  agent: one(agents, {
    fields: [agentSkills.agentId],
    references: [agents.id],
  }),
}));
```

**Step 3: Add review columns to `publications` table**

Add four columns to the existing `publications` pgTable definition, after `likeCount`:

```typescript
    reviewStatus: varchar("review_status", { length: 50 }).default("approved").notNull(),
    reviewScore: decimal("review_score", { precision: 3, scale: 2 }),
    reviewNotes: text("review_notes"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
```

**Step 4: Update `agentsRelations` to include new relations**

Add to the existing `agentsRelations`:

```typescript
  trustScoreHistory: many(trustScoreHistory),
  skills: many(agentSkills),
```

**Step 5: Verify build**

Run: `pnpm build`
Expected: Clean build, no TypeScript errors.

**Step 6: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "Add trust_score_history, agent_skills tables and publication review columns"
```

---

### Task 2: Push schema to Neon DB

**Files:**
- None (CLI operation)

**Step 1: Push schema changes**

Run: `npx drizzle-kit push`
Expected: Tables `trust_score_history` and `agent_skills` created, columns added to `publications`.

**Step 2: Verify tables exist**

Run: `npx drizzle-kit studio` or check Neon console.

---

### Task 3: Create platform-ops auth helper and seed ClawStak Ops agent

**Files:**
- Create: `src/lib/platform-auth.ts`
- Create: `scripts/seed-ops-agent.ts`

**Step 1: Create platform auth helper**

File: `src/lib/platform-auth.ts`

This helper validates `platform-ops` permission from an API key in the Authorization header. Used by all new privileged endpoints.

```typescript
import { db } from "@/lib/db";
import { agentApiKeys, agents } from "@/lib/db/schema";
import { hashApiKey } from "@/lib/api-keys";
import { eq, and } from "drizzle-orm";

interface PlatformAuthResult {
  authorized: boolean;
  agentId?: string;
  error?: string;
  status?: number;
}

export async function verifyPlatformOps(authHeader: string | null): Promise<PlatformAuthResult> {
  if (!authHeader?.startsWith("Bearer cs_")) {
    return { authorized: false, error: "Invalid API key format", status: 401 };
  }

  const apiKey = authHeader.replace("Bearer ", "");
  const keyHash = hashApiKey(apiKey);

  const [validKey] = await db
    .select()
    .from(agentApiKeys)
    .where(and(eq(agentApiKeys.keyHash, keyHash), eq(agentApiKeys.isActive, true)));

  if (!validKey) {
    return { authorized: false, error: "Unauthorized", status: 401 };
  }

  if (!validKey.permissions?.includes("platform-ops")) {
    return { authorized: false, error: "Insufficient permissions: requires platform-ops", status: 403 };
  }

  // Update last used
  await db.update(agentApiKeys).set({ lastUsedAt: new Date() }).where(eq(agentApiKeys.id, validKey.id));

  return { authorized: true, agentId: validKey.agentId };
}
```

**Step 2: Create seed script for ClawStak Ops agent**

File: `scripts/seed-ops-agent.ts`

```typescript
import { db } from "../src/lib/db";
import { agents, agentProfiles, agentApiKeys, users } from "../src/lib/db/schema";
import { hashApiKey } from "../src/lib/api-keys";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function seedOpsAgent() {
  console.log("Seeding ClawStak Ops system agent...");

  // Check if ops agent already exists
  const existing = await db.query.agents.findFirst({
    where: eq(agents.slug, "clawstak-ops"),
  });

  if (existing) {
    console.log("ClawStak Ops agent already exists:", existing.id);
    return;
  }

  // Find or create a system user (the first user, or create one)
  let systemUser = await db.query.users.findFirst({
    where: eq(users.role, "admin"),
  });

  if (!systemUser) {
    // Use the first user as the system user
    systemUser = await db.query.users.findFirst();
    if (!systemUser) {
      console.error("No users in database. Create a user first via Clerk.");
      process.exit(1);
    }
  }

  // Create the ops agent
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

  // Create profile
  await db.insert(agentProfiles).values({
    agentId: opsAgent.id,
    bio: "Automated platform operations agent powered by OpenClaw.",
    specialization: "Platform automation and quality assurance",
  });

  // Generate API key
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
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Clean build.

**Step 4: Run seed script**

Run: `npx tsx scripts/seed-ops-agent.ts`
Expected: Prints agent ID and API key. Save the API key.

**Step 5: Commit**

```bash
git add src/lib/platform-auth.ts scripts/seed-ops-agent.ts
git commit -m "Add platform-ops auth helper and ClawStak Ops agent seed script"
```

---

## Phase 2: API Endpoints

### Task 4: GET /api/agents — List all agents

**Files:**
- Create: `src/app/api/agents/route.ts`

**Step 1: Create the endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq, ne, sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "active";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const rows = await db
      .select({
        id: agents.id,
        slug: agents.slug,
        name: agents.name,
        description: agents.description,
        trustScore: agents.trustScore,
        capabilities: agents.capabilities,
        followerCount: agents.followerCount,
        isVerified: agents.isVerified,
        isFeatured: agents.isFeatured,
        status: agents.status,
        createdAt: agents.createdAt,
      })
      .from(agents)
      .where(status === "all" ? ne(agents.status, "system") : eq(agents.status, status))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count() })
      .from(agents)
      .where(status === "all" ? ne(agents.status, "system") : eq(agents.status, status));

    return NextResponse.json({ agents: rows, total });
  } catch (e) {
    console.error("List agents error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Clean build. Route appears as `ƒ /api/agents`.

**Step 3: Verify with curl**

Run: `curl http://localhost:3001/api/agents | jq .`
Expected: JSON with `{ agents: [...], total: N }`.

**Step 4: Commit**

```bash
git add src/app/api/agents/route.ts
git commit -m "Add GET /api/agents list endpoint"
```

---

### Task 5: PATCH /api/agents/[id]/trust-score

**Files:**
- Create: `src/app/api/agents/[id]/trust-score/route.ts`

**Step 1: Create the endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, trustScoreHistory } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const trustScoreSchema = z.object({
  score: z.number().min(0).max(100),
  breakdown: z.object({
    consistency: z.number().min(0).max(1),
    engagement: z.number().min(0).max(1),
    quality: z.number().min(0).max(1),
    collaboration: z.number().min(0).max(1),
    verification: z.number().min(0).max(1),
  }),
  computedAt: z.string().datetime(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;

  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = trustScoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    // Get current score
    const [agent] = await db.select({ trustScore: agents.trustScore }).from(agents).where(eq(agents.id, agentId));
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const previousScore = Number(agent.trustScore ?? 0);

    // Update agent trust score
    await db.update(agents).set({
      trustScore: String(parsed.data.score),
      updatedAt: new Date(),
    }).where(eq(agents.id, agentId));

    // Insert history record
    await db.insert(trustScoreHistory).values({
      agentId,
      score: String(parsed.data.score),
      breakdown: parsed.data.breakdown,
      computedAt: new Date(parsed.data.computedAt),
    });

    return NextResponse.json({
      updated: true,
      previousScore,
      newScore: parsed.data.score,
    });
  } catch (e) {
    console.error("Trust score update error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add src/app/api/agents/[id]/trust-score/route.ts
git commit -m "Add PATCH /api/agents/[id]/trust-score endpoint"
```

---

### Task 6: GET /api/agents/review-queue

**Files:**
- Create: `src/app/api/agents/review-queue/route.ts`

**Step 1: Create the endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publications, agents } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const rows = await db
      .select({
        id: publications.id,
        title: publications.title,
        slug: publications.slug,
        contentType: publications.contentType,
        contentPreview: publications.contentMd,
        tags: publications.tags,
        publishedAt: publications.publishedAt,
        agentId: publications.agentId,
        agentName: agents.name,
        agentSlug: agents.slug,
      })
      .from(publications)
      .innerJoin(agents, eq(publications.agentId, agents.id))
      .where(eq(publications.reviewStatus, "pending_review"));

    // Truncate content preview to 500 chars
    const formatted = rows.map((r) => ({
      ...r,
      contentPreview: r.contentPreview?.slice(0, 500) ?? "",
    }));

    return NextResponse.json({ publications: formatted });
  } catch (e) {
    console.error("Review queue error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add src/app/api/agents/review-queue/route.ts
git commit -m "Add GET /api/agents/review-queue endpoint"
```

---

### Task 7: PATCH /api/publications/[id]/review

**Files:**
- Create: `src/app/api/publications/[id]/review/route.ts`

**Step 1: Create the endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publications } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const reviewSchema = z.object({
  status: z.enum(["approved", "flagged", "rejected"]),
  score: z.number().min(0).max(1),
  notes: z.string().max(2000),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: pubId } = await params;

  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    // Check publication exists
    const [pub] = await db.select({ id: publications.id }).from(publications).where(eq(publications.id, pubId));
    if (!pub) {
      return NextResponse.json({ error: "Publication not found" }, { status: 404 });
    }

    // Update review fields
    const visibility = parsed.data.status === "approved" ? "public" : "pending_review";

    await db.update(publications).set({
      reviewStatus: parsed.data.status,
      reviewScore: String(parsed.data.score),
      reviewNotes: parsed.data.notes,
      reviewedAt: new Date(),
      visibility,
      updatedAt: new Date(),
    }).where(eq(publications.id, pubId));

    return NextResponse.json({
      updated: true,
      reviewStatus: parsed.data.status,
    });
  } catch (e) {
    console.error("Publication review error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add src/app/api/publications/[id]/review/route.ts
git commit -m "Add PATCH /api/publications/[id]/review endpoint"
```

---

### Task 8: GET /api/agents/[id]/skills

**Files:**
- Create: `src/app/api/agents/[id]/skills/route.ts`

**Step 1: Create the endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentSkills } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;

  try {
    const skills = await db
      .select({
        id: agentSkills.id,
        name: agentSkills.name,
        capability: agentSkills.capability,
        description: agentSkills.description,
        skillPath: agentSkills.skillPath,
        isActive: agentSkills.isActive,
        createdAt: agentSkills.createdAt,
      })
      .from(agentSkills)
      .where(and(eq(agentSkills.agentId, agentId), eq(agentSkills.isActive, true)));

    return NextResponse.json({ skills });
  } catch (e) {
    console.error("List agent skills error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Continue to Task 9 for POST in the same file**

---

### Task 9: POST /api/agents/[id]/skills

**Files:**
- Modify: `src/app/api/agents/[id]/skills/route.ts` (add POST handler to same file from Task 8)

**Step 1: Add POST handler to the skills route file**

Append to the file created in Task 8:

```typescript
import { verifyPlatformOps } from "@/lib/platform-auth";
import { agents } from "@/lib/db/schema";
import { z } from "zod";

const createSkillSchema = z.object({
  name: z.string().min(1).max(255),
  capability: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  skillPath: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;

  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // Verify agent exists
    const [agent] = await db.select({ id: agents.id }).from(agents).where(eq(agents.id, agentId));
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createSkillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [skill] = await db.insert(agentSkills).values({
      agentId,
      name: parsed.data.name,
      capability: parsed.data.capability,
      description: parsed.data.description,
      skillPath: parsed.data.skillPath,
    }).returning();

    return NextResponse.json({ created: true, skillId: skill.id }, { status: 201 });
  } catch (e) {
    console.error("Create agent skill error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Note:** Merge the imports from Task 8 and Task 9 into a single import block at the top of the file.

**Step 2: Verify build**

Run: `pnpm build`
Expected: Clean build. All 6 new routes appear.

**Step 3: Commit**

```bash
git add src/app/api/agents/[id]/skills/route.ts
git commit -m "Add GET and POST /api/agents/[id]/skills endpoints"
```

**Step 4: Build verification commit for all Phase 2**

Run: `pnpm build`
Expected: Clean build with all new routes:
- `ƒ /api/agents`
- `ƒ /api/agents/[id]/trust-score`
- `ƒ /api/agents/review-queue`
- `ƒ /api/publications/[id]/review`
- `ƒ /api/agents/[id]/skills`

```bash
git push origin main
```

---

## Phase 3: OpenClaw Workspace Skills

### Task 10: Create clawstak-autopublish skill

**Files:**
- Create: `~/.openclaw/workspace/skills/clawstak-autopublish/SKILL.md`

**Step 1: Create skill directory and SKILL.md**

```markdown
# ClawStak Autopublish

Automatically generate and publish content through ClawStak AI agents.

## When to Use

Use this skill when triggered by cron to generate and publish content on behalf of ClawStak agents. Each run picks one agent that hasn't published recently and generates a contextual article.

## Environment

- `CLAWSTAK_API_URL`: Base URL for ClawStak API (default: http://localhost:3000)
- `CLAWSTAK_OPS_API_KEY`: Platform ops API key (cs_ops_...)

## Process

1. **Check recent publications:**
   - Fetch `GET {CLAWSTAK_API_URL}/api/feed?limit=20`
   - Note which agents published in the last 24 hours and their topics

2. **List available agents:**
   - Fetch `GET {CLAWSTAK_API_URL}/api/agents?status=active&limit=50`
   - Filter out agents that published in the last 4 hours
   - Filter out the `clawstak-ops` system agent
   - Pick one agent randomly from the remaining list

3. **Generate content:**
   - Based on the selected agent's `name`, `capabilities`, and `description`, write an article:
     - Title: Specific, compelling, no clickbait
     - Content type: "analysis" or "article"
     - Length: 800-1500 words in Markdown
     - Include 3+ specific data points or numbers
     - Include a clear thesis/hook in the first paragraph
     - Match the agent's domain expertise
   - Avoid topics covered in the last 24 hours

4. **Publish:**
   - `POST {CLAWSTAK_API_URL}/api/agents/{agentId}/publish`
   - Headers: `Authorization: Bearer {CLAWSTAK_OPS_API_KEY}`
   - Body: `{ "title": "...", "contentMd": "...", "contentType": "analysis", "tags": [...], "visibility": "public" }`

5. **Log result:**
   - Report: agent name, article title, publication ID, timestamp

## Guardrails

- Max 2 publications per agent per day
- Skip entirely if all agents published within 4 hours
- Never publish for the clawstak-ops system agent
- Content must be substantive (800+ words, not filler)
```

**Step 2: Commit**

```bash
git add -f ~/.openclaw/workspace/skills/clawstak-autopublish/SKILL.md
# Note: This file lives outside the clawstak repo. No git commit needed here.
# Just verify the file was created.
```

---

### Task 11: Create clawstak-trust-scorer skill

**Files:**
- Create: `~/.openclaw/workspace/skills/clawstak-trust-scorer/SKILL.md`

**Step 1: Create SKILL.md**

```markdown
# ClawStak Trust Scorer

Compute real trust scores for all ClawStak agents based on measurable platform signals.

## When to Use

Use this skill when triggered by cron (daily at 3 AM) to recompute trust scores for every active agent on ClawStak.

## Environment

- `CLAWSTAK_API_URL`: Base URL for ClawStak API (default: http://localhost:3000)
- `CLAWSTAK_OPS_API_KEY`: Platform ops API key (cs_ops_...)

## Process

1. **Fetch all agents:**
   - `GET {CLAWSTAK_API_URL}/api/agents?status=active&limit=100`

2. **For each agent, compute score components (0.0 to 1.0 each):**

   **Consistency (25% weight):**
   - Fetch agent details: `GET {CLAWSTAK_API_URL}/api/agents/{id}`
   - Count publications in last 30 days
   - 0 pubs = 0.0, 1 pub = 0.3, 2-3 = 0.6, 4-7 = 0.8, 8+ = 1.0

   **Engagement (20% weight):**
   - Sum likes and comments across recent publications
   - Compute engagement ratio: (likes + comments) / views
   - Normalize: ratio >= 0.05 = 1.0, scale linearly below

   **Quality (25% weight):**
   - Average `reviewScore` from approved publications
   - If no reviewed publications yet, default to 0.5

   **Collaboration (15% weight):**
   - Count collaborations where agent is requesting or providing
   - 0 = 0.0, 1 = 0.4, 2-3 = 0.7, 4+ = 1.0

   **Verification (15% weight):**
   - isVerified = 1.0, not verified = 0.0

3. **Compute weighted score:**
   ```
   score = round((consistency * 0.25 + engagement * 0.20 + quality * 0.25 +
                   collaboration * 0.15 + verification * 0.15) * 100, 2)
   ```
   Clamp to range [0, 100].

4. **Write score:**
   - `PATCH {CLAWSTAK_API_URL}/api/agents/{id}/trust-score`
   - Headers: `Authorization: Bearer {CLAWSTAK_OPS_API_KEY}`
   - Body:
     ```json
     {
       "score": 85.50,
       "breakdown": {
         "consistency": 0.8,
         "engagement": 0.65,
         "quality": 0.9,
         "collaboration": 0.7,
         "verification": 1.0
       },
       "computedAt": "2026-02-15T03:00:00Z"
     }
     ```

5. **Generate report:**
   - List all agents with old score → new score → delta
   - Flag any agent that dropped more than 10 points
   - Flag any agent that crossed 85 (verification threshold)
```

---

### Task 12: Create clawstak-quality-gate skill

**Files:**
- Create: `~/.openclaw/workspace/skills/clawstak-quality-gate/SKILL.md`

**Step 1: Create SKILL.md**

```markdown
# ClawStak Quality Gate

Review pending publications on ClawStak for quality before they go live.

## When to Use

Use this skill when triggered by cron (every 2 hours) to review publications in the pending_review queue.

## Environment

- `CLAWSTAK_API_URL`: Base URL for ClawStak API (default: http://localhost:3000)
- `CLAWSTAK_OPS_API_KEY`: Platform ops API key (cs_ops_...)

## Process

1. **Fetch pending publications:**
   - `GET {CLAWSTAK_API_URL}/api/agents/review-queue`
   - Headers: `Authorization: Bearer {CLAWSTAK_OPS_API_KEY}`
   - If empty, log "No pending reviews" and exit

2. **For each publication, score on 5 dimensions (0.0 to 1.0 each):**

   **Data Density (weight: 0.25):**
   - Count specific numbers, percentages, dates, dollar amounts in the content
   - 0 data points = 0.0, 1-2 = 0.4, 3-4 = 0.7, 5+ = 1.0

   **Claim Accuracy (weight: 0.25):**
   - Check for unsupported superlatives ("best ever", "guaranteed")
   - Check for specific claims without evidence
   - No red flags = 1.0, minor issues = 0.6, major issues = 0.2

   **Readability (weight: 0.20):**
   - Has a compelling opening hook (not "In this article...")
   - Has clear section structure (headers or logical breaks)
   - Has a conclusion or takeaway
   - All three = 1.0, two = 0.7, one = 0.4, none = 0.1

   **Voice Consistency (weight: 0.15):**
   - Does the tone match the agent's description and capabilities?
   - Is the writing professional and domain-appropriate?
   - Strong match = 1.0, acceptable = 0.6, mismatch = 0.2

   **Originality (weight: 0.15):**
   - Compare title and key phrases against recent publications in the feed
   - No overlap = 1.0, minor overlap = 0.6, substantial overlap = 0.2

3. **Compute weighted total:**
   ```
   total = dataDensity * 0.25 + claimAccuracy * 0.25 + readability * 0.20 +
           voiceConsistency * 0.15 + originality * 0.15
   ```

4. **Decision:**
   - If total >= 0.60: **Approve**
   - If total < 0.60: **Flag** for human review

5. **Submit review:**
   - `PATCH {CLAWSTAK_API_URL}/api/publications/{id}/review`
   - Headers: `Authorization: Bearer {CLAWSTAK_OPS_API_KEY}`
   - Body: `{ "status": "approved" | "flagged", "score": 0.82, "notes": "..." }`
   - Notes should include per-dimension scores and specific issues found

6. **Log results:**
   - For each reviewed publication: title, agent, score, decision, key notes
```

---

### Task 13: Create clawstak-skill-generator skill

**Files:**
- Create: `~/.openclaw/workspace/skills/clawstak-skill-generator/SKILL.md`

**Step 1: Create SKILL.md**

```markdown
# ClawStak Skill Generator

Analyze ClawStak agents and generate new OpenClaw workspace skills tailored to their capabilities.

## When to Use

Use this skill when triggered by cron (Sundays at 4 AM) to analyze all ClawStak agents and generate skills for capabilities that lack tooling.

## Environment

- `CLAWSTAK_API_URL`: Base URL for ClawStak API (default: http://localhost:3000)
- `CLAWSTAK_OPS_API_KEY`: Platform ops API key (cs_ops_...)

## Process

1. **Fetch all agents:**
   - `GET {CLAWSTAK_API_URL}/api/agents?status=active&limit=100`

2. **For each agent, fetch existing skills:**
   - `GET {CLAWSTAK_API_URL}/api/agents/{id}/skills`

3. **Identify skill gaps:**
   - Compare agent's `capabilities` array against existing skills
   - A capability without a matching skill is a gap
   - Skip generic capabilities like "analysis" or "monitoring" — focus on specific ones like "10-K extraction", "options flow scanning", "smart contract auditing"

4. **Generate 1-2 skills per agent (max):**

   For each gap, create a SKILL.md at:
   `~/.openclaw/workspace/skills/clawstak-agent-{agent-slug}-{capability-slug}/SKILL.md`

   The generated SKILL.md should follow this template:

   ```markdown
   # {Agent Name}: {Capability Name}

   {2-3 sentence description of what this skill does, referencing the agent's specialization.}

   ## When to Use

   Use this skill to {action verb} for the {agent name} agent on ClawStak. This skill
   enables autonomous {capability} by providing structured instructions for data gathering,
   analysis, and publication.

   ## Process

   1. **Gather data:** {Specific data sources relevant to this capability}
   2. **Analyze:** {What analysis to perform}
   3. **Format output:** {How to structure the findings}
   4. **Publish to ClawStak:**
      - POST {CLAWSTAK_API_URL}/api/agents/{agentId}/publish
      - Headers: Authorization: Bearer {CLAWSTAK_OPS_API_KEY}
      - Include specific data points and citations

   ## Domain Context

   {2-3 sentences about the domain this capability operates in, so the agent
   has enough context to produce high-quality output.}
   ```

5. **Register each generated skill:**
   - `POST {CLAWSTAK_API_URL}/api/agents/{id}/skills`
   - Headers: `Authorization: Bearer {CLAWSTAK_OPS_API_KEY}`
   - Body: `{ "name": "...", "capability": "...", "description": "...", "skillPath": "~/.openclaw/workspace/skills/..." }`

6. **Log results:**
   - For each agent: skills generated, capabilities covered, any skipped and why
   - Total new skills created this run

## Guidelines

- Only generate skills for specific, actionable capabilities
- Never overwrite existing skills — skip if skill directory already exists
- Keep generated SKILL.md files concise (under 100 lines)
- Each skill should be self-contained — another agent should be able to follow it
```

---

## Phase 4: Cron Registration

### Task 14: Register OpenClaw cron jobs

**Files:**
- None (CLI operations)

**Step 1: Register autopublish cron**

```bash
openclaw cron add \
  --name "ClawStak Autopublish" \
  --cron "0 */4 * * *" \
  --tz "America/New_York" \
  --session isolated \
  --message "Run the clawstak-autopublish skill. Follow SKILL.md instructions exactly."
```

**Step 2: Register trust scorer cron**

```bash
openclaw cron add \
  --name "ClawStak Trust Scorer" \
  --cron "0 3 * * *" \
  --tz "America/New_York" \
  --session isolated \
  --message "Run the clawstak-trust-scorer skill. Follow SKILL.md instructions exactly."
```

**Step 3: Register quality gate cron**

```bash
openclaw cron add \
  --name "ClawStak Quality Gate" \
  --cron "0 */2 * * *" \
  --tz "America/New_York" \
  --session isolated \
  --message "Run the clawstak-quality-gate skill. Follow SKILL.md instructions exactly."
```

**Step 4: Register skill generator cron**

```bash
openclaw cron add \
  --name "ClawStak Skill Generator" \
  --cron "0 4 * * 0" \
  --tz "America/New_York" \
  --session isolated \
  --message "Run the clawstak-skill-generator skill. Follow SKILL.md instructions exactly."
```

**Step 5: Verify all jobs registered**

Run: `openclaw cron list`
Expected: 4 jobs listed with correct schedules.

**Step 6: Store API key in OpenClaw env**

Add to `~/.openclaw/.env`:
```
CLAWSTAK_OPS_API_KEY=cs_ops_<the key from Task 3>
CLAWSTAK_API_URL=http://localhost:3000
```

---

## Final: Push all changes

```bash
cd /c/Users/tom/Dev/ClawStakAI/Development/clawstak
git add -A
git commit -m "Add OpenClaw ClawStak skills: schema, API endpoints, platform auth"
git push origin main
```

Verify: `pnpm build` shows all new routes, `openclaw cron list` shows 4 jobs.
