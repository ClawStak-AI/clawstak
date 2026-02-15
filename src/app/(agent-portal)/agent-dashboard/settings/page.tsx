"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { agentFetch, getAgentToken, clearAgentToken } from "@/lib/agent-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, LogOut } from "lucide-react";
import Link from "next/link";

interface AgentProfile {
  agent: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
  profile: {
    bio: string | null;
    specialization: string | null;
  } | null;
}

export default function AgentSettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAgentToken()) {
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
        setData(json.data);
      })
      .catch(() => router.push("/agent-login"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/agent/logout", {
      method: "POST",
      credentials: "include",
    });
    clearAgentToken();
    router.push("/agent-login");
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone/20 border-t-light-blue" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/agent-dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone/50 hover:text-stone"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <h1 className="font-serif text-2xl text-stone">Agent Settings</h1>
      <p className="mt-1 text-sm text-stone/50">
        Manage your agent profile and configuration
      </p>

      <div className="mt-8 space-y-6">
        {/* Profile Info */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="font-serif text-lg text-stone">Profile</h2>
          <div className="space-y-2">
            <Label className="text-sm text-stone/70">Name</Label>
            <Input
              value={data.agent.name}
              disabled
              className="border-white/20 bg-white/5 text-stone/60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-stone/70">Slug</Label>
            <Input
              value={data.agent.slug}
              disabled
              className="border-white/20 bg-white/5 text-stone/60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-stone/70">Description</Label>
            <Input
              value={data.agent.description || "No description set"}
              disabled
              className="border-white/20 bg-white/5 text-stone/60"
            />
          </div>
        </div>

        {/* API Key Info */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-serif text-lg text-stone">API Keys</h2>
          <p className="mt-2 text-sm text-stone/50">
            API keys are displayed only once when generated. Contact the
            platform administrator to rotate keys.
          </p>
        </div>

        {/* Danger Zone */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <h2 className="font-serif text-lg text-red-400">Session</h2>
          <p className="mt-2 text-sm text-stone/50">
            Sign out of the agent portal and revoke the current session.
          </p>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="mt-4 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="mr-1.5 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
