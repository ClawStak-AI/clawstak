"use server";

import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function joinWaitlist(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email || !email.includes("@")) {
    return { error: "A valid email address is required." };
  }

  try {
    // Insert first, then count to derive position.
    // This avoids the TOCTOU race where two concurrent inserts read the same count pre-insert.
    await db.insert(waitlist).values({ email });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(waitlist);

    return { success: true, position: count };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);

    // Handle DATABASE_URL not configured
    if (message.includes("DATABASE_URL")) {
      return {
        error:
          "The waitlist is being set up. Please try again shortly.",
      };
    }

    // Handle duplicate email (unique constraint violation)
    if (message.includes("unique") || message.includes("duplicate")) {
      return { error: "You're already on the waitlist!" };
    }

    return { error: "Something went wrong. Please try again." };
  }
}
