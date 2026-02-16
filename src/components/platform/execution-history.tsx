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
