# Batch 5 Blueprint: n8n Integration + Hero Agents

> Step-by-step implementation plan for integrating n8n workflow automation
> and building the Hero/Featured Agents showcase into ClawStak.ai.
>
> **Pre-requisite reading:** `N8N-API-REFERENCE.md` for n8n API details.
> **Depends on:** Batches 1-4 (foundation, auth, publishing, social/dashboard).

---

## Table of Contents

1. [Overview](#1-overview)
2. [Environment Variables](#2-environment-variables)
3. [Database Schema Additions](#3-database-schema-additions)
4. [n8n Client Library](#4-n8n-client-library)
5. [n8n Webhook Handler (Callback Endpoint)](#5-n8n-webhook-handler)
6. [Agent Execution Pipeline](#6-agent-execution-pipeline)
7. [Execution API Routes](#7-execution-api-routes)
8. [Hero Agents Showcase Page](#8-hero-agents-showcase-page)
9. [Agent Execution UI Components](#9-agent-execution-ui-components)
10. [Agent Monitoring & Execution Logging](#10-agent-monitoring--execution-logging)
11. [Middleware & Security Updates](#11-middleware--security-updates)
12. [Build Verification Steps](#12-build-verification-steps)
13. [File Index](#13-file-index)

---

## 1. Overview

Batch 5 adds two major capabilities:

1. **n8n Workflow Integration** -- Agents can trigger n8n workflows via REST API webhooks, receive async results via callbacks, and track execution state in the database.

2. **Hero/Featured Agents Showcase** -- A public-facing page highlighting featured agents with live metrics, execution history, and a "try it" interaction flow.

### Architecture Diagram

```
User / Agent Dashboard
    |
    v
[ClawStak API Route]
    |
    |--> POST /api/agents/{id}/execute  (trigger)
    |        |
    |        |--> n8n Client (src/lib/n8n.ts)
    |        |       |
    |        |       |--> POST {N8N_WEBHOOK_URL}/clawstak-agent-execute
    |        |
    |        |--> INSERT into agent_executions (status: "pending")
    |
    |--> POST /api/webhooks/n8n         (callback from n8n)
    |        |
    |        |--> Verify webhook secret
    |        |--> UPDATE agent_executions (status: "success"/"error")
    |        |--> UPDATE agent_metrics
    |
    |--> GET /api/agents/{id}/executions (list history)
    |
    |--> GET /api/agents/featured       (hero agents)
```

---

## 2. Environment Variables

Add to `.env.local`:

```bash
# n8n Integration (API key already in Azure Key Vault as "n8n-api-key")
N8N_BASE_URL=https://your-n8n.example.com
N8N_API_KEY=n8n_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
N8N_WEBHOOK_URL=https://your-n8n.example.com/webhook
N8N_WEBHOOK_SECRET=generate-a-secure-random-string-here
```

**Action:** Add these to the `env.example` or document in `DECISIONS.md`. The `N8N_API_KEY` is already available in Azure Key Vault per `CLAUDE.md`.

---

## 3. Database Schema Additions

### File: `src/lib/db/schema.ts`

Add two new tables after the existing `collaborations` table.

#### 3a. `agent_executions` Table

Tracks every workflow execution triggered by or for an agent.

```typescript
// ──────────────────────────────────────────────
// Agent Executions (n8n workflow runs)
// ──────────────────────────────────────────────
export const agentExecutions = pgTable(
  "agent_executions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    triggeredBy: uuid("triggered_by")
      .references(() => users.id, { onDelete: "set null" }),
    n8nWorkflowId: varchar("n8n_workflow_id", { length: 255 }),
    n8nExecutionId: varchar("n8n_execution_id", { length: 255 }),
    webhookPath: varchar("webhook_path", { length: 255 }).notNull(),
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    // status values: pending, running, success, error, timeout, cancelled
    taskDescription: text("task_description"),
    inputPayload: jsonb("input_payload"),
    resultPayload: jsonb("result_payload"),
    errorMessage: text("error_message"),
    durationMs: integer("duration_ms"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("agent_executions_agent_id_idx").on(table.agentId),
    index("agent_executions_status_idx").on(table.status),
    index("agent_executions_started_at_idx").on(table.startedAt),
  ]
);

export const agentExecutionsRelations = relations(agentExecutions, ({ one }) => ({
  agent: one(agents, {
    fields: [agentExecutions.agentId],
    references: [agents.id],
  }),
  triggeredByUser: one(users, {
    fields: [agentExecutions.triggeredBy],
    references: [users.id],
  }),
}));
```

#### 3b. `n8n_workflows` Table

Maps registered n8n workflows to ClawStak agents.

```typescript
// ──────────────────────────────────────────────
// n8n Workflow Registry
// ──────────────────────────────────────────────
export const n8nWorkflows = pgTable(
  "n8n_workflows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    n8nWorkflowId: varchar("n8n_workflow_id", { length: 255 }).notNull(),
    webhookPath: varchar("webhook_path", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    executionMode: varchar("execution_mode", { length: 50 }).default("async").notNull(),
    // execution_mode values: sync, async, polling
    lastExecutedAt: timestamp("last_executed_at", { withTimezone: true }),
    totalExecutions: integer("total_executions").default(0).notNull(),
    successCount: integer("success_count").default(0).notNull(),
    errorCount: integer("error_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("n8n_workflows_agent_id_idx").on(table.agentId),
    index("n8n_workflows_webhook_path_idx").on(table.webhookPath),
  ]
);

export const n8nWorkflowsRelations = relations(n8nWorkflows, ({ one }) => ({
  agent: one(agents, {
    fields: [n8nWorkflows.agentId],
    references: [agents.id],
  }),
}));
```

#### 3c. Update `agents` Relations

Add the new relations to the existing `agentsRelations`:

```typescript
// Add to the existing agentsRelations definition:
executions: many(agentExecutions),
n8nWorkflows: many(n8nWorkflows),
```

#### 3d. Migration

After schema changes, run:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

---

## 4. n8n Client Library

### File: `src/lib/n8n.ts` (NEW)

Create a typed n8n client with graceful fallback when env vars are missing (matching the pattern used in `src/lib/db/index.ts` and `src/lib/rate-limit.ts`).

```typescript
// src/lib/n8n.ts

export interface TriggerWorkflowParams {
  webhookPath: string;
  payload: Record<string, unknown>;
  timeout?: number;
}

export interface TriggerWorkflowResult {
  success: boolean;
  n8nExecutionId?: string;
  data?: unknown;
  error?: string;
}

export interface N8nExecutionStatus {
  id: number;
  finished: boolean;
  status: "canceled" | "crashed" | "error" | "new" | "running" | "success" | "unknown" | "waiting";
  startedAt: string;
  stoppedAt: string | null;
  data?: Record<string, unknown>;
}

class N8nClient {
  private baseUrl: string;
  private apiKey: string;
  private webhookUrl: string;
  private webhookSecret: string;
  private configured: boolean;

  constructor() {
    this.baseUrl = process.env.N8N_BASE_URL || "";
    this.apiKey = process.env.N8N_API_KEY || "";
    this.webhookUrl = process.env.N8N_WEBHOOK_URL || (this.baseUrl ? `${this.baseUrl}/webhook` : "");
    this.webhookSecret = process.env.N8N_WEBHOOK_SECRET || "";
    this.configured = !!(this.baseUrl && this.apiKey);

    if (!this.configured) {
      console.warn("[ClawStak n8n] N8N_BASE_URL or N8N_API_KEY not configured. n8n operations will fail gracefully.");
    }
  }

  get isConfigured(): boolean {
    return this.configured;
  }

  private get apiHeaders(): Record<string, string> {
    return {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-N8N-API-KEY": this.apiKey,
    };
  }

  // ── Trigger workflow via webhook ──────────────────

  async triggerWorkflow({ webhookPath, payload, timeout = 30000 }: TriggerWorkflowParams): Promise<TriggerWorkflowResult> {
    if (!this.configured) {
      return { success: false, error: "n8n is not configured" };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.webhookSecret) {
        headers["X-ClawStak-Key"] = this.webhookSecret;
      }

      const res = await fetch(`${this.webhookUrl}/${webhookPath}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { success: false, error: `n8n webhook ${res.status}: ${errorText}` };
      }

      const data = await res.json();
      return {
        success: true,
        n8nExecutionId: data?.executionId || data?.id,
        data,
      };
    } catch (error: any) {
      if (error.name === "AbortError") {
        return { success: false, error: "n8n webhook request timed out" };
      }
      return { success: false, error: error.message };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── Get execution status via REST API ─────────────

  async getExecution(executionId: string): Promise<N8nExecutionStatus | null> {
    if (!this.configured) return null;

    try {
      const res = await fetch(
        `${this.baseUrl}/api/v1/executions/${executionId}?includeData=true`,
        { headers: this.apiHeaders }
      );
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  // ── List workflows via REST API ───────────────────

  async listWorkflows(options?: { active?: boolean; limit?: number }) {
    if (!this.configured) return { data: [], nextCursor: null };

    const params = new URLSearchParams();
    if (options?.active !== undefined) params.set("active", String(options.active));
    if (options?.limit) params.set("limit", String(options.limit));

    const res = await fetch(`${this.baseUrl}/api/v1/workflows?${params}`, {
      headers: this.apiHeaders,
    });
    if (!res.ok) throw new Error(`n8n listWorkflows failed: ${res.status}`);
    return res.json();
  }

  // ── Activate / deactivate workflow ────────────────

  async activateWorkflow(workflowId: string) {
    if (!this.configured) return null;
    const res = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}/activate`, {
      method: "POST",
      headers: this.apiHeaders,
    });
    if (!res.ok) throw new Error(`n8n activate failed: ${res.status}`);
    return res.json();
  }

  async deactivateWorkflow(workflowId: string) {
    if (!this.configured) return null;
    const res = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}/deactivate`, {
      method: "POST",
      headers: this.apiHeaders,
    });
    if (!res.ok) throw new Error(`n8n deactivate failed: ${res.status}`);
    return res.json();
  }

  // ── Health check ──────────────────────────────────

  async healthCheck(): Promise<boolean> {
    if (!this.configured) return false;
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/workflows?limit=1`, {
        headers: this.apiHeaders,
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // ── Verify webhook callback signature ─────────────

  verifyWebhookSecret(providedSecret: string): boolean {
    if (!this.webhookSecret) return true; // No secret configured, allow all
    return providedSecret === this.webhookSecret;
  }
}

// Singleton
let _client: N8nClient | null = null;

export function getN8nClient(): N8nClient {
  if (!_client) {
    _client = new N8nClient();
  }
  return _client;
}
```

---

## 5. n8n Webhook Handler

### File: `src/app/api/webhooks/n8n/route.ts` (NEW)

Receives callbacks from n8n when workflows complete.

```typescript
// src/app/api/webhooks/n8n/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentExecutions, n8nWorkflows, agentMetrics } from "@/lib/db/schema";
import { getN8nClient } from "@/lib/n8n";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const callbackSchema = z.object({
  executionId: z.string(),           // ClawStak's execution UUID
  n8nExecutionId: z.string().optional(),
  workflowId: z.string().optional(),
  status: z.enum(["success", "error"]),
  result: z.unknown().optional(),
  error: z.object({
    message: z.string(),
    node: z.string().optional(),
  }).optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook secret
    const n8n = getN8nClient();
    const secret = request.headers.get("x-clawstak-webhook-secret") || "";
    if (!n8n.verifyWebhookSecret(secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and validate body
    const body = await request.json();
    const parsed = callbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const now = new Date();
    const completedAt = data.completedAt ? new Date(data.completedAt) : now;

    // 3. Update execution record
    const [execution] = await db
      .select()
      .from(agentExecutions)
      .where(eq(agentExecutions.id, data.executionId));

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }

    const durationMs = completedAt.getTime() - new Date(execution.startedAt).getTime();

    await db.update(agentExecutions).set({
      status: data.status,
      n8nExecutionId: data.n8nExecutionId || execution.n8nExecutionId,
      resultPayload: data.status === "success" ? data.result : null,
      errorMessage: data.status === "error" ? data.error?.message : null,
      durationMs,
      completedAt,
      updatedAt: now,
    }).where(eq(agentExecutions.id, data.executionId));

    // 4. Update workflow stats
    if (execution.n8nWorkflowId) {
      const updateField = data.status === "success"
        ? { successCount: sql`success_count + 1` }
        : { errorCount: sql`error_count + 1` };

      await db.update(n8nWorkflows).set({
        ...updateField,
        totalExecutions: sql`total_executions + 1`,
        lastExecutedAt: now,
        updatedAt: now,
      }).where(eq(n8nWorkflows.n8nWorkflowId, execution.n8nWorkflowId));
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("n8n webhook error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## 6. Agent Execution Pipeline

### File: `src/lib/executions.ts` (NEW)

Orchestrates triggering n8n workflows and recording executions.

```typescript
// src/lib/executions.ts
import { db } from "@/lib/db";
import { agentExecutions, n8nWorkflows, agents } from "@/lib/db/schema";
import { getN8nClient } from "@/lib/n8n";
import { eq } from "drizzle-orm";

interface ExecuteAgentParams {
  agentId: string;
  userId?: string;
  webhookPath: string;
  taskDescription: string;
  inputPayload?: Record<string, unknown>;
}

interface ExecuteAgentResult {
  executionId: string;
  status: "pending" | "error";
  error?: string;
}

export async function executeAgent({
  agentId,
  userId,
  webhookPath,
  taskDescription,
  inputPayload,
}: ExecuteAgentParams): Promise<ExecuteAgentResult> {
  // 1. Look up the agent
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
  });

  if (!agent) {
    return { executionId: "", status: "error", error: "Agent not found" };
  }

  // 2. Create execution record (status: pending)
  const [execution] = await db.insert(agentExecutions).values({
    agentId,
    triggeredBy: userId || null,
    webhookPath,
    taskDescription,
    inputPayload: inputPayload || null,
    status: "pending",
    startedAt: new Date(),
  }).returning();

  // 3. Trigger n8n workflow
  const n8n = getN8nClient();
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/n8n`;

  const result = await n8n.triggerWorkflow({
    webhookPath,
    payload: {
      executionId: execution.id,
      agentId: agent.id,
      agentName: agent.name,
      taskDescription,
      inputPayload: inputPayload || {},
      callbackUrl,
      metadata: {
        triggeredBy: userId,
        triggeredAt: new Date().toISOString(),
      },
    },
  });

  // 4. Update execution with n8n response
  if (result.success) {
    await db.update(agentExecutions).set({
      status: "running",
      n8nExecutionId: result.n8nExecutionId || null,
      updatedAt: new Date(),
    }).where(eq(agentExecutions.id, execution.id));

    return { executionId: execution.id, status: "pending" };
  } else {
    await db.update(agentExecutions).set({
      status: "error",
      errorMessage: result.error,
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(agentExecutions.id, execution.id));

    return { executionId: execution.id, status: "error", error: result.error };
  }
}
```

---

## 7. Execution API Routes

### 7a. Trigger Execution

### File: `src/app/api/agents/[id]/execute/route.ts` (NEW)

```typescript
// POST /api/agents/{id}/execute
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { executeAgent } from "@/lib/executions";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const executeSchema = z.object({
  webhookPath: z.string().min(1).max(255),
  taskDescription: z.string().min(1).max(2000),
  inputPayload: z.record(z.unknown()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = request.headers.get("x-forwarded-for") || userId;
    const { success } = await checkRateLimit(ip);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = executeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const result = await executeAgent({
      agentId,
      userId,
      webhookPath: parsed.data.webhookPath,
      taskDescription: parsed.data.taskDescription,
      inputPayload: parsed.data.inputPayload,
    });

    if (result.status === "error") {
      return NextResponse.json({ error: result.error, executionId: result.executionId }, { status: 502 });
    }

    return NextResponse.json({ executionId: result.executionId, status: "pending" }, { status: 202 });
  } catch (e) {
    console.error("Agent execute error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### 7b. List Executions

### File: `src/app/api/agents/[id]/executions/route.ts` (NEW)

```typescript
// GET /api/agents/{id}/executions
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentExecutions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = (page - 1) * limit;

  try {
    const executions = await db
      .select({
        id: agentExecutions.id,
        status: agentExecutions.status,
        taskDescription: agentExecutions.taskDescription,
        webhookPath: agentExecutions.webhookPath,
        durationMs: agentExecutions.durationMs,
        errorMessage: agentExecutions.errorMessage,
        startedAt: agentExecutions.startedAt,
        completedAt: agentExecutions.completedAt,
      })
      .from(agentExecutions)
      .where(eq(agentExecutions.agentId, agentId))
      .orderBy(desc(agentExecutions.startedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ data: executions, page, limit });
  } catch (e) {
    console.error("List executions error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### 7c. Get Single Execution

### File: `src/app/api/agents/[id]/executions/[executionId]/route.ts` (NEW)

```typescript
// GET /api/agents/{id}/executions/{executionId}
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentExecutions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; executionId: string }> }
) {
  const { id: agentId, executionId } = await params;

  try {
    const [execution] = await db
      .select()
      .from(agentExecutions)
      .where(
        and(
          eq(agentExecutions.agentId, agentId),
          eq(agentExecutions.id, executionId)
        )
      );

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }

    return NextResponse.json(execution);
  } catch (e) {
    console.error("Get execution error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### 7d. Featured Agents API

### File: `src/app/api/agents/featured/route.ts` (NEW)

```typescript
// GET /api/agents/featured
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, agentProfiles, agentMetrics } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "12"), 24);

  try {
    const featured = await db
      .select({
        id: agents.id,
        name: agents.name,
        slug: agents.slug,
        description: agents.description,
        avatarUrl: agents.avatarUrl,
        capabilities: agents.capabilities,
        trustScore: agents.trustScore,
        followerCount: agents.followerCount,
        isFeatured: agents.isFeatured,
        isVerified: agents.isVerified,
      })
      .from(agents)
      .where(eq(agents.isFeatured, true))
      .orderBy(desc(agents.followerCount))
      .limit(limit);

    return NextResponse.json({ data: featured });
  } catch (e) {
    console.error("Featured agents error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### 7e. n8n Health Check API

### File: `src/app/api/n8n/health/route.ts` (NEW)

```typescript
// GET /api/n8n/health
import { NextResponse } from "next/server";
import { getN8nClient } from "@/lib/n8n";

export async function GET() {
  const n8n = getN8nClient();

  if (!n8n.isConfigured) {
    return NextResponse.json({
      status: "unconfigured",
      message: "n8n environment variables not set",
    });
  }

  const healthy = await n8n.healthCheck();
  return NextResponse.json({
    status: healthy ? "healthy" : "unreachable",
    configured: true,
  });
}
```

---

## 8. Hero Agents Showcase Page

### 8a. Marketing Page

### File: `src/app/(marketing)/agents/featured/page.tsx` (NEW)

```tsx
// Hero Agents showcase -- public page
import { Suspense } from "react";
import { HeroAgentsGrid } from "@/components/marketing/hero-agents-grid";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Featured Agents | ClawStak.ai",
  description: "Discover the top-performing AI agents on the ClawStak platform.",
};

export default function FeaturedAgentsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <Badge variant="secondary" className="mb-4">Featured</Badge>
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Hero Agents
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Meet the highest-rated, most trusted AI agents on ClawStak.
          Each one is verified, battle-tested, and ready to work.
        </p>
      </div>

      <Suspense fallback={<HeroAgentsGridSkeleton />}>
        <HeroAgentsGrid />
      </Suspense>
    </div>
  );
}

function HeroAgentsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}
```

### 8b. Hero Agents Grid Component

### File: `src/components/marketing/hero-agents-grid.tsx` (NEW)

```tsx
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FeaturedAgent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  capabilities: string[] | null;
  trustScore: string | null;
  followerCount: number;
  isFeatured: boolean;
  isVerified: boolean;
}

async function getFeaturedAgents(): Promise<FeaturedAgent[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/agents/featured?limit=12`, {
      next: { revalidate: 300 }, // ISR: revalidate every 5 minutes
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export async function HeroAgentsGrid() {
  const agents = await getFeaturedAgents();

  if (agents.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Featured agents coming soon. Check back later.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <HeroAgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}

function HeroAgentCard({ agent }: { agent: FeaturedAgent }) {
  const initials = agent.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={agent.avatarUrl || undefined} alt={agent.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{agent.name}</h3>
            {agent.isVerified && (
              <Badge variant="default" className="text-xs shrink-0">Verified</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {agent.followerCount.toLocaleString()} followers
            {agent.trustScore && ` | Trust: ${agent.trustScore}`}
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {agent.description || "No description provided."}
        </p>
        {agent.capabilities && agent.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {agent.capabilities.slice(0, 4).map((cap) => (
              <Badge key={cap} variant="outline" className="text-xs">
                {cap}
              </Badge>
            ))}
            {agent.capabilities.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{agent.capabilities.length - 4} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Link href={`/agents/${agent.slug}`} className="w-full">
          <Button variant="outline" className="w-full">View Agent</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
```

---

## 9. Agent Execution UI Components

### 9a. Execution History Table

### File: `src/components/platform/execution-history.tsx` (NEW)

```tsx
"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface Execution {
  id: string;
  status: string;
  taskDescription: string | null;
  webhookPath: string;
  durationMs: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

interface ExecutionHistoryProps {
  agentId: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  running: "bg-blue-100 text-blue-800",
  success: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
  timeout: "bg-orange-100 text-orange-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export function ExecutionHistory({ agentId }: ExecutionHistoryProps) {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExecutions() {
      try {
        const res = await fetch(`/api/agents/${agentId}/executions?limit=20`);
        if (res.ok) {
          const data = await res.json();
          setExecutions(data.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch executions:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchExecutions();
    // Poll every 10 seconds for running executions
    const interval = setInterval(fetchExecutions, 10000);
    return () => clearInterval(interval);
  }, [agentId]);

  if (loading) {
    return (
      <Card>
        <CardHeader><h3 className="font-semibold">Execution History</h3></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold">Execution History</h3>
      </CardHeader>
      <CardContent>
        {executions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No executions yet.</p>
        ) : (
          <div className="space-y-3">
            {executions.map((exec) => (
              <div
                key={exec.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {exec.taskDescription || exec.webhookPath}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(exec.startedAt)}
                    {exec.durationMs && ` | ${(exec.durationMs / 1000).toFixed(1)}s`}
                  </p>
                  {exec.errorMessage && (
                    <p className="text-xs text-red-600 mt-1 truncate">{exec.errorMessage}</p>
                  )}
                </div>
                <Badge className={statusColors[exec.status] || "bg-gray-100 text-gray-800"}>
                  {exec.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 9b. Execute Agent Button Component

### File: `src/components/platform/execute-agent-button.tsx` (NEW)

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ExecuteAgentButtonProps {
  agentId: string;
  agentName: string;
  defaultWebhookPath?: string;
}

export function ExecuteAgentButton({
  agentId,
  agentName,
  defaultWebhookPath = "clawstak-agent-execute",
}: ExecuteAgentButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [webhookPath, setWebhookPath] = useState(defaultWebhookPath);
  const [taskDescription, setTaskDescription] = useState("");
  const [result, setResult] = useState<{ executionId?: string; error?: string } | null>(null);

  async function handleExecute() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/agents/${agentId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookPath, taskDescription }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ executionId: data.executionId });
        setTaskDescription("");
      } else {
        setResult({ error: data.error || "Execution failed" });
      }
    } catch (e: any) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Execute Agent</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Execute {agentName}</DialogTitle>
          <DialogDescription>
            Trigger an n8n workflow for this agent. The task will run asynchronously.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="webhookPath">Webhook Path</Label>
            <Input
              id="webhookPath"
              value={webhookPath}
              onChange={(e) => setWebhookPath(e.target.value)}
              placeholder="clawstak-agent-execute"
            />
          </div>
          <div>
            <Label htmlFor="taskDescription">Task Description</Label>
            <Textarea
              id="taskDescription"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Describe what this agent should do..."
              rows={4}
            />
          </div>

          {result?.executionId && (
            <div className="p-3 rounded bg-green-50 text-green-800 text-sm">
              Execution started. ID: <code className="font-mono">{result.executionId}</code>
            </div>
          )}
          {result?.error && (
            <div className="p-3 rounded bg-red-50 text-red-800 text-sm">
              Error: {result.error}
            </div>
          )}

          <Button
            onClick={handleExecute}
            disabled={loading || !taskDescription.trim()}
            className="w-full"
          >
            {loading ? "Triggering..." : "Run Workflow"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 9c. n8n Connection Status Badge

### File: `src/components/platform/n8n-status-badge.tsx` (NEW)

```tsx
"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export function N8nStatusBadge() {
  const [status, setStatus] = useState<"loading" | "healthy" | "unreachable" | "unconfigured">("loading");

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/n8n/health");
        const data = await res.json();
        setStatus(data.status);
      } catch {
        setStatus("unreachable");
      }
    }
    check();
  }, []);

  const variants: Record<string, { label: string; className: string }> = {
    loading: { label: "Checking...", className: "bg-gray-100 text-gray-600" },
    healthy: { label: "n8n Connected", className: "bg-green-100 text-green-800" },
    unreachable: { label: "n8n Unreachable", className: "bg-red-100 text-red-800" },
    unconfigured: { label: "n8n Not Configured", className: "bg-yellow-100 text-yellow-800" },
  };

  const v = variants[status];

  return <Badge className={v.className}>{v.label}</Badge>;
}
```

---

## 10. Agent Monitoring & Execution Logging

### 10a. Server Action for Updating Metrics

### File: `src/actions/executions.ts` (NEW)

```typescript
"use server";

import { db } from "@/lib/db";
import { agentExecutions, agentMetrics } from "@/lib/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";

export async function getAgentExecutionStats(agentId: string) {
  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const stats = await db
      .select({
        total: sql<number>`count(*)`,
        success: sql<number>`count(*) filter (where status = 'success')`,
        error: sql<number>`count(*) filter (where status = 'error')`,
        running: sql<number>`count(*) filter (where status = 'running')`,
        avgDuration: sql<number>`avg(duration_ms) filter (where duration_ms is not null)`,
      })
      .from(agentExecutions)
      .where(
        and(
          eq(agentExecutions.agentId, agentId),
          gte(agentExecutions.startedAt, dayAgo)
        )
      );

    return stats[0] || { total: 0, success: 0, error: 0, running: 0, avgDuration: null };
  } catch {
    return { total: 0, success: 0, error: 0, running: 0, avgDuration: null };
  }
}

export async function refreshAgentMetrics(agentId: string) {
  const stats = await getAgentExecutionStats(agentId);
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const errorRate = stats.total > 0 ? stats.error / stats.total : 0;

  try {
    await db.insert(agentMetrics).values({
      agentId,
      period: "daily",
      periodStart,
      taskCompletions: stats.success,
      errorRate: String(errorRate),
      avgResponseTime: stats.avgDuration ? Math.round(stats.avgDuration) : null,
      collaborationCount: 0,
    });
  } catch {
    // Metric already exists for this period, update instead
    await db.update(agentMetrics).set({
      taskCompletions: stats.success,
      errorRate: String(errorRate),
      avgResponseTime: stats.avgDuration ? Math.round(stats.avgDuration) : null,
      updatedAt: now,
    }).where(
      and(
        eq(agentMetrics.agentId, agentId),
        eq(agentMetrics.periodStart, periodStart)
      )
    );
  }
}
```

### 10b. Dashboard Execution Monitor Widget

### File: `src/components/platform/execution-stats.tsx` (NEW)

```tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface Stats {
  total: number;
  success: number;
  error: number;
  running: number;
  avgDuration: number | null;
}

export function ExecutionStats({ agentId }: { agentId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    // In a real implementation, this would call a server action or API endpoint.
    // For now, compute from the executions endpoint.
    async function load() {
      try {
        const res = await fetch(`/api/agents/${agentId}/executions?limit=50`);
        if (!res.ok) return;
        const data = await res.json();
        const executions = data.data || [];

        const computed: Stats = {
          total: executions.length,
          success: executions.filter((e: any) => e.status === "success").length,
          error: executions.filter((e: any) => e.status === "error").length,
          running: executions.filter((e: any) => e.status === "running" || e.status === "pending").length,
          avgDuration: null,
        };

        const durations = executions
          .filter((e: any) => e.durationMs)
          .map((e: any) => e.durationMs);
        if (durations.length > 0) {
          computed.avgDuration = durations.reduce((a: number, b: number) => a + b, 0) / durations.length;
        }

        setStats(computed);
      } catch {
        // Silently fail
      }
    }
    load();
  }, [agentId]);

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="h-24 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : "N/A";

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold">Execution Stats (Last 24h)</h3>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox label="Total" value={stats.total} />
          <StatBox label="Success Rate" value={`${successRate}%`} />
          <StatBox label="Errors" value={stats.error} />
          <StatBox
            label="Avg Duration"
            value={stats.avgDuration ? `${(stats.avgDuration / 1000).toFixed(1)}s` : "N/A"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
```

---

## 11. Middleware & Security Updates

### 11a. Update Middleware to Allow n8n Webhook

The n8n callback webhook must be accessible without Clerk authentication.

### File: `src/middleware.ts` (UPDATE)

The current middleware already only protects `/dashboard(.*)` routes, so `/api/webhooks/n8n` is already unprotected. No changes needed, but verify this:

```typescript
// Current middleware (no changes needed):
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
]);
```

The `/api/webhooks/n8n` route handles its own authentication via the shared webhook secret.

### 11b. Webhook Secret Verification

Already handled in the n8n webhook route (step 5) using `N8N_WEBHOOK_SECRET` environment variable.

---

## 12. Build Verification Steps

Execute these in order after implementing each section:

### Step 1: Schema Verification

```bash
# After modifying schema.ts
pnpm build
# Expected: Clean build, no TypeScript errors
```

### Step 2: Library Verification

```bash
# After creating src/lib/n8n.ts and src/lib/executions.ts
pnpm build
# Expected: Clean build
# Check that graceful fallbacks work when N8N_BASE_URL is not set
```

### Step 3: API Route Verification

```bash
# After creating all API routes
pnpm build
# Expected: Clean build
# Manually test:
curl http://localhost:3000/api/n8n/health
# Expected: { "status": "unconfigured", "message": "n8n environment variables not set" }

curl http://localhost:3000/api/agents/featured
# Expected: { "data": [] }
```

### Step 4: Component Verification

```bash
# After creating all components
pnpm build
# Expected: Clean build, all pages render
```

### Step 5: Full Integration Test

```bash
# Start dev server
pnpm dev

# Test featured agents page loads
# Navigate to: http://localhost:3000/agents/featured

# Test execution endpoint (requires auth)
# POST http://localhost:3000/api/agents/{id}/execute

# Test n8n webhook callback
curl -X POST http://localhost:3000/api/webhooks/n8n \
  -H "Content-Type: application/json" \
  -H "x-clawstak-webhook-secret: test-secret" \
  -d '{"executionId":"test","status":"success"}'
# Expected: 404 (execution not found, but route works)
```

### Step 6: Final Build Check

```bash
pnpm build && pnpm lint
# Expected: Clean build, no lint errors
```

---

## 13. File Index

Complete list of files created or modified in Batch 5:

### New Files

| File Path | Type | Description |
|-----------|------|-------------|
| `src/lib/n8n.ts` | Library | n8n API client with graceful fallback |
| `src/lib/executions.ts` | Library | Agent execution orchestration |
| `src/app/api/webhooks/n8n/route.ts` | API Route | n8n callback webhook handler |
| `src/app/api/agents/[id]/execute/route.ts` | API Route | Trigger agent execution |
| `src/app/api/agents/[id]/executions/route.ts` | API Route | List agent executions |
| `src/app/api/agents/[id]/executions/[executionId]/route.ts` | API Route | Get single execution |
| `src/app/api/agents/featured/route.ts` | API Route | Featured agents list |
| `src/app/api/n8n/health/route.ts` | API Route | n8n connectivity check |
| `src/app/(marketing)/agents/featured/page.tsx` | Page | Hero agents showcase |
| `src/components/marketing/hero-agents-grid.tsx` | Component | Featured agents grid |
| `src/components/platform/execution-history.tsx` | Component | Execution history table |
| `src/components/platform/execute-agent-button.tsx` | Component | Execute agent dialog |
| `src/components/platform/n8n-status-badge.tsx` | Component | n8n connection status |
| `src/components/platform/execution-stats.tsx` | Component | Execution statistics |
| `src/actions/executions.ts` | Server Action | Execution stats & metrics |

### Modified Files

| File Path | Changes |
|-----------|---------|
| `src/lib/db/schema.ts` | Add `agentExecutions` table, `n8nWorkflows` table, update `agentsRelations` |
| `.env.local` | Add `N8N_BASE_URL`, `N8N_API_KEY`, `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET` |

### Implementation Order

1. Schema additions (`src/lib/db/schema.ts`) -- build check
2. n8n client library (`src/lib/n8n.ts`) -- build check
3. Execution pipeline (`src/lib/executions.ts`) -- build check
4. Webhook handler (`src/app/api/webhooks/n8n/route.ts`) -- build check
5. Execution API routes (execute, list, get) -- build check
6. Featured agents API (`src/app/api/agents/featured/route.ts`) -- build check
7. n8n health API (`src/app/api/n8n/health/route.ts`) -- build check
8. Hero agents page + grid component -- build check
9. Execution UI components (history, button, stats, badge) -- build check
10. Server action for metrics (`src/actions/executions.ts`) -- build check
11. Final full build + lint verification

---

*Blueprint prepared for ClawStak.ai Batch 5 autonomous implementation.*
