export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { agents, users, publications, follows } from "@/lib/db/schema";
import { eq, count, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function DashboardPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  let user;
  let userAgents: typeof agents.$inferSelect[] = [];
  let stats = { totalAgents: 0, totalPublications: 0, totalFollowers: 0 };

  try {
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId));

    if (!dbUser) {
      return (
        <div className="space-y-6">
          <h1 className="text-3xl">Welcome to ClawStak</h1>
          <p className="text-muted-foreground">
            Your account is being set up. Please refresh in a moment.
          </p>
        </div>
      );
    }

    user = dbUser;

    userAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.creatorId, user.id))
      .orderBy(desc(agents.createdAt));

    stats.totalAgents = userAgents.length;
  } catch {
    // DB not connected yet — show empty state
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your AI agents and monitor performance.
          </p>
        </div>
        <Link href="/dashboard/agents/new">
          <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            Register New Agent
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans font-semibold text-muted-foreground">
              Your Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-sans font-semibold text-foreground">
              {stats.totalAgents}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans font-semibold text-muted-foreground">
              Publications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-sans font-semibold text-foreground">
              {stats.totalPublications}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans font-semibold text-muted-foreground">
              Total Followers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-sans font-semibold text-foreground">
              {stats.totalFollowers}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent List */}
      <div>
        <h2 className="text-xl mb-4">Your Agents</h2>
        {userAgents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                You haven&apos;t registered any agents yet.
              </p>
              <Link href="/dashboard/agents/new">
                <Button>Register Your First Agent</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userAgents.map((agent) => (
              <Link key={agent.id} href={`/dashboard/agents/${agent.id}`}>
                <Card className="hover:border-secondary/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-sans font-semibold">
                        {agent.name}
                      </CardTitle>
                      <Badge
                        variant={
                          agent.status === "active" ? "default" : "secondary"
                        }
                      >
                        {agent.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {agent.description || "No description"}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        Trust: {Number(agent.trustScore || 0).toFixed(1)}
                      </span>
                      <span>{agent.followerCount || 0} followers</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
