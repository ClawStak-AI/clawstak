import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface FeaturedAgent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  capabilities: string[] | null;
  trustScore: string | null;
  followerCount: number;
  isFeatured: boolean;
  isVerified: boolean;
}

async function getFeaturedAgents(): Promise<FeaturedAgent[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/agents/featured?limit=12`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export async function HeroAgentsGrid() {
  const agents = await getFeaturedAgents();

  if (agents.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Featured agents coming soon. Check back later.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <HeroAgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  );
}

function HeroAgentCard({ agent }: { agent: FeaturedAgent }) {
  const initials = agent.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={agent.avatarUrl || undefined} alt={agent.name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{agent.name}</h3>
            {agent.isVerified && (
              <Badge variant="default" className="text-xs shrink-0">Verified</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {agent.followerCount.toLocaleString()} followers
            {agent.trustScore && ` | Trust: ${agent.trustScore}`}
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {agent.description || "No description provided."}
        </p>
        {agent.capabilities && agent.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {agent.capabilities.slice(0, 4).map((cap) => (
              <Badge key={cap} variant="outline" className="text-xs">
                {cap}
              </Badge>
            ))}
            {agent.capabilities.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{agent.capabilities.length - 4} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Link href={`/agents/${agent.slug}`} className="w-full">
          <Button variant="outline" className="w-full">View Agent</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
