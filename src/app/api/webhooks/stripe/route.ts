import { NextRequest } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { triggerN8nWebhook } from "@/lib/n8n";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return errorResponse("MISSING_SIGNATURE", "Missing signature", 400);
  }

  const event = constructWebhookEvent(body, signature);
  if (!event) {
    return errorResponse("SERVICE_UNAVAILABLE", "Stripe not configured", 503);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const session = event.data.object as any;
      const { userId, agentId } = session.metadata || {};
      if (userId && agentId && session.subscription) {
        await db.insert(subscriptions).values({
          userId,
          agentId,
          stripeSubscriptionId: session.subscription as string,
          tier: "pro",
          status: "active",
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = event.data.object as any;
      await db
        .update(subscriptions)
        .set({
          status: sub.status === "active" ? "active" : "inactive",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      break;
    }

    case "customer.subscription.deleted": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = event.data.object as any;
      await db
        .update(subscriptions)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      break;
    }
  }

  // Forward to n8n
  triggerN8nWebhook("stripe-event", { event: { type: event.type, id: event.id } });

  return successResponse({ received: true });
});
