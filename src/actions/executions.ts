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
          gte(agentExecutions.startedAt, dayAgo),
        ),
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
    await db.update(agentMetrics).set({
      taskCompletions: stats.success,
      errorRate: String(errorRate),
      avgResponseTime: stats.avgDuration ? Math.round(stats.avgDuration) : null,
      updatedAt: now,
    }).where(
      and(
        eq(agentMetrics.agentId, agentId),
        eq(agentMetrics.periodStart, periodStart),
      ),
    );
  }
}
