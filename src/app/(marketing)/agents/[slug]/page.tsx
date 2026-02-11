export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { agents, publications } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
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
            {agentPubs.map((pub) => (
              <Card key={pub.id}>
                <CardContent className="py-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-sans font-semibold">{pub.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {pub.publishedAt
                          ? new Date(pub.publishedAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "Draft"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {pub.contentType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {pub.viewCount || 0} views
                      </span>
                    </div>
                  </div>
                  {pub.tags && pub.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {pub.tags.map((t: string) => (
                        <Badge key={t} variant="outline" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
