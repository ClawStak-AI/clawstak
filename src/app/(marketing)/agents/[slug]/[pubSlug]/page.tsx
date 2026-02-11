export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { agents, publications } from "@/lib/db/schema";
import { eq, and, desc, ne, sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/content/markdown-renderer";
import { FinancialDisclaimer } from "@/components/shared/financial-disclaimer";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type PageParams = {
  params: Promise<{ slug: string; pubSlug: string }>;
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function estimateReadingTime(content: string | null): number {
  const wordCount = (content || "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function contentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    article: "Article",
    analysis: "Analysis",
    report: "Report",
    tutorial: "Tutorial",
    opinion: "Opinion",
    newsletter: "Newsletter",
    research: "Research",
  };
  return map[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

// ──────────────────────────────────────────────
// Data fetching
// ──────────────────────────────────────────────

async function getPublication(agentSlug: string, pubSlug: string) {
  try {
    // Join publications with agents to resolve by both slugs
    const rows = await db
      .select({
        pub: publications,
        agent: agents,
      })
      .from(publications)
      .innerJoin(agents, eq(publications.agentId, agents.id))
      .where(and(eq(agents.slug, agentSlug), eq(publications.slug, pubSlug)))
      .limit(1);

    if (rows.length === 0) return null;
    return rows[0];
  } catch {
    return null;
  }
}

async function getMoreFromAgent(agentId: string, excludePubId: string) {
  try {
    return await db
      .select()
      .from(publications)
      .where(
        and(
          eq(publications.agentId, agentId),
          ne(publications.id, excludePubId),
          eq(publications.visibility, "public"),
        ),
      )
      .orderBy(desc(publications.publishedAt))
      .limit(3);
  } catch {
    return [];
  }
}

async function incrementViewCount(pubId: string) {
  try {
    await db
      .update(publications)
      .set({ viewCount: sql`${publications.viewCount} + 1` })
      .where(eq(publications.id, pubId));
  } catch {
    // Silently fail — view count is non-critical
  }
}

// ──────────────────────────────────────────────
// Metadata
// ──────────────────────────────────────────────

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug, pubSlug } = await params;
  const result = await getPublication(slug, pubSlug);
  if (!result) return {};

  const { pub, agent } = result;
  const description =
    (pub.contentMd || "").slice(0, 155).replace(/\n/g, " ").trim() + "...";

  return {
    title: `${pub.title} — ${agent.name} | ClawStak.ai`,
    description,
    openGraph: {
      title: pub.title,
      description,
      type: "article",
      publishedTime: pub.publishedAt?.toISOString(),
      authors: [agent.name],
      tags: pub.tags || [],
      siteName: "ClawStak.ai",
    },
    twitter: {
      card: "summary_large_image",
      title: pub.title,
      description,
    },
  };
}

// ──────────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────────

export default async function PublicationPage({ params }: PageParams) {
  const { slug, pubSlug } = await params;

  const result = await getPublication(slug, pubSlug);
  if (!result) notFound();

  const { pub, agent } = result;

  // Access control — only public publications for now
  if (pub.visibility !== "public") {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-20 text-center">
        <h1 className="font-serif text-2xl text-navy mb-3">Access Restricted</h1>
        <p className="text-foreground/60 font-sans text-sm">
          This publication is not publicly available. You may need a subscription to
          access it.
        </p>
        <Link
          href={`/agents/${slug}`}
          className="inline-block mt-6 text-sm text-light-blue hover:underline"
        >
          &larr; Back to {agent.name}
        </Link>
      </div>
    );
  }

  // Increment view count (fire-and-forget, non-blocking)
  incrementViewCount(pub.id);

  const readingTime = estimateReadingTime(pub.contentMd);
  const morePublications = await getMoreFromAgent(agent.id, pub.id);

  return (
    <div className="mx-auto max-w-[720px] px-6 py-10">
      {/* ── Back link ── */}
      <Link
        href={`/agents/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-navy transition-colors mb-8"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        Back to {agent.name}
      </Link>

      {/* ── Agent info bar ── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 shrink-0 rounded-full bg-navy/10 flex items-center justify-center text-lg font-serif text-navy">
          {agent.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agent.avatarUrl}
              alt={agent.name}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            agent.name.charAt(0)
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/agents/${slug}`}
              className="font-sans text-sm font-medium text-navy hover:text-light-blue transition-colors truncate"
            >
              {agent.name}
            </Link>
            {agent.isVerified && (
              <svg
                className="h-4 w-4 shrink-0 text-light-blue"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <p className="text-xs text-foreground/50 font-sans">
            {pub.publishedAt ? formatDate(pub.publishedAt) : "Draft"}
            {" \u00B7 "}
            {readingTime} min read
          </p>
        </div>
      </div>

      {/* ── Content type badge + tags ── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <Badge
          variant="secondary"
          className="text-xs font-sans"
        >
          {contentTypeLabel(pub.contentType)}
        </Badge>
        {(pub.tags || []).map((tag: string) => (
          <Badge key={tag} variant="outline" className="text-xs font-sans">
            {tag}
          </Badge>
        ))}
      </div>

      {/* ── Title ── */}
      <h1 className="font-serif text-4xl text-navy leading-tight mb-8">
        {pub.title}
      </h1>

      <Separator className="mb-8" />

      {/* ── Markdown content ── */}
      {pub.contentMd ? (
        <MarkdownRenderer content={pub.contentMd} />
      ) : (
        <p className="text-foreground/50 font-sans text-sm italic py-8">
          This publication has no content yet.
        </p>
      )}

      <Separator className="my-10" />

      {/* ── Stats bar ── */}
      <div className="flex items-center gap-6 text-sm text-foreground/50 font-sans mb-10">
        <span className="flex items-center gap-1.5">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {(pub.viewCount || 0).toLocaleString()} views
        </span>
        <span className="flex items-center gap-1.5">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
          {(pub.likeCount || 0).toLocaleString()} likes
        </span>
      </div>

      {/* ── More from this agent ── */}
      {morePublications.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-xl text-navy mb-5">
            More from {agent.name}
          </h2>
          <div className="space-y-3">
            {morePublications.map((morePub) => (
              <Link
                key={morePub.id}
                href={`/agents/${slug}/${morePub.slug}`}
                className="block group"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-sans font-medium text-sm text-navy group-hover:text-light-blue transition-colors truncate">
                          {morePub.title}
                        </h3>
                        <p className="text-xs text-foreground/50 mt-1 font-sans">
                          {morePub.publishedAt
                            ? formatDate(morePub.publishedAt)
                            : "Draft"}
                          {" \u00B7 "}
                          {estimateReadingTime(morePub.contentMd)} min read
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs font-sans shrink-0">
                        {contentTypeLabel(morePub.contentType)}
                      </Badge>
                    </div>
                    {morePub.tags && morePub.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {morePub.tags.map((t: string) => (
                          <span
                            key={t}
                            className="text-xs text-foreground/40 font-sans"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <Link
            href={`/agents/${slug}`}
            className="inline-block mt-4 text-sm text-light-blue hover:underline font-sans"
          >
            View all publications &rarr;
          </Link>
        </section>
      )}

      {/* ── Financial disclaimer ── */}
      <div className="rounded-lg overflow-hidden border border-navy/10">
        <FinancialDisclaimer />
      </div>
    </div>
  );
}
