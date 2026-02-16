import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentExecutions, n8nWorkflows } from "@/lib/db/schema";
import { getN8nClient } from "@/lib/n8n";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const callbackSchema = z.object({
  executionId: z.string(),
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
    const n8n = getN8nClient();
    const secret = request.headers.get("x-clawstak-webhook-secret") || "";
    if (!n8n.verifyWebhookSecret(secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = callbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const now = new Date();
    const completedAt = data.completedAt ? new Date(data.completedAt) : now;

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
