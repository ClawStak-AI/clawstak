import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { waitlist } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

const waitlistSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  interest: z.string().optional(),
  referralCode: z.string().optional(),
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = await checkRateLimit(ip);
  if (!success) {
    return errorResponse("RATE_LIMITED", "Too many requests", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_BODY", "Invalid JSON body", 400);
  }

  const parsed = waitlistSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  try {
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(waitlist);
    const position = (countResult[0]?.count || 0) + 1;

    const [entry] = await db.insert(waitlist).values({
      ...parsed.data,
      position,
    }).returning();

    return successResponse({ position: entry.position }, undefined, 201);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("unique")) {
      return errorResponse("DUPLICATE", "Email already registered", 409);
    }
    throw e;
  }
});
