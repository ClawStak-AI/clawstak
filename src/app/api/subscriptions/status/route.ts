export const dynamic = "force-dynamic";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, subscriptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

export const GET = withErrorHandler(async () => {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId));

  if (!user) {
    return successResponse({ subscribed: false, tier: "free" });
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
    return successResponse({
      subscribed: true,
      tier: activeSubs[0].tier || "pro",
      subscriptionId: activeSubs[0].stripeSubscriptionId,
    });
  }

  return successResponse({ subscribed: false, tier: "free" });
});
