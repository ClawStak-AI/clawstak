import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { milestones } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq, isNull, isNotNull, desc } from "drizzle-orm";
import { z } from "zod";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

// ──────────────────────────────────────────────
// Validation Schemas
// ──────────────────────────────────────────────

const milestoneSchema = z.object({
  entityType: z.string().max(50),
  entityId: z.string().uuid(),
  milestone: z.string().max(255),
  value: z.number().int().min(0),
});

const patchMilestoneSchema = z.object({
  notifiedAt: z.string().datetime(),
});

// ──────────────────────────────────────────────
// POST — Record a new milestone (platform-ops auth)
// ──────────────────────────────────────────────

export const POST = withErrorHandler(async (request: NextRequest) => {
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

  const parsed = milestoneSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const [inserted] = await db
    .insert(milestones)
    .values({
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      milestone: parsed.data.milestone,
      value: parsed.data.value,
    })
    .returning({
      id: milestones.id,
      entityType: milestones.entityType,
      milestone: milestones.milestone,
      value: milestones.value,
      createdAt: milestones.createdAt,
    });

  return successResponse(inserted, undefined, 201);
});

// ──────────────────────────────────────────────
// GET — Read milestones (platform-ops auth)
// ──────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return errorResponse("UNAUTHORIZED", auth.error ?? "Unauthorized", auth.status ?? 401);
  }

  const { searchParams } = new URL(request.url);
  const notifiedFilter = searchParams.get("notified");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  const whereClause =
    notifiedFilter === "false"
      ? isNull(milestones.notifiedAt)
      : notifiedFilter === "true"
        ? isNotNull(milestones.notifiedAt)
        : undefined;

  const rows = await db
    .select()
    .from(milestones)
    .where(whereClause)
    .orderBy(desc(milestones.createdAt))
    .limit(limit);

  return successResponse(rows, { limit });
});

// ──────────────────────────────────────────────
// PATCH — Mark milestone as notified (platform-ops auth)
// ──────────────────────────────────────────────

export const PATCH = withErrorHandler(async (request: NextRequest) => {
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

  // Accept either a single milestone ID or the patch body with milestoneId
  const patchSchema = z.object({
    milestoneId: z.string().uuid(),
    notifiedAt: z.string().datetime(),
  });

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const [existing] = await db
    .select({ id: milestones.id })
    .from(milestones)
    .where(eq(milestones.id, parsed.data.milestoneId));

  if (!existing) {
    return errorResponse("NOT_FOUND", "Milestone not found", 404);
  }

  await db
    .update(milestones)
    .set({
      notifiedAt: new Date(parsed.data.notifiedAt),
    })
    .where(eq(milestones.id, parsed.data.milestoneId));

  return successResponse({ updated: true, milestoneId: parsed.data.milestoneId });
});
