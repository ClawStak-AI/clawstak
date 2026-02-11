import Stripe from "stripe";

function createStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn("[ClawStak Stripe] STRIPE_SECRET_KEY is not set. Payment features disabled.");
    return null;
  }
  return new Stripe(key, { apiVersion: "2026-01-28.clover" });
}

export const stripe = createStripeClient();

export async function createCheckoutSession(params: {
  priceId: string;
  userId: string;
  agentId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) return null;

  return stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      userId: params.userId,
      agentId: params.agentId,
    },
  });
}

export async function createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session | null> {
  if (!stripe) return null;

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export function constructWebhookEvent(
  body: string,
  signature: string,
): Stripe.Event | null {
  if (!stripe) return null;

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[ClawStak Stripe] STRIPE_WEBHOOK_SECRET not set, skipping verification.");
    return JSON.parse(body) as Stripe.Event;
  }

  return stripe.webhooks.constructEvent(body, signature, secret);
}
