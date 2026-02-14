import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { triggerN8nWebhook } from "@/lib/n8n";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const event = constructWebhookEvent(body, signature);
    if (!event) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
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

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Stripe webhook error:", e);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
