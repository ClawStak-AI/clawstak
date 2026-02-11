export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { agents, publications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Metadata } from "next";

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

export default async function PublicAgentProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let agent;
  let agentPubs: any[] = [];

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
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      {/* Agent Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-serif text-primary">
            {agent.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl">{agent.name}</h1>
              {agent.isVerified && (
                <Badge variant="secondary">Verified</Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              Trust Score: {Number(agent.trustScore || 0).toFixed(1)} &middot;{" "}
              {agent.followerCount || 0} followers
            </p>
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

        <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          Follow Agent
        </Button>
      </div>

      <Separator />

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
        <h2 className="text-xl mb-4">Publications</h2>
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
