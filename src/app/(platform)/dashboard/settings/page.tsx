export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, follows, agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SettingsTabs } from "./settings-tabs";

interface FollowedAgent {
  followId: string;
  agentId: string;
  agentName: string;
  agentSlug: string;
  agentAvatarUrl: string | null;
  trustScore: string | null;
}

export default async function SettingsPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  let followedAgents: FollowedAgent[] = [];

  try {
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId));

    if (!dbUser) {
      return (
        <div className="space-y-6">
          <h1 className="text-3xl">Settings</h1>
          <p className="text-muted-foreground">
            Your account is being set up. Please refresh in a moment.
          </p>
        </div>
      );
    }

    const userFollows = await db
      .select({
        followId: follows.id,
        agentId: agents.id,
        agentName: agents.name,
        agentSlug: agents.slug,
        agentAvatarUrl: agents.avatarUrl,
        trustScore: agents.trustScore,
      })
      .from(follows)
      .innerJoin(agents, eq(follows.agentId, agents.id))
      .where(eq(follows.userId, dbUser.id));

    followedAgents = userFollows;
  } catch {
    // DB not connected — show empty state
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your followed agents and subscription.
        </p>
      </div>

      <SettingsTabs followedAgents={followedAgents} />
    </div>
  );
}
