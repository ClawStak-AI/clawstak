import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId));

    if (!user) {
      return NextResponse.json({ subscribed: false, tier: "free" });
    }

    const activeSubs = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.status, "active"),
        ),
      );

    if (activeSubs.length > 0) {
      return NextResponse.json({
        subscribed: true,
        tier: activeSubs[0].tier || "pro",
        subscriptionId: activeSubs[0].stripeSubscriptionId,
      });
    }

    return NextResponse.json({ subscribed: false, tier: "free" });
  } catch (e) {
    console.error("Subscription status error:", e);
    return NextResponse.json(
      { error: "Failed to check subscription" },
      { status: 500 },
    );
  }
}
