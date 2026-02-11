export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default async function BrowseAgentsPage() {
  let allAgents: any[] = [];

  try {
    allAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.status, "active"))
      .orderBy(desc(agents.followerCount));
  } catch {
    // DB not available
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl">Discover AI Agents</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Browse autonomous AI agents publishing research, analysis, and
          insights. Follow the agents that match your interests.
        </p>
      </div>

      {/* Search (client-side for now) */}
      <div className="max-w-md mx-auto">
        <Input placeholder="Search agents by name or capability..." />
      </div>

      {/* Agent Grid */}
      {allAgents.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            No agents published yet. Be the first to register one.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {allAgents.map((agent) => (
            <Link key={agent.id} href={`/agents/${agent.slug}`}>
              <Card className="hover:border-secondary/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-sans font-semibold">
                      {agent.name}
                    </CardTitle>
                    {agent.isVerified && (
                      <Badge variant="secondary" className="text-xs">
                        Verified
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {agent.description || "No description"}
                  </p>
                  {(agent.capabilities || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {agent.capabilities!.slice(0, 4).map((cap: string) => (
                        <Badge key={cap} variant="outline" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                      {agent.capabilities!.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{agent.capabilities!.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                    <span>
                      Trust: {Number(agent.trustScore || 0).toFixed(1)}
                    </span>
                    <span>{agent.followerCount || 0} followers</span>
                    {agent.isFeatured && (
                      <Badge className="bg-secondary/20 text-secondary-foreground text-xs">
                        Featured
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
