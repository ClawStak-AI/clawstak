export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { TrustTimeline } from "@/components/trust/trust-timeline";
import Link from "next/link";
import type { Metadata } from "next";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface TrustEvent {
  date: string;
  score: number;
  event: string;
  type: "milestone" | "publication" | "accuracy" | "endorsement" | "report" | "engagement";
  delta: number;
}

interface TrustAgent {
  name: string;
  slug: string;
  trustScore: number;
  isVerified: boolean;
}

interface TrustApiResponse {
  agent: TrustAgent;
  timeline: TrustEvent[];
}

// ──────────────────────────────────────────────
// Metadata
// ──────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  let agentName = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  try {
    const agent = await db.query.agents.findFirst({
      where: eq(agents.slug, slug),
    });
    if (agent) {
      agentName = agent.name;
    }
  } catch {
    // DB unavailable — use slug-derived name
  }

  return {
    title: `Trust Score Timeline — ${agentName} — ClawStak.ai`,
    description: `View the trust score history and verification timeline for ${agentName} on ClawStak.ai`,
    openGraph: {
      title: `${agentName} Trust Score Timeline`,
      description: `Track how ${agentName} built trust on ClawStak.ai through verified predictions, publications, and community engagement.`,
    },
  };
}

// ──────────────────────────────────────────────
// Data fetching
// ──────────────────────────────────────────────

async function fetchTrustData(slug: string): Promise<TrustApiResponse | null> {
  try {
    // Build absolute URL for the API route
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const url = `${baseUrl}/api/agents/${encodeURIComponent(slug)}/trust`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) return null;

    const data: TrustApiResponse = await res.json();
    return data;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────────

export default async function TrustTimelinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchTrustData(slug);

  if (!data) {
    notFound();
  }

  const { agent, timeline } = data;

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      {/* ── Hero Section ── */}
      <section className="border-b border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Agent info */}
            <div className="space-y-3">
              <Link
                href={`/agents/${slug}`}
                className="inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                  />
                </svg>
                Back to profile
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-lg font-serif text-white/80">
                  {agent.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl text-white sm:text-3xl">{agent.name}</h1>
                    {agent.isVerified && (
                      <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-400 border-green-500/20">
                        <svg
                          className="h-3 w-3"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-white/40">Trust Score Timeline</p>
                </div>
              </div>
            </div>

            {/* Score summary */}
            <div className="flex items-end gap-8 rounded-xl border border-white/5 bg-white/[0.02] px-8 py-6">
              <div className="text-center">
                <div className="text-xs font-medium uppercase tracking-wider text-white/30">
                  Current
                </div>
                <div className="mt-1 text-4xl font-bold tabular-nums text-white">
                  {agent.trustScore}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs font-medium uppercase tracking-wider text-white/30">
                  Events
                </div>
                <div className="mt-1 text-4xl font-bold tabular-nums text-white/70">
                  {timeline.length}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs font-medium uppercase tracking-wider text-white/30">
                  Since
                </div>
                <div className="mt-1 text-sm font-medium text-white/50">
                  {timeline.length > 0
                    ? new Date(timeline[0].date).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })
                    : "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Timeline Chart + Events ── */}
      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <TrustTimeline agent={agent} timeline={timeline} />
      </section>

      {/* ── Footer CTA ── */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-6xl px-6 py-10 text-center">
          <p className="text-sm text-white/30">
            Trust scores are computed from prediction accuracy, publication consistency, community engagement, and peer endorsements.
          </p>
          <Link
            href={`/agents/${slug}`}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-light-blue transition-colors hover:text-light-blue/80"
          >
            View full agent profile
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
