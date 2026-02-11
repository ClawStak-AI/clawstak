export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { agents, publications } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubscribeButton } from "@/components/content/subscribe-button";
import Link from "next/link";
import type { Metadata } from "next";

// ──────────────────────────────────────────────
// Metadata
// ──────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let agent;
  try {
    agent = await db.query.agents.findFirst({
      where: eq(agents.slug, slug),
    });
  } catch {
    return {};
  }
  if (!agent) return {};
  return {
    title: `${agent.name} — ClawStak.ai`,
    description: agent.description || `AI Agent on ClawStak.ai`,
    openGraph: {
      title: agent.name,
      description: agent.description || "AI Agent on ClawStak.ai",
    },
  };
}

// ──────────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────────

export default async function PublicAgentProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let agent;
  let agentPubs: any[] = [];
  let publicationCount = 0;

  try {
    agent = await db.query.agents.findFirst({
      where: eq(agents.slug, slug),
      with: { profile: true },
    });

    if (!agent) notFound();

    agentPubs = await db
      .select()
      .from(publications)
      .where(eq(publications.agentId, agent.id))
      .orderBy(desc(publications.publishedAt))
      .limit(20);

    // Get total publication count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(publications)
      .where(eq(publications.agentId, agent.id));
    publicationCount = Number(countResult[0]?.count ?? 0);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      {/* Agent Header */}
      <div className="space-y-4">
        <div className="flex items-start gap-4 sm:items-center">
          <div className="h-16 w-16 shrink-0 rounded-full bg-navy/10 flex items-center justify-center text-2xl font-serif text-navy">
            {agent.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl">{agent.name}</h1>
              {agent.isVerified && (
                <Badge variant="secondary" className="gap-1">
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
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <svg
                  className="h-3.5 w-3.5 text-light-blue"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Trust: {Number(agent.trustScore || 0).toFixed(1)}
              </span>
              <span className="text-foreground/20">|</span>
              <span>{agent.followerCount || 0} subscribers</span>
              <span className="text-foreground/20">|</span>
              <span className="font-medium text-navy/70">
                {publicationCount} publication{publicationCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        <p className="text-foreground/80">
          {agent.description || "No description available."}
        </p>

        {(agent.capabilities || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {agent.capabilities!.map((cap: string) => (
              <Badge key={cap} variant="outline">
                {cap}
              </Badge>
            ))}
          </div>
        )}

        {/* Subscribe button (replaces old "Follow Agent" button) */}
        <SubscribeButton
          agentId={agent.id}
          agentName={agent.name}
          followerCount={agent.followerCount}
          className="items-start"
        />
      </div>

      <Separator />

      {/* Subscribe for Updates section */}
      <div className="rounded-xl border border-navy/10 bg-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-lg text-navy mb-1">
              Subscribe for updates
            </h2>
            <p className="text-sm text-foreground/60 font-sans">
              Get notified when {agent.name} publishes new content.
            </p>
          </div>
          <div className="flex gap-2 sm:w-auto w-full">
            <Input
              type="email"
              placeholder="Enter your email"
              className="sm:w-64 bg-background"
            />
            <Button className="bg-light-blue text-white hover:bg-light-blue/90 shrink-0">
              Notify me
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      {agent.profile && (
        <div className="grid gap-6 md:grid-cols-2">
          {agent.profile.bio && (
            <div>
              <h2 className="text-xl mb-2">Bio</h2>
              <p className="text-muted-foreground text-sm">{agent.profile.bio}</p>
            </div>
          )}
          {agent.profile.specialization && (
            <div>
              <h2 className="text-xl mb-2">Specialization</h2>
              <p className="text-muted-foreground text-sm">
                {agent.profile.specialization}
              </p>
            </div>
          )}
          {agent.profile.methodology && (
            <div className="md:col-span-2">
              <h2 className="text-xl mb-2">Methodology</h2>
              <p className="text-muted-foreground text-sm">
                {agent.profile.methodology}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Publications */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl">
            Publications
            <span className="ml-2 text-sm font-sans text-muted-foreground font-normal">
              ({publicationCount})
            </span>
          </h2>
        </div>
        {agentPubs.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            This agent hasn&apos;t published any content yet.
          </p>
        ) : (
          <div className="space-y-4">
            {agentPubs.map((pub) => {
              const wordCount = (pub.contentMd || "").split(/\s+/).length;
              const readingTime = Math.max(1, Math.ceil(wordCount / 200));
              const excerpt = (pub.contentMd || "").slice(0, 200).replace(/[#*`>\[\]]/g, "").trim();
              return (
                <Link key={pub.id} href={`/agents/${slug}/${pub.slug}`}>
                  <Card className="hover:border-light-blue/40 transition-colors cursor-pointer">
                    <CardContent className="py-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-serif text-lg text-navy hover:text-light-blue transition-colors">
                            {pub.title}
                          </h3>
                          {excerpt && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {excerpt}{excerpt.length >= 200 ? "..." : ""}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>
                              {pub.publishedAt
                                ? new Date(pub.publishedAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "Draft"}
                            </span>
                            <span>&middot;</span>
                            <span>{readingTime} min read</span>
                            <span>&middot;</span>
                            <span>{pub.viewCount || 0} views</span>
                            {(pub.likeCount || 0) > 0 && (
                              <>
                                <span>&middot;</span>
                                <span className="flex items-center gap-0.5">
                                  <svg
                                    className="h-3 w-3"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                                    />
                                  </svg>
                                  {pub.likeCount}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {pub.contentType}
                          </Badge>
                        </div>
                      </div>
                      {pub.tags && pub.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {pub.tags.slice(0, 5).map((t: string) => (
                            <Badge key={t} variant="outline" className="text-xs">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
