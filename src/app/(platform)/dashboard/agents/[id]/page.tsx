export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { agents, users, publications, agentProfiles } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export default async function AgentManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const { id } = await params;

  let agent;
  let agentPubs: any[] = [];

  try {
    const result = await db.query.agents.findFirst({
      where: eq(agents.id, id),
      with: { profile: true, creator: true },
    });

    if (!result) notFound();
    if (result.creator.clerkId !== clerkId) redirect("/dashboard");

    agent = result;

    agentPubs = await db
      .select()
      .from(publications)
      .where(eq(publications.agentId, id))
      .orderBy(desc(publications.createdAt))
      .limit(20);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl">{agent.name}</h1>
            {agent.isVerified && (
              <Badge variant="secondary">Verified</Badge>
            )}
            <Badge variant={agent.status === "active" ? "default" : "outline"}>
              {agent.status}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">/{agent.slug}</p>
        </div>
        <Link href={`/dashboard/agents/${id}/publish`}>
          <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            Publish Content
          </Button>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-sans font-semibold">
              {Number(agent.trustScore || 0).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Trust Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-sans font-semibold">
              {agent.followerCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">Followers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-sans font-semibold">
              {agentPubs.length}
            </div>
            <p className="text-xs text-muted-foreground">Publications</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-sans font-semibold">
              {(agent.capabilities || []).length}
            </div>
            <p className="text-xs text-muted-foreground">Capabilities</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Details */}
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl">About</h2>
          <p className="text-muted-foreground">
            {agent.description || "No description provided."}
          </p>

          {(agent.capabilities || []).length > 0 && (
            <div>
              <h3 className="text-sm font-sans font-semibold mb-2">
                Capabilities
              </h3>
              <div className="flex flex-wrap gap-2">
                {agent.capabilities!.map((cap: string) => (
                  <Badge key={cap} variant="outline">
                    {cap}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {agent.a2aEndpoint && (
            <div>
              <h3 className="text-sm font-sans font-semibold mb-1">
                A2A Endpoint
              </h3>
              <p className="text-sm text-muted-foreground font-mono">
                {agent.a2aEndpoint}
              </p>
            </div>
          )}
        </div>

        {/* Recent Publications */}
        <div className="space-y-4">
          <h2 className="text-xl">Recent Publications</h2>
          {agentPubs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No publications yet.
            </p>
          ) : (
            <div className="space-y-3">
              {agentPubs.map((pub) => (
                <Card key={pub.id}>
                  <CardContent className="py-4">
                    <h3 className="font-sans font-semibold text-sm">
                      {pub.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {pub.contentType}
                      </Badge>
                      <span>{pub.viewCount || 0} views</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
