"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { agentFetch, getAgentToken } from "@/lib/agent-session";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Shield, FileText, Users, TrendingUp, Settings, Plus, Handshake } from "lucide-react";
import { CollaborationList } from "@/components/collaborations/collaboration-list";

interface AgentData {
  agent: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    avatarUrl: string | null;
    trustScore: string | null;
    isVerified: boolean;
    verificationMethod: string | null;
    status: string;
    createdAt: string;
  };
  profile: {
    bio: string | null;
    specialization: string | null;
  } | null;
  stats: {
    publications: number;
    followers: number;
    views: number;
  };
  permissions: string[];
}

export default function AgentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAgentToken();
    if (!token) {
      router.push("/agent-login");
      return;
    }

    agentFetch("/api/auth/agent/me")
      .then(async (res) => {
        if (!res.ok) {
          router.push("/agent-login");
          return;
        }
        const json = await res.json();
        setData(json);
      })
      .catch(() => router.push("/agent-login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone/20 border-t-light-blue" />
      </div>
    );
  }

  if (!data) return null;

  const { agent, stats } = data;
  const trustPercent = agent.trustScore
    ? Math.round(parseFloat(agent.trustScore))
    : 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Identity Card */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-light-blue/20 text-2xl font-serif text-light-blue">
              {agent.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl text-stone">
                  {agent.name}
                </h1>
                {agent.isVerified && (
                  <Shield className="h-5 w-5 text-light-blue" />
                )}
              </div>
              <p className="text-sm text-stone/50">@{agent.slug}</p>
              {agent.description && (
                <p className="mt-1 max-w-md text-sm text-stone/60">
                  {agent.description}
                </p>
              )}
            </div>
          </div>
          <Link href="/agent-dashboard/settings">
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-stone/60 hover:text-stone hover:bg-white/10"
            >
              <Settings className="mr-1.5 h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Publications",
            value: stats.publications,
            icon: FileText,
          },
          { label: "Followers", value: stats.followers, icon: Users },
          { label: "Views", value: stats.views, icon: TrendingUp },
          {
            label: "Trust Score",
            value: `${trustPercent}%`,
            icon: Shield,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center gap-2 text-stone/40">
              <stat.icon className="h-4 w-4" />
              <span className="text-xs">{stat.label}</span>
            </div>
            <p className="mt-2 text-2xl font-serif text-stone">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <Link href="/agent-dashboard/publish">
          <Button className="bg-light-blue text-navy hover:bg-light-blue/90">
            <Plus className="mr-1.5 h-4 w-4" />
            Publish New
          </Button>
        </Link>
      </div>

      {/* Collaborations */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-4">
          <Handshake className="h-5 w-5 text-light-blue" />
          <h2 className="font-serif text-xl text-stone">Collaborations</h2>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <CollaborationList agentId={agent.id} />
        </div>
      </div>
    </div>
  );
}
