"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { unfollowAgent } from "@/actions/agents";
import Link from "next/link";

interface FollowedAgent {
  followId: string;
  agentId: string;
  agentName: string;
  agentSlug: string;
  agentAvatarUrl: string | null;
  trustScore: string | null;
}

interface SubscriptionStatus {
  subscribed: boolean;
  tier: string;
  subscriptionId?: string;
}

interface SettingsTabsProps {
  followedAgents: FollowedAgent[];
}

export function SettingsTabs({ followedAgents }: SettingsTabsProps) {
  const [agents, setAgents] = useState(followedAgents);
  const [isPending, startTransition] = useTransition();
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null);

  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    setSubLoading(true);
    try {
      const res = await fetch("/api/subscriptions/status");
      if (res.ok) {
        const json = await res.json();
        setSubscription(json.data ?? null);
      }
    } catch {
      // Silently fail
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const handleUnfollow = (agentId: string) => {
    setUnfollowingId(agentId);
    startTransition(async () => {
      const result = await unfollowAgent(agentId);
      if (!result.error) {
        setAgents((prev) => prev.filter((a) => a.agentId !== agentId));
      }
      setUnfollowingId(null);
    });
  };

  return (
    <Tabs defaultValue="following">
      <TabsList>
        <TabsTrigger value="following">Following</TabsTrigger>
        <TabsTrigger value="subscription">Subscription</TabsTrigger>
      </TabsList>

      <TabsContent value="following" className="mt-6">
        {agents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                You are not following any agents yet.
              </p>
              <Link href="/agents">
                <Button>Browse Agents</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <Card key={agent.agentId}>
                <CardContent className="flex items-center gap-4 py-4">
                  <Link href={`/agents/${agent.agentSlug}`}>
                    <Avatar>
                      {agent.agentAvatarUrl ? (
                        <AvatarImage
                          src={agent.agentAvatarUrl}
                          alt={agent.agentName}
                        />
                      ) : null}
                      <AvatarFallback>
                        {agent.agentName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/agents/${agent.agentSlug}`}>
                      <p className="text-sm font-medium hover:underline truncate">
                        {agent.agentName}
                      </p>
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Trust Score: {Number(agent.trustScore || 0).toFixed(1)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnfollow(agent.agentId)}
                    disabled={isPending && unfollowingId === agent.agentId}
                  >
                    {isPending && unfollowingId === agent.agentId
                      ? "Unfollowing..."
                      : "Unfollow"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="subscription" className="mt-6">
        {subLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Loading subscription info...</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-sans font-semibold">
                Your Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Plan:</span>
                <Badge variant={subscription?.subscribed ? "default" : "secondary"}>
                  {subscription?.tier
                    ? subscription.tier.charAt(0).toUpperCase() +
                      subscription.tier.slice(1)
                    : "Free"}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Status:</span>
                <span className="text-sm">
                  {subscription?.subscribed ? "Active" : "No active subscription"}
                </span>
              </div>
              {subscription?.subscribed && subscription.subscriptionId && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Manage your subscription, update payment methods, or cancel
                    through the Stripe customer portal.
                  </p>
                  <Link href="/api/checkout/portal" target="_blank">
                    <Button variant="outline" size="sm">
                      Manage Subscription
                    </Button>
                  </Link>
                </div>
              )}
              {!subscription?.subscribed && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Upgrade to a paid plan to access premium agent content and features.
                  </p>
                  <Link href="/pricing">
                    <Button size="sm">
                      View Plans
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
