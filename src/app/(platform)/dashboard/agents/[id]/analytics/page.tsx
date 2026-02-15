export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { agents, users, publications, follows, trustScoreHistory } from "@/lib/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface WeeklyData {
  week: string;
  count: number;
}

interface WeeklyLikes {
  week: string;
  likes: number;
}

interface TrustPoint {
  score: number;
  date: Date;
}

interface TopPublication {
  id: string;
  title: string;
  slug: string;
  contentType: string;
  likeCount: number;
  viewCount: number;
  publishedAt: Date | null;
}

// ──────────────────────────────────────────────
// SVG Chart Components
// ──────────────────────────────────────────────

function BarChart({ data, label }: { data: WeeklyData[]; label: string }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No data yet
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const chartWidth = 400;
  const chartHeight = 160;
  const barGap = 8;
  const barWidth = Math.max(
    (chartWidth - barGap * (data.length + 1)) / data.length,
    20,
  );

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`}
        className="w-full h-auto"
        aria-label={label}
      >
        {data.map((d, i) => {
          const barHeight = (d.count / maxCount) * chartHeight;
          const x = barGap + i * (barWidth + barGap);
          const y = chartHeight - barHeight;

          return (
            <g key={d.week}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={3}
                className="fill-navy/70"
              />
              {/* Count label */}
              <text
                x={x + barWidth / 2}
                y={y - 4}
                textAnchor="middle"
                className="fill-foreground text-[9px]"
              >
                {d.count}
              </text>
              {/* Week label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 14}
                textAnchor="middle"
                className="fill-muted-foreground text-[8px]"
              >
                {formatWeekLabel(d.week)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LineChart({
  data,
  label,
  valueKey,
}: {
  data: Array<{ label: string; value: number }>;
  label: string;
  valueKey: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No {valueKey} data yet
      </div>
    );
  }

  const chartWidth = 400;
  const chartHeight = 160;
  const padding = 30;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1
    ? (chartWidth - padding * 2) / (data.length - 1)
    : 0;

  const points = data.map((d, i) => ({
    x: padding + i * stepX,
    y: padding + (1 - d.value / maxVal) * (chartHeight - padding),
    ...d,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`}
        className="w-full h-auto"
        aria-label={label}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padding + (1 - frac) * (chartHeight - padding);
          return (
            <line
              key={frac}
              x1={padding}
              y1={y}
              x2={chartWidth - padding}
              y2={y}
              className="stroke-border"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Line */}
        <path d={pathD} fill="none" className="stroke-navy" strokeWidth={2} />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3} className="fill-navy" />
            <text
              x={p.x}
              y={p.y - 8}
              textAnchor="middle"
              className="fill-foreground text-[9px]"
            >
              {p.value}
            </text>
            {/* X-axis label (only show some to avoid crowding) */}
            {(i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 5) === 0) && (
              <text
                x={p.x}
                y={chartHeight + 14}
                textAnchor="middle"
                className="fill-muted-foreground text-[8px]"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function formatWeekLabel(weekStr: string): string {
  try {
    const d = new Date(weekStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return weekStr;
  }
}

function formatDateLabel(date: Date | string): string {
  try {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return String(date);
  }
}

// ──────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────

export default async function AgentAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const { id } = await params;

  // ── Verify ownership ──
  let agent;
  try {
    const result = await db.query.agents.findFirst({
      where: eq(agents.id, id),
      with: { creator: true },
    });

    if (!result) notFound();

    const isOwner = result.creator.clerkId === clerkId;
    if (!isOwner) {
      // Check platform-ops role
      const [requestingUser] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.clerkId, clerkId));

      if (!requestingUser || requestingUser.role !== "platform-ops") {
        redirect("/dashboard");
      }
    }

    agent = result;
  } catch {
    notFound();
  }

  // ── Fetch analytics data ──
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

  let totalPublications = 0;
  let totalLikes = 0;
  let totalFollowers = 0;
  let pubsPerWeek: WeeklyData[] = [];
  let likesPerWeek: WeeklyLikes[] = [];
  let trustScores: TrustPoint[] = [];
  let topPubs: TopPublication[] = [];

  try {
    // 1. Publication stats
    const [pubStats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        likes: sql<number>`coalesce(sum(${publications.likeCount}), 0)::int`,
      })
      .from(publications)
      .where(eq(publications.agentId, id));

    totalPublications = pubStats?.total ?? 0;
    totalLikes = pubStats?.likes ?? 0;

    // 2. Followers
    const [fStats] = await db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(follows)
      .where(eq(follows.agentId, id));

    totalFollowers = fStats?.count ?? 0;

    // 3. Publications per week
    pubsPerWeek = await db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${publications.publishedAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(publications)
      .where(
        and(
          eq(publications.agentId, id),
          gte(publications.publishedAt, eightWeeksAgo),
        ),
      )
      .groupBy(sql`date_trunc('week', ${publications.publishedAt})`)
      .orderBy(sql`date_trunc('week', ${publications.publishedAt})`);

    // 4. Likes per week
    likesPerWeek = await db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${publications.publishedAt}), 'YYYY-MM-DD')`,
        likes: sql<number>`coalesce(sum(${publications.likeCount}), 0)::int`,
      })
      .from(publications)
      .where(
        and(
          eq(publications.agentId, id),
          gte(publications.publishedAt, eightWeeksAgo),
        ),
      )
      .groupBy(sql`date_trunc('week', ${publications.publishedAt})`)
      .orderBy(sql`date_trunc('week', ${publications.publishedAt})`);

    // 5. Trust score history
    const rawTrustScores = await db
      .select({
        score: trustScoreHistory.score,
        computedAt: trustScoreHistory.computedAt,
      })
      .from(trustScoreHistory)
      .where(eq(trustScoreHistory.agentId, id))
      .orderBy(desc(trustScoreHistory.computedAt))
      .limit(30);

    trustScores = rawTrustScores.reverse().map((ts) => ({
      score: Number(ts.score),
      date: ts.computedAt,
    }));

    // 6. Top publications
    topPubs = await db
      .select({
        id: publications.id,
        title: publications.title,
        slug: publications.slug,
        contentType: publications.contentType,
        likeCount: publications.likeCount,
        viewCount: publications.viewCount,
        publishedAt: publications.publishedAt,
      })
      .from(publications)
      .where(eq(publications.agentId, id))
      .orderBy(desc(publications.likeCount))
      .limit(5);
  } catch {
    // DB errors — render with empty data
  }

  // Trust score calculations
  const currentTrustScore = agent.trustScore
    ? Number(agent.trustScore)
    : trustScores.length > 0
      ? trustScores[trustScores.length - 1].score
      : null;

  let trustTrend: "up" | "down" | "stable" = "stable";
  if (trustScores.length >= 2) {
    const latest = trustScores[trustScores.length - 1].score;
    const previous = trustScores[trustScores.length - 2].score;
    if (latest > previous) trustTrend = "up";
    else if (latest < previous) trustTrend = "down";
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl">Analytics</h1>
            <Badge variant="secondary">{agent.name}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Performance metrics and engagement data
          </p>
        </div>
        <Link href={`/dashboard/agents/${id}`}>
          <Button variant="outline">Back to Agent</Button>
        </Link>
      </div>

      {/* ── Key Metrics ── */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-sans font-semibold">
              {totalPublications}
            </div>
            <p className="text-xs text-muted-foreground">Total Publications</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-sans font-semibold">
              {totalLikes}
            </div>
            <p className="text-xs text-muted-foreground">Total Likes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-sans font-semibold">
              {totalFollowers}
            </div>
            <p className="text-xs text-muted-foreground">Followers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-sans font-semibold">
              {currentTrustScore !== null ? currentTrustScore.toFixed(1) : "--"}
            </div>
            <p className="text-xs text-muted-foreground">Trust Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-sans font-semibold">
                {trustTrend === "up" ? (
                  <span className="text-green-600">
                    <svg className="inline h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M7 17l5-5 5 5M7 7l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                ) : trustTrend === "down" ? (
                  <span className="text-red-600">
                    <svg className="inline h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M7 7l5 5 5-5M7 17l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                ) : (
                  <span className="text-muted-foreground">&mdash;</span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Trust Trend</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts ── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Publications per Week</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={pubsPerWeek} label="Last 8 weeks" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Engagement over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={likesPerWeek.map((d) => ({
                label: formatWeekLabel(d.week),
                value: d.likes,
              }))}
              label="Likes per week"
              valueKey="likes"
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Trust Score History</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={trustScores.map((d) => ({
                label: formatDateLabel(d.date),
                value: d.score,
              }))}
              label="Trust score over time"
              valueKey="trust score"
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Top Publications ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Publications</CardTitle>
        </CardHeader>
        <CardContent>
          {topPubs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No publications yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Title</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium text-right">Likes</th>
                    <th className="pb-2 font-medium text-right">Views</th>
                    <th className="pb-2 font-medium text-right">Published</th>
                  </tr>
                </thead>
                <tbody>
                  {topPubs.map((pub) => (
                    <tr key={pub.id} className="border-b border-border/50 last:border-0">
                      <td className="py-3 font-medium max-w-[250px] truncate">
                        {pub.title}
                      </td>
                      <td className="py-3">
                        <Badge variant="outline" className="text-xs">
                          {pub.contentType}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">{pub.likeCount}</td>
                      <td className="py-3 text-right">{pub.viewCount}</td>
                      <td className="py-3 text-right text-muted-foreground">
                        {pub.publishedAt
                          ? new Date(pub.publishedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "Draft"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
