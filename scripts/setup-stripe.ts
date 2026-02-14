/**
 * ClawStak Stripe Product & Price Setup
 * Run with: npx tsx scripts/setup-stripe.ts
 *
 * Creates the Pro subscription product and price in Stripe.
 * Idempotent — looks up existing products before creating.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error("ERROR: STRIPE_SECRET_KEY is required");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

async function main() {
  console.log("Setting up Stripe products for ClawStak...\n");

  // Check for existing products
  const existingProducts = await stripe.products.list({ limit: 10 });
  const existingPro = existingProducts.data.find(
    (p) => p.metadata?.clawstak_tier === "pro",
  );

  let proProduct: Stripe.Product;

  if (existingPro) {
    console.log(`  [EXISTS] Pro product: ${existingPro.id}`);
    proProduct = existingPro;
  } else {
    proProduct = await stripe.products.create({
      name: "ClawStak Pro",
      description:
        "Unlimited articles, real-time alerts, API access, and premium research from AI agents.",
      metadata: { clawstak_tier: "pro" },
    });
    console.log(`  [CREATED] Pro product: ${proProduct.id}`);
  }

  // Check for existing price
  const existingPrices = await stripe.prices.list({
    product: proProduct.id,
    active: true,
    limit: 10,
  });

  const existingMonthlyPrice = existingPrices.data.find(
    (p) =>
      p.recurring?.interval === "month" && p.unit_amount === 2900,
  );

  let proMonthlyPrice: Stripe.Price;

  if (existingMonthlyPrice) {
    console.log(`  [EXISTS] Pro monthly price: ${existingMonthlyPrice.id}`);
    proMonthlyPrice = existingMonthlyPrice;
  } else {
    proMonthlyPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 2900, // $29.00
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { clawstak_tier: "pro" },
    });
    console.log(`  [CREATED] Pro monthly price: ${proMonthlyPrice.id}`);
  }

  console.log("\nStripe setup complete!");
  console.log(`\n  STRIPE_PRO_PRICE_ID=${proMonthlyPrice.id}`);
  console.log("\nAdd this to your .env.local file.");

  // Create webhook endpoint if not exists
  const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
  const existingWebhook = webhooks.data.find(
    (w) => w.url === "https://clawstak.ai/api/webhooks/stripe",
  );

  if (existingWebhook) {
    console.log(`\n  [EXISTS] Webhook: ${existingWebhook.id}`);
    console.log(`  Secret: ${existingWebhook.secret || "(retrieve from Stripe dashboard)"}`);
  } else {
    const webhook = await stripe.webhookEndpoints.create({
      url: "https://clawstak.ai/api/webhooks/stripe",
      enabled_events: [
        "checkout.session.completed",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ],
    });
    console.log(`\n  [CREATED] Webhook: ${webhook.id}`);
    console.log(`  STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
    console.log("  Add this to your .env.local file.");
  }
}

main().catch(console.error);
