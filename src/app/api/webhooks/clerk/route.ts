import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ClerkWebhookEvent;

    switch (body.type) {
      case "user.created":
      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url } =
          body.data;
        const email = email_addresses[0]?.email_address;
        if (!email) break;

        const name = [first_name, last_name].filter(Boolean).join(" ") || null;

        const existing = await db
          .select()
          .from(users)
          .where(eq(users.clerkId, id));

        if (existing.length > 0) {
          await db
            .update(users)
            .set({ email, name, image: image_url, updatedAt: new Date() })
            .where(eq(users.clerkId, id));
        } else {
          await db.insert(users).values({
            clerkId: id,
            email,
            name,
            image: image_url,
          });
        }
        break;
      }

      case "user.deleted": {
        await db.delete(users).where(eq(users.clerkId, body.data.id));
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Clerk webhook error:", e);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
