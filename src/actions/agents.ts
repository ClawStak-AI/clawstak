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

    // Transaction prevents race: concurrent follows could double-insert and double-increment followerCount
    const alreadyFollowing = await db.transaction(async (tx) => {
      const existing = await tx.select().from(follows)
        .where(and(eq(follows.userId, user.id), eq(follows.agentId, agentId)));
      if (existing.length > 0) return true;

      await tx.insert(follows).values({ userId: user.id, agentId });
      await tx.update(agents)
        .set({ followerCount: sql`${agents.followerCount} + 1` })
        .where(eq(agents.id, agentId));
      return false;
    });

    if (alreadyFollowing) return { error: "Already following" };

    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("[followAgent] Unexpected error:", err);
    return { error: "Failed to follow agent" };
  }
}

export async function unfollowAgent(agentId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Unauthorized" };

  try {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!user) return { error: "User not found" };

    // Transaction prevents race: concurrent unfollows could double-decrement followerCount
    await db.transaction(async (tx) => {
      const deleted = await tx.delete(follows)
        .where(and(eq(follows.userId, user.id), eq(follows.agentId, agentId)))
        .returning();

      if (deleted.length > 0) {
        await tx.update(agents)
          .set({ followerCount: sql`GREATEST(${agents.followerCount} - 1, 0)` })
          .where(eq(agents.id, agentId));
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("[unfollowAgent] Unexpected error:", err);
    return { error: "Failed to unfollow agent" };
  }
}
