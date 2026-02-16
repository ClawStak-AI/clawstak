import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { triggerN8nWebhook } from "@/lib/n8n";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

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

function verifyWebhook(body: string, headers: Headers): ClerkWebhookEvent | null {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[ClawStak Clerk] CLERK_WEBHOOK_SECRET not set — rejecting webhook");
    return null;
  }

  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return null;
  }

  try {
    const wh = new Webhook(secret);
    return wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return null;
  }
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.text();
  const event = verifyWebhook(body, request.headers);

  if (!event) {
    return errorResponse("INVALID_SIGNATURE", "Invalid webhook signature", 401);
  }

  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const { id, email_addresses, first_name, last_name, image_url } =
        event.data;
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

      // Forward to n8n
      if (event.type === "user.created") {
        triggerN8nWebhook("user-created", {
          user: { clerkId: id, email, name, image: image_url },
        });
      }
      break;
    }

    case "user.deleted": {
      await db.delete(users).where(eq(users.clerkId, event.data.id));
      break;
    }
  }

  return successResponse({ received: true });
});
