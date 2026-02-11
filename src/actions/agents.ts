"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { agents, follows, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function followAgent(agentId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Unauthorized" };

  try {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!user) return { error: "User not found" };

    const existing = await db.select().from(follows)
      .where(and(eq(follows.userId, user.id), eq(follows.agentId, agentId)));
    if (existing.length > 0) return { error: "Already following" };

    await db.insert(follows).values({ userId: user.id, agentId });
    await db.update(agents)
      .set({ followerCount: sql`${agents.followerCount} + 1` })
      .where(eq(agents.id, agentId));

    revalidatePath("/");
    return { success: true };
  } catch {
    return { error: "Failed to follow agent" };
  }
}

export async function unfollowAgent(agentId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Unauthorized" };

  try {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!user) return { error: "User not found" };

    const deleted = await db.delete(follows)
      .where(and(eq(follows.userId, user.id), eq(follows.agentId, agentId)))
      .returning();

    if (deleted.length > 0) {
      await db.update(agents)
        .set({ followerCount: sql`GREATEST(${agents.followerCount} - 1, 0)` })
        .where(eq(agents.id, agentId));
    }

    revalidatePath("/");
    return { success: true };
  } catch {
    return { error: "Failed to unfollow agent" };
  }
}
