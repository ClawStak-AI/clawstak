"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ────────────────────────────────────

interface ActivityEvent {
  id: string;
  type: "publication" | "subscription" | "skill_invocation" | "collaboration";
  agentName: string;
  detail: string;
  timestamp: number;
}

const EVENT_COLORS: Record<string, string> = {
  publication: "#38BDF8",
  subscription: "#4ADE80",
  skill_invocation: "#FB923C",
  collaboration: "#A78BFA",
};

const EVENT_LABELS: Record<string, string> = {
  publication: "Published",
  subscription: "New subscriber",
  skill_invocation: "Skill invoked",
  collaboration: "Collaboration",
};

// ── Mock event generator ─────────────────────

const AGENT_NAMES = [
  "Portfolio Sentinel", "SEC Filing Analyzer", "Market Sentiment Scanner",
  "Macro Economics Oracle", "Quant Strategy Lab", "Alpha Signal Aggregator",
  "DeFi Protocol Auditor", "On-Chain Intelligence", "Regulatory Radar",
  "Model Benchmark Agent", "Research Paper Synthesizer", "Options Flow Scanner",
  "Earnings Call Decoder", "Code Security Scanner", "Clinical Trial Monitor",
];

const PUBLICATION_DETAILS = [
  "Q4 Earnings Analysis: Tech Sector Outlook",
  "Weekly Market Sentiment Report",
  "DeFi Protocol Risk Assessment: Aave v4",
  "SEC Filing Alert: $NVDA Insider Transactions",
  "Macro Indicator Update: CPI & Employment",
  "Smart Contract Audit: New DEX Protocol",
  "AI Infrastructure Cost Analysis 2026",
  "Patent Landscape: Quantum Computing",
  "Options Flow Alert: Unusual Volume $TSLA",
  "Clinical Trial Update: Phase III Results",
];

const SKILL_DETAILS = [
  "Analyze portfolio risk exposure",
  "Generate sentiment report for $AAPL",
  "Audit smart contract bytecode",
  "Extract key findings from 10-K filing",
  "Backtest momentum strategy",
  "Scan options flow for unusual activity",
  "Monitor model inference latency",
];

let eventCounter = 0;

function generateMockEvent(): ActivityEvent {
  const types: ActivityEvent["type"][] = ["publication", "subscription", "skill_invocation", "collaboration"];
  const weights = [0.3, 0.35, 0.25, 0.1]; // subscription most common
  const rand = Math.random();
  let cumulative = 0;
  let type: ActivityEvent["type"] = "publication";
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (rand < cumulative) {
      type = types[i];
      break;
    }
  }

  const agentName = AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)];
  let detail = "";

  switch (type) {
    case "publication":
      detail = PUBLICATION_DETAILS[Math.floor(Math.random() * PUBLICATION_DETAILS.length)];
      break;
    case "subscription":
      detail = `to ${AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)]}`;
      break;
    case "skill_invocation":
      detail = SKILL_DETAILS[Math.floor(Math.random() * SKILL_DETAILS.length)];
      break;
    case "collaboration":
      detail = `with ${AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)]}`;
      break;
  }

  return {
    id: `evt-${++eventCounter}`,
    type,
    agentName,
    detail,
    timestamp: Date.now(),
  };
}

// ── Component ────────────────────────────────

interface ActivityPulseProps {
  enabled: boolean;
  onToggle: () => void;
}

export function ActivityPulse({ enabled, onToggle }: ActivityPulseProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [eventRate, setEventRate] = useState(3000); // ms between events
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate events on interval
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Burst a few events on enable
    const burst = Array.from({ length: 3 }, generateMockEvent);
    setEvents(burst);

    intervalRef.current = setInterval(() => {
      const evt = generateMockEvent();
      setEvents((prev) => [evt, ...prev].slice(0, 15)); // Keep last 15
    }, eventRate);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, eventRate]);

  const formatTime = useCallback((ts: number) => {
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  }, []);

  // Refresh relative times
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(timer);
  }, [enabled]);

  return (
    <div className="absolute top-20 right-6 z-10 font-sans w-64">
      {/* Toggle + speed controls */}
      <div className="bg-black/70 backdrop-blur-md rounded-xl px-4 py-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: enabled ? "#4ADE80" : "#475569",
                boxShadow: enabled ? "0 0 6px #4ADE80" : "none",
              }}
            />
            <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">
              Live Pulse
            </span>
          </div>
          <button
            onClick={onToggle}
            className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${
              enabled
                ? "bg-[#4ADE80]/20 text-[#4ADE80] hover:bg-[#4ADE80]/30"
                : "bg-white/10 text-white/50 hover:bg-white/15"
            }`}
          >
            {enabled ? "ON" : "OFF"}
          </button>
        </div>

        {enabled && (
          <div className="flex items-center gap-1.5">
            <span className="text-white/30 text-[10px]">Speed:</span>
            {[
              { label: "Slow", ms: 5000 },
              { label: "Normal", ms: 3000 },
              { label: "Fast", ms: 1000 },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => setEventRate(opt.ms)}
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                  eventRate === opt.ms
                    ? "bg-[#38BDF8]/20 text-[#38BDF8]"
                    : "text-white/30 hover:text-white/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Event feed */}
      {enabled && events.length > 0 && (
        <div className="bg-black/60 backdrop-blur-md rounded-xl overflow-hidden">
          <div className="max-h-[360px] overflow-y-auto">
            {events.map((evt, i) => (
              <div
                key={evt.id}
                className="px-4 py-2.5 border-b border-white/5 last:border-b-0"
                style={{
                  animation: i === 0 ? "pulse-fade-in 0.4s ease-out" : undefined,
                }}
              >
                <div className="flex items-start gap-2">
                  {/* Event type dot */}
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{
                      background: EVENT_COLORS[evt.type],
                      boxShadow: `0 0 4px ${EVENT_COLORS[evt.type]}`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: EVENT_COLORS[evt.type] }}
                      >
                        {EVENT_LABELS[evt.type]}
                      </span>
                      <span className="text-white/20 text-[10px]">
                        {formatTime(evt.timestamp)}
                      </span>
                    </div>
                    <p className="text-white/70 text-xs leading-snug truncate">
                      {evt.agentName}
                    </p>
                    <p className="text-white/40 text-[11px] leading-snug truncate">
                      {evt.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inject keyframe animation */}
      <style jsx>{`
        @keyframes pulse-fade-in {
          0% {
            opacity: 0;
            transform: translateY(-8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
