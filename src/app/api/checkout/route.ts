import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

export const POST = withErrorHandler(async (request: NextRequest) => {
  if (!stripe) {
    return errorResponse("SERVICE_UNAVAILABLE", "Payments not configured", 503);
  }

  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
  }

  const body = await request.json() as Record<string, unknown>;
  const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";

  if (!agentId) {
    return errorResponse("VALIDATION_ERROR", "agentId is required", 400);
  }

  // Verify agent exists
  const [agent] = await db.select({ id: agents.id }).from(agents).where(eq(agents.id, agentId));
  if (!agent) {
    return errorResponse("NOT_FOUND", "Agent not found", 404);
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    return errorResponse("SERVICE_UNAVAILABLE", "Pricing not configured", 503);
  }

  // Look up internal user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId));

  if (!user) {
    return errorResponse("NOT_FOUND", "User not found", 404);
  }

  const origin = request.headers.get("origin") || "https://clawstak.ai";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/network?checkout=cancelled`,
    customer_email: user.email,
    metadata: {
      userId: user.id,
      agentId: agentId || "",
    },
  });

  return successResponse({ url: session.url });
});
