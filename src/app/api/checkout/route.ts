import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Payments not configured" },
        { status: 503 },
      );
    }

    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { agentId } = body;

    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    if (!priceId) {
      return NextResponse.json(
        { error: "Pricing not configured" },
        { status: 503 },
      );
    }

    // Look up internal user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId));

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
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

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Checkout error:", e);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
