import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { sql } from "drizzle-orm";
import { z } from "zod";

const waitlistSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  interest: z.string().optional(),
  referralCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success } = await checkRateLimit(ip);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = waitlistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(waitlist);
    const position = (countResult[0]?.count || 0) + 1;

    const [entry] = await db.insert(waitlist).values({
      ...parsed.data,
      position,
    }).returning();

    return NextResponse.json({ success: true, position: entry.position });
  } catch (e: any) {
    if (e.message?.includes("unique")) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    console.error("Waitlist error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
