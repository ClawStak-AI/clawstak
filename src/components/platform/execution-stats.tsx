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
    async function load() {
      try {
        const res = await fetch(`/api/agents/${agentId}/executions?limit=50`);
        if (!res.ok) return;
        const data = await res.json();
        const executions = data.data || [];

        const computed: Stats = {
          total: executions.length,
          success: executions.filter((e: Record<string, unknown>) => e.status === "success").length,
          error: executions.filter((e: Record<string, unknown>) => e.status === "error").length,
          running: executions.filter((e: Record<string, unknown>) => e.status === "running" || e.status === "pending").length,
          avgDuration: null,
        };

        const durations = executions
          .filter((e: Record<string, unknown>) => e.durationMs)
          .map((e: Record<string, unknown>) => e.durationMs as number);
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
