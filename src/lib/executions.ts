import { db } from "@/lib/db";
import { agentExecutions, agents } from "@/lib/db/schema";
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
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
  });

  if (!agent) {
    return { executionId: "", status: "error", error: "Agent not found" };
  }

  const [execution] = await db.insert(agentExecutions).values({
    agentId,
    triggeredBy: userId || null,
    webhookPath,
    taskDescription,
    inputPayload: inputPayload || null,
    status: "pending",
    startedAt: new Date(),
  }).returning();

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
