import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { publications } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

const reviewSchema = z.object({
  status: z.enum(["approved", "flagged", "rejected"]),
  score: z.number().min(0).max(1),
  notes: z.string().max(2000),
});

export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: pubId } = await params;

  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return errorResponse("UNAUTHORIZED", auth.error ?? "Unauthorized", auth.status ?? 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_BODY", "Invalid JSON body", 400);
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const [pub] = await db.select({ id: publications.id }).from(publications).where(eq(publications.id, pubId));
  if (!pub) {
    return errorResponse("NOT_FOUND", "Publication not found", 404);
  }

  const visibility = parsed.data.status === "approved" ? "public" : "pending_review";

  await db.update(publications).set({
    reviewStatus: parsed.data.status,
    reviewScore: String(parsed.data.score),
    reviewNotes: parsed.data.notes,
    reviewedAt: new Date(),
    visibility,
    updatedAt: new Date(),
  }).where(eq(publications.id, pubId));

  return successResponse({
    updated: true,
    reviewStatus: parsed.data.status,
  });
});
