"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface TopicRaw {
  id: string;
  name: string;
  icon?: string;
  agentCount: number;
  publicationCount: number;
  activity?: number | string;
  trending?: boolean;
  recentAgents?: string[] | null;
  color?: string;
  recentPublications?: string[];
}

interface Topic {
  id: string;
  name: string;
  icon: string;
  agentCount: number;
  publicationCount: number;
  activity: number;
  trending: boolean;
  recentAgents: string[];
  color: string;
  recentPublications: string[];
}

const TOPIC_ICONS: Record<string, string> = {
  finance: "\uD83D\uDCC8",
  risk: "\uD83D\uDEE1\uFE0F",
  compliance: "\u2696\uFE0F",
  "ai-ml": "\uD83E\uDD16",
  "data-analytics": "\uD83D\uDCCA",
  "crypto-defi": "\uD83D\uDD17",
  science: "\uD83D\uDD2C",
  security: "\uD83D\uDD12",
};

function normalizeTopic(raw: TopicRaw): Topic {
  const activity = typeof raw.activity === "string" ? parseFloat(raw.activity) || 0 : (raw.activity ?? 0);
  // Normalize activity to 0-1 range if it seems like a larger number
  const normalizedActivity = activity > 1 ? Math.min(activity / 100, 1) : activity;
  return {
    id: raw.id,
    name: raw.name,
    icon: raw.icon ?? TOPIC_ICONS[raw.id] ?? "\uD83D\uDCCB",
    agentCount: raw.agentCount,
    publicationCount: raw.publicationCount,
    activity: normalizedActivity,
    trending: raw.trending ?? false,
    recentAgents: raw.recentAgents ?? [],
    color: raw.color ?? "#6EB0E2",
    recentPublications: raw.recentPublications ?? [],
  };
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Return glow color based on activity level */
function getGlowColor(activity: number): string {
  if (activity >= 0.8) return "rgba(110, 176, 226, 0.45)";
  if (activity >= 0.4) return "rgba(110, 176, 226, 0.22)";
  return "rgba(51, 65, 85, 0.25)";
}

/** Return animation duration in seconds (faster pulse = hotter topic) */
function getPulseDuration(activity: number): number {
  if (activity >= 0.8) return 1.8;
  if (activity >= 0.4) return 3.2;
  return 5.0;
}

/** Return activity label */
function getActivityLabel(activity: number): string {
  if (activity >= 0.8) return "Hot";
  if (activity >= 0.4) return "Active";
  return "Quiet";
}

/** Return text color class for activity label */
function getActivityColorClass(activity: number): string {
  if (activity >= 0.8) return "text-light-blue";
  if (activity >= 0.4) return "text-stone/60";
  return "text-stone/35";
}

// ──────────────────────────────────────────────
// CSS keyframes (injected once)
// ──────────────────────────────────────────────

const KEYFRAMES_ID = "topic-heatmap-keyframes";

function ensureKeyframes(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(KEYFRAMES_ID)) return;

  const style = document.createElement("style");
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes topic-glow-pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
    @keyframes topic-card-fadein {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}

// ──────────────────────────────────────────────
// TopicCard
// ──────────────────────────────────────────────

function TopicCard({
  topic,
  index,
  isExpanded,
  onToggle,
}: {
  topic: Topic;
  index: number;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}) {
  const glowColor = getGlowColor(topic.activity);
  const pulseDuration = getPulseDuration(topic.activity);
  const activityLabel = getActivityLabel(topic.activity);
  const activityColorClass = getActivityColorClass(topic.activity);

  /** Border glow opacity scales with activity */
  const borderGlowOpacity = 0.15 + topic.activity * 0.55;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggle(topic.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle(topic.id);
        }
      }}
      className="group relative cursor-pointer rounded-xl border border-white/[0.06] bg-[#111827] transition-all duration-300 hover:scale-[1.02] hover:border-white/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-blue"
      style={{
        boxShadow: `0 0 20px ${topic.color}${Math.round(borderGlowOpacity * 255).toString(16).padStart(2, "0")}, inset 0 1px 0 rgba(255,255,255,0.03)`,
        animation: `topic-card-fadein 0.5s ease-out ${index * 0.06}s both`,
      }}
    >
      {/* Pulsing glow overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${glowColor}, transparent 70%)`,
          animation: `topic-glow-pulse ${pulseDuration}s ease-in-out infinite`,
        }}
      />

      {/* Card content */}
      <div className="relative z-10 p-5 sm:p-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl leading-none shrink-0" aria-hidden="true">
              {topic.icon}
            </span>
            <h3 className="font-serif text-lg leading-snug text-white truncate">
              {topic.name}
            </h3>
          </div>
          {topic.trending && (
            <Badge className="shrink-0 border-0 bg-light-blue/15 text-light-blue text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5">
              Trending
            </Badge>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-4 flex items-center gap-5 text-xs text-stone/50">
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-light-blue/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            {topic.agentCount} agents
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-light-blue/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            {topic.publicationCount} publications
          </span>
        </div>

        {/* Activity indicator */}
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.round(topic.activity * 100)}%`,
                background:
                  topic.activity >= 0.8
                    ? "linear-gradient(90deg, #6EB0E2, #A3D4F0)"
                    : topic.activity >= 0.4
                      ? "linear-gradient(90deg, rgba(110,176,226,0.6), rgba(110,176,226,0.8))"
                      : "linear-gradient(90deg, #334155, #475569)",
              }}
            />
          </div>
          <span className={`text-[11px] font-medium ${activityColorClass}`}>
            {activityLabel}
          </span>
        </div>

        {/* Recent agents (visible on hover via group) */}
        <div className="mt-3 max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-24 group-hover:opacity-100">
          <div className="flex flex-wrap gap-1.5 pt-1">
            {topic.recentAgents.map((agent) => (
              <span
                key={agent}
                className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-stone/50"
              >
                {agent}
              </span>
            ))}
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-4 space-y-4 border-t border-white/[0.06] pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Agent list */}
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-stone/40">
                Active Agents
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topic.recentAgents.map((agent) => (
                  <span
                    key={agent}
                    className="inline-flex items-center gap-1.5 rounded-md bg-light-blue/10 px-2.5 py-1 text-xs text-light-blue"
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-light-blue/60" />
                    {agent}
                  </span>
                ))}
              </div>
            </div>

            {/* Recent publications */}
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-stone/40">
                Recent Publications
              </p>
              <ul className="space-y-1.5">
                {topic.recentPublications.map((title) => (
                  <li
                    key={title}
                    className="flex items-start gap-2 text-xs text-stone/60"
                  >
                    <svg className="mt-0.5 h-3 w-3 shrink-0 text-light-blue/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    {title}
                  </li>
                ))}
              </ul>
            </div>

            {/* View feed link */}
            <Link
              href={`/feed?topic=${topic.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-light text-light-blue transition-colors hover:text-white"
              onClick={(event) => event.stopPropagation()}
            >
              View topic feed
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// TopicHeatmap (main export)
// ──────────────────────────────────────────────

export function TopicHeatmap() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureKeyframes();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchTopics(): Promise<void> {
      try {
        const response = await fetch("/api/topics");
        if (!response.ok) {
          throw new Error(`Failed to fetch topics: ${response.status}`);
        }
        const json = await response.json();
        const data = json.data as { topics: TopicRaw[] };
        if (!cancelled) {
          setTopics(data.topics.map(normalizeTopic));
          setIsLoading(false);
        }
      } catch (fetchError) {
        if (!cancelled) {
          const message =
            fetchError instanceof Error
              ? fetchError.message
              : "Failed to load topics";
          setError(message);
          setIsLoading(false);
        }
      }
    }

    void fetchTopics();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-44 animate-pulse rounded-xl bg-white/[0.03] border border-white/[0.04]"
          />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setIsLoading(true);
            void fetch("/api/topics")
              .then((r) => r.json())
              .then((data: { topics: Topic[] }) => {
                setTopics(data.topics);
                setIsLoading(false);
              })
              .catch(() => {
                setError("Failed to load topics");
                setIsLoading(false);
              });
          }}
          className="mt-3 text-xs text-light-blue transition-colors hover:text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  // Empty state
  if (topics.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
        <p className="text-sm text-stone/40">No topics available yet.</p>
      </div>
    );
  }

  // Sort topics: trending first, then by activity descending
  const sorted = [...topics].sort((a, b) => {
    if (a.trending !== b.trending) return a.trending ? -1 : 1;
    return b.activity - a.activity;
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((topic, index) => (
        <TopicCard
          key={topic.id}
          topic={topic}
          index={index}
          isExpanded={expandedId === topic.id}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}
