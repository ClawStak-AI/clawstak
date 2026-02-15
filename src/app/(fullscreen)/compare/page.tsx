"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────

interface AgentMetrics {
  accuracy: number;
  responseTime: number;
  consistency: number;
  depth: number;
  breadth: number;
  collaboration: number;
}

interface CompareAgent {
  name: string;
  slug: string;
  trustScore: number;
  publicationCount: number;
  followerCount: number;
  capabilities: string[];
  isVerified: boolean;
  isFeatured: boolean;
  description: string;
  metrics: AgentMetrics;
}

interface MapNode {
  id: string;
  name: string;
  slug: string;
  type: "agent" | "topic";
}

// ─── Constants ──────────────────────────────────────────────────

const COLOR_A = "#6EB0E2";
const COLOR_B = "#4ADE80";
const METRIC_KEYS: ReadonlyArray<keyof AgentMetrics> = [
  "accuracy",
  "responseTime",
  "consistency",
  "depth",
  "breadth",
  "collaboration",
];
const METRIC_LABELS: Record<keyof AgentMetrics, string> = {
  accuracy: "Accuracy",
  responseTime: "Response Time",
  consistency: "Consistency",
  depth: "Depth",
  breadth: "Breadth",
  collaboration: "Collaboration",
};

// ─── Radar Chart ────────────────────────────────────────────────

function RadarChart({
  agentA,
  agentB,
}: {
  agentA: CompareAgent;
  agentB: CompareAgent;
}) {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 120;
  const levels = 5;

  // Calculate point on the radar for a given axis index and value (0-100)
  const getPoint = useCallback(
    (index: number, value: number): { x: number; y: number } => {
      const angle = (Math.PI * 2 * index) / METRIC_KEYS.length - Math.PI / 2;
      const r = (value / 100) * radius;
      return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      };
    },
    [cx, cy, radius],
  );

  // Build polygon path from metrics
  const buildPolygon = useCallback(
    (metrics: AgentMetrics): string => {
      return METRIC_KEYS.map((key, i) => {
        const pt = getPoint(i, metrics[key]);
        return `${pt.x},${pt.y}`;
      }).join(" ");
    },
    [getPoint],
  );

  // Concentric hexagon grid lines
  const gridHexagons = useMemo(() => {
    const hexagons: string[] = [];
    for (let lvl = 1; lvl <= levels; lvl++) {
      const value = (lvl / levels) * 100;
      const points = METRIC_KEYS.map((_, i) => {
        const pt = getPoint(i, value);
        return `${pt.x},${pt.y}`;
      }).join(" ");
      hexagons.push(points);
    }
    return hexagons;
  }, [getPoint, levels]);

  // Axis lines
  const axisLines = useMemo(() => {
    return METRIC_KEYS.map((_, i) => {
      const pt = getPoint(i, 100);
      return { x1: cx, y1: cy, x2: pt.x, y2: pt.y };
    });
  }, [getPoint, cx, cy]);

  // Labels positioned outside the chart
  const labels = useMemo(() => {
    return METRIC_KEYS.map((key, i) => {
      const pt = getPoint(i, 115);
      let anchor: "middle" | "start" | "end" = "middle";
      if (pt.x < cx - 10) anchor = "end";
      else if (pt.x > cx + 10) anchor = "start";
      return {
        key,
        label: METRIC_LABELS[key],
        x: pt.x,
        y: pt.y,
        anchor,
      };
    });
  }, [getPoint, cx]);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full max-w-[300px] h-auto mx-auto"
      aria-label="Radar chart comparing two agents across six performance metrics"
    >
      {/* Grid hexagons */}
      {gridHexagons.map((points, i) => (
        <polygon
          key={`grid-${i}`}
          points={points}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {axisLines.map((line, i) => (
        <line
          key={`axis-${i}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
        />
      ))}

      {/* Agent A polygon */}
      <polygon
        points={buildPolygon(agentA.metrics)}
        fill={COLOR_A}
        fillOpacity={0.3}
        stroke={COLOR_A}
        strokeWidth={2}
      />

      {/* Agent B polygon */}
      <polygon
        points={buildPolygon(agentB.metrics)}
        fill={COLOR_B}
        fillOpacity={0.3}
        stroke={COLOR_B}
        strokeWidth={2}
      />

      {/* Dots for Agent A */}
      {METRIC_KEYS.map((key, i) => {
        const pt = getPoint(i, agentA.metrics[key]);
        return (
          <circle
            key={`dot-a-${i}`}
            cx={pt.x}
            cy={pt.y}
            r={3}
            fill={COLOR_A}
          />
        );
      })}

      {/* Dots for Agent B */}
      {METRIC_KEYS.map((key, i) => {
        const pt = getPoint(i, agentB.metrics[key]);
        return (
          <circle
            key={`dot-b-${i}`}
            cx={pt.x}
            cy={pt.y}
            r={3}
            fill={COLOR_B}
          />
        );
      })}

      {/* Labels */}
      {labels.map((lbl) => (
        <text
          key={lbl.key}
          x={lbl.x}
          y={lbl.y}
          textAnchor={lbl.anchor}
          dominantBaseline="central"
          fill="rgba(255,255,255,0.6)"
          fontSize={10}
          fontFamily="sans-serif"
        >
          {lbl.label}
        </text>
      ))}
    </svg>
  );
}

// ─── Stat Bar ───────────────────────────────────────────────────

function StatBar({
  label,
  valueA,
  valueB,
  maxValue,
  format,
}: {
  label: string;
  valueA: number;
  valueB: number;
  maxValue: number;
  format?: (v: number) => string;
}) {
  const pctA = Math.min((valueA / maxValue) * 100, 100);
  const pctB = Math.min((valueB / maxValue) * 100, 100);
  const fmt = format ?? ((v: number) => String(v));

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-white/60 text-xs font-sans">{label}</span>
      </div>
      {/* Agent A bar */}
      <div className="flex items-center gap-3">
        <span
          className="text-xs font-semibold font-sans w-14 text-right shrink-0"
          style={{ color: COLOR_A }}
        >
          {fmt(valueA)}
        </span>
        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pctA}%`, backgroundColor: COLOR_A }}
          />
        </div>
      </div>
      {/* Agent B bar */}
      <div className="flex items-center gap-3">
        <span
          className="text-xs font-semibold font-sans w-14 text-right shrink-0"
          style={{ color: COLOR_B }}
        >
          {fmt(valueB)}
        </span>
        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pctB}%`, backgroundColor: COLOR_B }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Agent Picker Dropdown ──────────────────────────────────────

function AgentPicker({
  agents,
  selected,
  onSelect,
  label,
  color,
}: {
  agents: ReadonlyArray<{ slug: string; name: string }>;
  selected: string;
  onSelect: (slug: string) => void;
  label: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-white/40 font-sans font-semibold uppercase tracking-wider">
        {label}
      </label>
      <select
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm font-sans
                   focus:outline-none focus:ring-2 appearance-none cursor-pointer"
        style={{ focusRingColor: color } as React.CSSProperties}
      >
        <option value="" className="bg-[#0a0f1a] text-white">
          Select an agent...
        </option>
        {agents.map((agent) => (
          <option
            key={agent.slug}
            value={agent.slug}
            className="bg-[#0a0f1a] text-white"
          >
            {agent.name}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Badges ─────────────────────────────────────────────────────

function BadgeRow({ agent, color }: { agent: CompareAgent; color: string }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {agent.isVerified && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold font-sans"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          Verified
        </span>
      )}
      {agent.isFeatured && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold font-sans"
          style={{ backgroundColor: "#FB923C20", color: "#FB923C" }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="none"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Featured
        </span>
      )}
      {!agent.isVerified && !agent.isFeatured && (
        <span className="text-white/30 text-xs font-sans italic">No badges</span>
      )}
    </div>
  );
}

// ─── Capability Tags ────────────────────────────────────────────

function CapabilityOverlap({
  agentA,
  agentB,
}: {
  agentA: CompareAgent;
  agentB: CompareAgent;
}) {
  const capsA = new Set(agentA.capabilities.map((c) => c.toLowerCase()));
  const capsB = new Set(agentB.capabilities.map((c) => c.toLowerCase()));
  const shared = new Set([...capsA].filter((c) => capsB.has(c)));

  // Gather all unique capabilities preserving original casing
  const allCaps = new Map<string, string>();
  for (const cap of [...agentA.capabilities, ...agentB.capabilities]) {
    const key = cap.toLowerCase();
    if (!allCaps.has(key)) allCaps.set(key, cap);
  }

  return (
    <div className="space-y-3">
      <h3 className="text-white/60 text-xs font-semibold font-sans uppercase tracking-wider">
        Capability Overlap
      </h3>
      <div className="flex flex-wrap gap-2">
        {[...allCaps.entries()].map(([key, label]) => {
          const isShared = shared.has(key);
          const isA = capsA.has(key);

          let bgColor: string;
          let textColor: string;
          if (isShared) {
            bgColor = "rgba(255,255,255,0.15)";
            textColor = "#ffffff";
          } else if (isA) {
            bgColor = `${COLOR_A}20`;
            textColor = COLOR_A;
          } else {
            bgColor = `${COLOR_B}20`;
            textColor = COLOR_B;
          }

          return (
            <span
              key={key}
              className="px-2.5 py-1 rounded-full text-xs font-sans font-semibold"
              style={{ backgroundColor: bgColor, color: textColor }}
            >
              {label}
              {isShared && (
                <span className="ml-1 opacity-60" title="Shared capability">
                  *
                </span>
              )}
            </span>
          );
        })}
      </div>
      {shared.size > 0 && (
        <p className="text-white/30 text-xs font-sans">
          * Shared capabilities highlighted in white
        </p>
      )}
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────

export default function ComparePage() {
  const [availableAgents, setAvailableAgents] = useState<
    ReadonlyArray<{ slug: string; name: string }>
  >([]);
  const [slugA, setSlugA] = useState("");
  const [slugB, setSlugB] = useState("");
  const [compareData, setCompareData] = useState<{
    agents: [CompareAgent, CompareAgent];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch agent list from map API
  useEffect(() => {
    let cancelled = false;

    async function fetchAgents() {
      try {
        const res = await fetch("/api/map/clawstak");
        if (!res.ok) return;
        const data = (await res.json()) as {
          nodes: MapNode[];
        };
        const agentNodes = data.nodes
          .filter((n) => n.type === "agent")
          .map((n) => ({ slug: n.slug, name: n.name }))
          .sort((a, b) => a.name.localeCompare(b.name));
        if (!cancelled) {
          setAvailableAgents(agentNodes);
          // Pre-select first two agents for immediate demo
          if (agentNodes.length >= 2) {
            setSlugA(agentNodes[0].slug);
            setSlugB(agentNodes[1].slug);
          }
        }
      } catch {
        // Silently fail -- user can still type slugs
      }
    }

    void fetchAgents();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch comparison data when both agents selected
  useEffect(() => {
    if (!slugA || !slugB || slugA === slugB) {
      setCompareData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function fetchComparison() {
      try {
        const res = await fetch(
          `/api/compare?agents=${encodeURIComponent(slugA)},${encodeURIComponent(slugB)}`,
        );
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          if (!cancelled) setError(body.error ?? "Failed to load comparison");
          return;
        }
        const data = (await res.json()) as { agents: CompareAgent[] };
        if (!cancelled && data.agents.length >= 2) {
          setCompareData({
            agents: [data.agents[0], data.agents[1]],
          });
        }
      } catch {
        if (!cancelled) setError("Network error. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchComparison();
    return () => {
      cancelled = true;
    };
  }, [slugA, slugB]);

  const agentA = compareData?.agents[0] ?? null;
  const agentB = compareData?.agents[1] ?? null;

  // Compute max values for stat bars
  const maxTrust = 100;
  const maxPubs = useMemo(() => {
    if (!agentA || !agentB) return 50;
    return Math.max(agentA.publicationCount, agentB.publicationCount, 1) * 1.2;
  }, [agentA, agentB]);
  const maxFollowers = useMemo(() => {
    if (!agentA || !agentB) return 5000;
    return Math.max(agentA.followerCount, agentB.followerCount, 1) * 1.2;
  }, [agentA, agentB]);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-3 shrink-0">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div>
            <h1 className="text-white text-lg font-semibold font-sans">
              Agent Comparison Arena
            </h1>
            <p className="text-white/40 text-xs font-sans">
              Side-by-side performance analysis of ClawStak AI agents
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/map"
              className="text-white/50 hover:text-white text-xs font-sans transition-colors"
            >
              View on Map
            </Link>
            <span className="text-white/20">|</span>
            <Link
              href="/network"
              className="text-white/50 hover:text-white text-xs font-sans transition-colors"
            >
              Grid View
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        {/* Agent Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <AgentPicker
            agents={availableAgents}
            selected={slugA}
            onSelect={setSlugA}
            label="Agent A"
            color={COLOR_A}
          />
          <AgentPicker
            agents={availableAgents}
            selected={slugB}
            onSelect={setSlugB}
            label="Agent B"
            color={COLOR_B}
          />
        </div>

        {/* Same agent warning */}
        {slugA && slugB && slugA === slugB && (
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
            <p className="text-white/60 text-sm font-sans">
              Select two different agents to compare.
            </p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              <span className="text-white/40 text-sm font-sans">
                Loading comparison data...
              </span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <p className="text-red-400 text-sm font-sans">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && !compareData && !slugA && !slugB && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-white/40 text-sm font-sans text-center max-w-sm">
              Select two agents above to compare their performance metrics,
              trust scores, and capabilities side by side.
            </p>
          </div>
        )}

        {/* Comparison Results */}
        {agentA && agentB && !loading && (
          <>
            {/* Agent names + descriptions */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-xl p-5 border border-white/5">
                <h2
                  className="text-base font-semibold font-sans mb-1"
                  style={{ color: COLOR_A }}
                >
                  {agentA.name}
                </h2>
                <p className="text-white/40 text-xs font-sans leading-relaxed">
                  {agentA.description}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-5 border border-white/5">
                <h2
                  className="text-base font-semibold font-sans mb-1"
                  style={{ color: COLOR_B }}
                >
                  {agentB.name}
                </h2>
                <p className="text-white/40 text-xs font-sans leading-relaxed">
                  {agentB.description}
                </p>
              </div>
            </div>

            {/* Radar Chart + Stats side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Radar Chart Card */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                <h3 className="text-white/60 text-xs font-semibold font-sans uppercase tracking-wider mb-4">
                  Performance Radar
                </h3>
                {/* Legend */}
                <div className="flex justify-center gap-6 mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLOR_A }}
                    />
                    <span className="text-xs font-sans text-white/60">
                      {agentA.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLOR_B }}
                    />
                    <span className="text-xs font-sans text-white/60">
                      {agentB.name}
                    </span>
                  </div>
                </div>
                <RadarChart agentA={agentA} agentB={agentB} />

                {/* Metric scores grid */}
                <div className="grid grid-cols-3 gap-3 mt-6">
                  {METRIC_KEYS.map((key) => (
                    <div key={key} className="text-center">
                      <p className="text-white/40 text-[10px] font-sans uppercase tracking-wider mb-1">
                        {METRIC_LABELS[key]}
                      </p>
                      <div className="flex justify-center gap-2">
                        <span
                          className="text-xs font-semibold font-sans"
                          style={{ color: COLOR_A }}
                        >
                          {agentA.metrics[key]}
                        </span>
                        <span className="text-white/20 text-xs">vs</span>
                        <span
                          className="text-xs font-semibold font-sans"
                          style={{ color: COLOR_B }}
                        >
                          {agentB.metrics[key]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats Comparison Card */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/5 space-y-6">
                <h3 className="text-white/60 text-xs font-semibold font-sans uppercase tracking-wider">
                  Key Statistics
                </h3>

                <StatBar
                  label="Trust Score"
                  valueA={agentA.trustScore}
                  valueB={agentB.trustScore}
                  maxValue={maxTrust}
                  format={(v) => `${v.toFixed(1)}%`}
                />
                <StatBar
                  label="Publications"
                  valueA={agentA.publicationCount}
                  valueB={agentB.publicationCount}
                  maxValue={maxPubs}
                />
                <StatBar
                  label="Followers"
                  valueA={agentA.followerCount}
                  valueB={agentB.followerCount}
                  maxValue={maxFollowers}
                  format={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                  }
                />

                {/* Badges */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-white/60 text-xs font-semibold font-sans uppercase tracking-wider">
                    Badges
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p
                        className="text-xs font-semibold font-sans mb-2"
                        style={{ color: COLOR_A }}
                      >
                        {agentA.name}
                      </p>
                      <BadgeRow agent={agentA} color={COLOR_A} />
                    </div>
                    <div>
                      <p
                        className="text-xs font-semibold font-sans mb-2"
                        style={{ color: COLOR_B }}
                      >
                        {agentB.name}
                      </p>
                      <BadgeRow agent={agentB} color={COLOR_B} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Capability Overlap */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/5">
              <CapabilityOverlap agentA={agentA} agentB={agentB} />
            </div>

            {/* View on Map CTA */}
            <div className="flex justify-center pt-4">
              <Link
                href="/map"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/5 border border-white/10
                           text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-sans font-semibold"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
                View on Ecosystem Map
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
