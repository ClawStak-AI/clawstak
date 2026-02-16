"use client";

import { useState, useEffect, useCallback } from "react";

interface AgentInfo {
  id: string;
  role: string;
  name: string;
  busy: boolean;
}

interface TaskInfo {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  assignedTo?: string;
  createdAt?: number;
  updatedAt?: number;
  result?: {
    success?: boolean;
    summary?: string;
    errors?: string[];
  };
}

interface Snapshot {
  loop: {
    status: string;
    iteration: number;
    snapshot: {
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
      failed: number;
    };
  };
  agents: AgentInfo[];
  tasks: TaskInfo[];
  memory: { total: number };
}

const ROLE_ICONS: Record<string, string> = {
  coordinator: "C",
  researcher: "R",
  coder: "</>",
  reviewer: "RV",
  scout: "SC",
  healer: "H",
  planner: "PL",
  deployer: "D",
  comms: "CM",
  personal_ea: "EA",
  personal_assistant: "PA",
};

const ROLE_COLORS: Record<string, string> = {
  coordinator: "from-violet-500 to-purple-600",
  researcher: "from-blue-500 to-cyan-600",
  coder: "from-emerald-500 to-green-600",
  reviewer: "from-amber-500 to-orange-600",
  scout: "from-cyan-500 to-teal-600",
  healer: "from-rose-500 to-pink-600",
  planner: "from-indigo-500 to-blue-600",
  deployer: "from-orange-500 to-red-600",
  comms: "from-sky-500 to-blue-600",
  personal_ea: "from-fuchsia-500 to-purple-600",
  personal_assistant: "from-pink-500 to-rose-600",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400",
  inProgress: "text-blue-400",
  in_progress: "text-blue-400",
  completed: "text-emerald-400",
  failed: "text-red-400",
};

function formatTime(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function timeAgo(ts?: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

export function AgentCommandCenter() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loopStatus, setLoopStatus] = useState<string>("unknown");
  const [provider, setProvider] = useState<string>("unknown");
  const [error, setError] = useState<string | null>(null);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDesc, setGoalDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [snapshotRes, healthRes] = await Promise.all([
        fetch("/api/openclaw?action=snapshot"),
        fetch("/api/openclaw?action=health"),
      ]);

      if (snapshotRes.ok) {
        const data = await snapshotRes.json();
        setSnapshot(data);
        setError(null);
      }

      if (healthRes.ok) {
        const health = await healthRes.json();
        setLoopStatus(health.loopStatus ?? health.status ?? "unknown");
        setProvider(health.provider ?? "unknown");
      }

      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleLoopAction(action: string) {
    await fetch(`/api/openclaw?action=${action}`, { method: "POST" });
    setTimeout(fetchData, 1000);
  }

  async function handleSubmitGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/openclaw?action=goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: goalTitle,
          description: goalDesc,
          priority: "critical",
        }),
      });
      setGoalTitle("");
      setGoalDesc("");
      setTimeout(fetchData, 1000);
    } finally {
      setSubmitting(false);
    }
  }

  const stats = snapshot?.loop?.snapshot ?? {
    total: 0, pending: 0, inProgress: 0, completed: 0, failed: 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Top stats row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Loop Status" value={loopStatus} color={loopStatus === "running" ? "text-emerald-400" : "text-yellow-400"} />
        <StatCard label="Iteration" value={snapshot?.loop?.iteration?.toString() ?? "—"} color="text-white" />
        <StatCard label="Tasks Total" value={stats.total.toString()} color="text-white" />
        <StatCard label="In Progress" value={stats.inProgress.toString()} color="text-blue-400" />
        <StatCard label="Completed" value={stats.completed.toString()} color="text-emerald-400" />
        <StatCard label="Provider" value={provider} color="text-cyan-400" />
      </div>

      {/* Loop controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleLoopAction("start")}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Start Loop
        </button>
        <button
          onClick={() => handleLoopAction("pause")}
          className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Pause
        </button>
        <button
          onClick={() => handleLoopAction("stop")}
          className="bg-red-600 hover:bg-red-500 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Stop
        </button>
        <button
          onClick={fetchData}
          className="bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium px-4 py-2 rounded-lg transition-colors ml-auto"
        >
          Refresh
        </button>
        {lastRefresh && (
          <span className="text-white/30 text-xs">
            {lastRefresh.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Fleet */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-white/80 text-sm font-semibold uppercase tracking-wider">
            Agent Fleet ({snapshot?.agents?.length ?? 0})
          </h2>
          <div className="space-y-2">
            {(snapshot?.agents ?? []).map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>

        {/* Task Queue & Activity */}
        <div className="lg:col-span-2 space-y-4">
          {/* Goal submission */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
            <h2 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">
              Submit Goal
            </h2>
            <form onSubmit={handleSubmitGoal} className="space-y-3">
              <input
                type="text"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="Goal title..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
              />
              <textarea
                value={goalDesc}
                onChange={(e) => setGoalDesc(e.target.value)}
                placeholder="Description (optional)..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 resize-none"
              />
              <button
                type="submit"
                disabled={submitting || !goalTitle.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {submitting ? "Submitting..." : "Submit Goal"}
              </button>
            </form>
          </div>

          {/* Task list */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
            <h2 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">
              Tasks ({snapshot?.tasks?.length ?? 0})
            </h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {(snapshot?.tasks ?? []).length === 0 && (
                <p className="text-white/30 text-sm">No tasks yet. Submit a goal to get started.</p>
              )}
              {(snapshot?.tasks ?? [])
                .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
                .map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
      <div className="text-white/40 text-[10px] uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-semibold ${color} mt-1 capitalize`}>{value}</div>
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentInfo }) {
  const gradient = ROLE_COLORS[agent.role] ?? "from-gray-500 to-gray-600";
  const icon = ROLE_ICONS[agent.role] ?? "?";
  const shortName = agent.name || agent.id.replace(/^railway-/, "");

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium capitalize truncate">
          {shortName}
        </div>
        <div className="text-white/40 text-xs capitalize">{agent.role.replace(/_/g, " ")}</div>
      </div>
      <div className={`w-2 h-2 rounded-full shrink-0 ${agent.busy ? "bg-blue-400 animate-pulse" : "bg-emerald-500"}`} />
    </div>
  );
}

function TaskCard({ task }: { task: TaskInfo }) {
  const statusColor = STATUS_COLORS[task.status] ?? "text-white/50";
  const hasErrors = task.result?.errors && task.result.errors.length > 0;
  const isAuthError = hasErrors && task.result?.errors?.some((e) => e.includes("401") || e.includes("authentication_error"));

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-lg px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-medium truncate">{task.title}</div>
          {task.assignedTo && (
            <div className="text-white/40 text-xs mt-1">
              Assigned to: <span className="text-cyan-400">{task.assignedTo.replace(/^railway-/, "")}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium uppercase ${statusColor}`}>
            {task.status.replace(/_/g, " ")}
          </span>
          {task.updatedAt && (
            <span className="text-white/20 text-[10px]">{timeAgo(task.updatedAt)}</span>
          )}
        </div>
      </div>
      {isAuthError && (
        <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded px-2 py-1 text-red-400 text-xs">
          Auth error — API key expired. Waiting for OpenRouter fallback deploy...
        </div>
      )}
      {task.result?.summary && !isAuthError && (
        <div className="mt-2 text-white/30 text-xs line-clamp-2">{task.result.summary}</div>
      )}
    </div>
  );
}
