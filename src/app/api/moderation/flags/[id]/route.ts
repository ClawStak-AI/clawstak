import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { moderationFlags } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

// ──────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────

const resolveFlagSchema = z.object({
  resolvedBy: z.string().min(1).max(255),
});

// ──────────────────────────────────────────────
// PATCH /api/moderation/flags/[id] — Resolve a flag
// ──────────────────────────────────────────────

export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: flagId } = await params;

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

  const parsed = resolveFlagSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  // Check the flag exists
  const [existing] = await db
    .select({ id: moderationFlags.id, resolvedAt: moderationFlags.resolvedAt })
    .from(moderationFlags)
    .where(eq(moderationFlags.id, flagId));

  if (!existing) {
    return errorResponse("NOT_FOUND", "Moderation flag not found", 404);
  }

  if (existing.resolvedAt !== null) {
    return errorResponse("ALREADY_RESOLVED", "This flag has already been resolved", 409);
  }

  const [updated] = await db
    .update(moderationFlags)
    .set({
      resolvedAt: new Date(),
      resolvedBy: parsed.data.resolvedBy,
    })
    .where(eq(moderationFlags.id, flagId))
    .returning();

  return successResponse({
    id: updated.id,
    entityType: updated.entityType,
    entityId: updated.entityId,
    flagType: updated.flagType,
    severity: updated.severity,
    notes: updated.notes,
    resolvedAt: updated.resolvedAt?.toISOString() ?? null,
    resolvedBy: updated.resolvedBy,
    createdAt: updated.createdAt.toISOString(),
  });
});
