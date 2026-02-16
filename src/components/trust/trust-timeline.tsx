"use client";

import { useState, useRef, useEffect, useMemo, type JSX } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type TrustEventType =
  | "milestone"
  | "publication"
  | "accuracy"
  | "endorsement"
  | "report"
  | "engagement";

interface TrustEvent {
  date: string;
  score: number;
  event: string;
  type: TrustEventType;
  delta: number;
}

interface TrustAgent {
  name: string;
  slug: string;
  trustScore: number;
  isVerified: boolean;
}

interface TrustTimelineProps {
  agent: TrustAgent;
  timeline: TrustEvent[];
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const EVENT_COLORS: Record<TrustEventType, string> = {
  milestone: "#A78BFA",
  publication: "#38BDF8",
  accuracy: "#4ADE80",
  endorsement: "#38BDF8",
  report: "#F87171",
  engagement: "#FB923C",
};

const EVENT_LABELS: Record<TrustEventType, string> = {
  milestone: "Milestone",
  publication: "Publication",
  accuracy: "Accuracy",
  endorsement: "Endorsement",
  report: "Report",
  engagement: "Engagement",
};

// SVG chart dimensions (viewBox-based)
const VB_WIDTH = 800;
const VB_HEIGHT = 300;
const PADDING_LEFT = 50;
const PADDING_RIGHT = 80;
const PADDING_TOP = 30;
const PADDING_BOTTOM = 40;
const CHART_WIDTH = VB_WIDTH - PADDING_LEFT - PADDING_RIGHT;
const CHART_HEIGHT = VB_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
const SCORE_MIN = 60;
const SCORE_MAX = 100;

// ──────────────────────────────────────────────
// Utility: compute SVG path coordinates
// ──────────────────────────────────────────────

interface Point {
  x: number;
  y: number;
  event: TrustEvent;
  index: number;
}

function computePoints(timeline: TrustEvent[]): Point[] {
  if (timeline.length === 0) return [];

  const dates = timeline.map((e) => new Date(e.date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const dateRange = maxDate - minDate || 1;

  return timeline.map((event, index) => {
    const t = (new Date(event.date).getTime() - minDate) / dateRange;
    const scoreNorm = (event.score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);

    return {
      x: PADDING_LEFT + t * CHART_WIDTH,
      y: PADDING_TOP + (1 - scoreNorm) * CHART_HEIGHT,
      event,
      index,
    };
  });
}

/**
 * Build a smooth cubic bezier SVG path through the given points.
 * Uses Catmull-Rom to Bezier conversion for smooth curves.
 */
function buildSmoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Catmull-Rom tangents scaled by 1/6
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

/**
 * Build a closed path for the gradient fill area below the line.
 */
function buildAreaPath(points: Point[], linePath: string): string {
  if (points.length === 0) return "";
  const bottomY = PADDING_TOP + CHART_HEIGHT;
  const first = points[0];
  const last = points[points.length - 1];

  return `${linePath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
}

// ──────────────────────────────────────────────
// Y-axis grid lines
// ──────────────────────────────────────────────

function renderYAxis(): JSX.Element[] {
  const ticks = [60, 70, 80, 90, 100];
  return ticks.map((score) => {
    const scoreNorm = (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
    const y = PADDING_TOP + (1 - scoreNorm) * CHART_HEIGHT;
    return (
      <g key={score}>
        <line
          x1={PADDING_LEFT}
          y1={y}
          x2={PADDING_LEFT + CHART_WIDTH}
          y2={y}
          stroke="#ffffff10"
          strokeWidth={0.5}
        />
        <text
          x={PADDING_LEFT - 8}
          y={y + 4}
          textAnchor="end"
          fill="#ffffff50"
          fontSize={10}
          fontFamily="sans-serif"
        >
          {score}
        </text>
      </g>
    );
  });
}

// ──────────────────────────────────────────────
// X-axis month labels
// ──────────────────────────────────────────────

function renderXAxis(timeline: TrustEvent[]): JSX.Element[] {
  if (timeline.length === 0) return [];

  const dates = timeline.map((e) => new Date(e.date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const dateRange = maxDate - minDate || 1;

  // Generate monthly labels
  const startMonth = new Date(minDate);
  startMonth.setDate(1);
  const endMonth = new Date(maxDate);

  const labels: JSX.Element[] = [];
  const current = new Date(startMonth);

  while (current <= endMonth) {
    const t = (current.getTime() - minDate) / dateRange;
    if (t >= 0 && t <= 1) {
      const x = PADDING_LEFT + t * CHART_WIDTH;
      const label = current.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      labels.push(
        <text
          key={current.toISOString()}
          x={x}
          y={PADDING_TOP + CHART_HEIGHT + 20}
          textAnchor="middle"
          fill="#ffffff40"
          fontSize={9}
          fontFamily="sans-serif"
        >
          {label}
        </text>,
      );
    }
    current.setMonth(current.getMonth() + 1);
  }

  return labels;
}

// ──────────────────────────────────────────────
// Tooltip component
// ──────────────────────────────────────────────

interface TooltipData {
  point: Point;
  screenX: number;
  screenY: number;
}

function EventTooltip({ point }: { point: Point }) {
  const { event } = point;
  const color = EVENT_COLORS[event.type];
  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="pointer-events-none absolute z-50 w-64 rounded-lg border border-white/10 bg-[#111827] p-3 shadow-xl">
      <div className="mb-1 flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs font-medium" style={{ color }}>
          {EVENT_LABELS[event.type]}
        </span>
      </div>
      <p className="text-sm font-medium text-white/90">{event.event}</p>
      <div className="mt-1.5 flex items-center gap-3 text-xs text-white/50">
        <span>{formattedDate}</span>
        <span>Score: {event.score}</span>
        {event.delta !== 0 && (
          <span className={event.delta > 0 ? "text-green-400" : "text-red-400"}>
            {event.delta > 0 ? "+" : ""}
            {event.delta}
          </span>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export function TrustTimeline({ agent, timeline }: TrustTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);
  const [isAnimated, setIsAnimated] = useState(false);

  const points = useMemo(() => computePoints(timeline), [timeline]);
  const linePath = useMemo(() => buildSmoothPath(points), [points]);
  const areaPath = useMemo(() => buildAreaPath(points, linePath), [points, linePath]);

  // Trigger draw animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Compute approximate path length for stroke animation
  const pathLength = useMemo(() => {
    if (points.length < 2) return 0;
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return Math.ceil(length * 1.3); // Extra margin for curves
  }, [points]);

  function handleDotHover(index: number, svgEvent: React.MouseEvent<SVGCircleElement>) {
    setHoveredIndex(index);

    if (!containerRef.current || !svgRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const svgRect = svgRef.current.getBoundingClientRect();
    const point = points[index];

    // Map SVG viewBox coordinates to screen coordinates
    const scaleX = svgRect.width / VB_WIDTH;
    const scaleY = svgRect.height / VB_HEIGHT;
    const screenX = svgRect.left + point.x * scaleX - containerRect.left;
    const screenY = svgRect.top + point.y * scaleY - containerRect.top;

    // Position tooltip above the dot, centered, but clamped to container
    let left = screenX - 128; // half of tooltip width (w-64 = 256px)
    const top = screenY - 120;

    // Clamp horizontal
    if (left < 0) left = 0;
    if (left > containerRect.width - 256) left = containerRect.width - 256;

    setTooltipPos({ left, top });
  }

  function handleDotLeave() {
    setHoveredIndex(null);
    setTooltipPos(null);
  }

  return (
    <div className="space-y-8">
      {/* ── SVG Chart ── */}
      <div
        ref={containerRef}
        className="relative rounded-xl border border-white/5 bg-[#0a0f1a] p-4 sm:p-6"
      >
        {/* Current trust score overlay */}
        <div className="absolute right-6 top-6 z-10 text-right sm:right-10 sm:top-8">
          <div className="text-xs font-medium uppercase tracking-wider text-white/40">
            Trust Score
          </div>
          <div className="text-5xl font-bold tabular-nums text-white sm:text-6xl">
            {agent.trustScore}
          </div>
          {agent.isVerified && (
            <div className="mt-1 flex items-center justify-end gap-1 text-xs text-green-400">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                  clipRule="evenodd"
                />
              </svg>
              Verified
            </div>
          )}
        </div>

        {/* Tooltip */}
        {hoveredIndex !== null && tooltipPos && (
          <div
            className="absolute z-50"
            style={{ left: tooltipPos.left, top: tooltipPos.top }}
          >
            <EventTooltip point={points[hoveredIndex]} />
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Gradient fill below the line */}
            <linearGradient id="trustAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Y-axis grid */}
          {renderYAxis()}

          {/* X-axis labels */}
          {renderXAxis(timeline)}

          {/* Area fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#trustAreaGradient)"
              className="transition-opacity duration-1000"
              style={{ opacity: isAnimated ? 1 : 0 }}
            />
          )}

          {/* Main line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#38BDF8"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: pathLength,
                strokeDashoffset: isAnimated ? 0 : pathLength,
                transition: "stroke-dashoffset 2s ease-out",
              }}
            />
          )}

          {/* Data points */}
          {points.map((point) => {
            const isHovered = hoveredIndex === point.index;
            const color = EVENT_COLORS[point.event.type];
            return (
              <g key={point.index}>
                {/* Invisible larger hit area for hover */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={12}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={(e) => handleDotHover(point.index, e)}
                  onMouseLeave={handleDotLeave}
                />
                {/* Glow ring on hover */}
                {isHovered && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={8}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    opacity={0.4}
                  />
                )}
                {/* Visible dot */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHovered ? 5 : 3.5}
                  fill={color}
                  stroke="#0a0f1a"
                  strokeWidth={1.5}
                  className="transition-all duration-150"
                  style={{
                    opacity: isAnimated ? 1 : 0,
                    transitionDelay: `${0.1 * point.index}s`,
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/5 pt-4">
          {(Object.keys(EVENT_COLORS) as TrustEventType[]).map((type) => (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: EVENT_COLORS[type] }}
              />
              <span className="text-[11px] text-white/40">{EVENT_LABELS[type]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Event List ── */}
      <div>
        <h3 className="mb-4 font-serif text-xl text-white/90">Recent Trust Events</h3>
        <div className="space-y-3">
          {[...timeline].reverse().slice(0, 10).map((event, idx) => {
            const color = EVENT_COLORS[event.type];
            const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <Card
                key={`${event.date}-${idx}`}
                className="border-white/5 bg-[#111827] text-white"
              >
                <CardContent className="flex items-start gap-4 py-4">
                  {/* Event type indicator */}
                  <div className="flex flex-col items-center pt-0.5">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    {idx < 9 && (
                      <div className="mt-1 h-full w-px bg-white/10" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-white/10 text-[10px]"
                        style={{ color }}
                      >
                        {EVENT_LABELS[event.type]}
                      </Badge>
                      <span className="text-xs text-white/30">{formattedDate}</span>
                    </div>
                    <p className="mt-1 text-sm text-white/80">{event.event}</p>
                  </div>

                  {/* Score + delta */}
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-semibold tabular-nums text-white/90">
                      {event.score}
                    </div>
                    {event.delta !== 0 && (
                      <div
                        className="text-xs font-medium tabular-nums"
                        style={{
                          color: event.delta > 0 ? "#4ADE80" : "#F87171",
                        }}
                      >
                        {event.delta > 0 ? "+" : ""}
                        {event.delta}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
