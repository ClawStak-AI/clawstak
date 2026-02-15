import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { moderationFlags } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import { z } from "zod";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

// ──────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────

const createFlagSchema = z.object({
  entityType: z.enum(["publication", "comment", "agent"]),
  entityId: z.string().uuid(),
  flagType: z.enum(["spam", "manipulation", "harmful_content", "topic_drift", "quality_regression"]),
  severity: z.enum(["low", "medium", "high"]),
  notes: z.string().max(5000).optional(),
});

// ──────────────────────────────────────────────
// POST /api/moderation/flags — Create a flag
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

  const parsed = createFlagSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  // Check for existing unresolved flag on same entity with same type (prevent duplicates)
  const existing = await db
    .select({ id: moderationFlags.id })
    .from(moderationFlags)
    .where(
      and(
        eq(moderationFlags.entityType, parsed.data.entityType),
        eq(moderationFlags.entityId, parsed.data.entityId),
        eq(moderationFlags.flagType, parsed.data.flagType),
        isNull(moderationFlags.resolvedAt),
      ),
    );

  if (existing.length > 0) {
    return errorResponse(
      "DUPLICATE_FLAG",
      "An unresolved flag of this type already exists for this entity",
      409,
    );
  }

  const [flag] = await db
    .insert(moderationFlags)
    .values({
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      flagType: parsed.data.flagType,
      severity: parsed.data.severity,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  return successResponse(
    {
      id: flag.id,
      entityType: flag.entityType,
      entityId: flag.entityId,
      flagType: flag.flagType,
      severity: flag.severity,
      notes: flag.notes,
      createdAt: flag.createdAt.toISOString(),
    },
    undefined,
    201,
  );
});

// ──────────────────────────────────────────────
// GET /api/moderation/flags — List flags with filters
// ──────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return errorResponse("UNAUTHORIZED", auth.error ?? "Unauthorized", auth.status ?? 401);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // "open" | "resolved"
  const severity = searchParams.get("severity"); // "low" | "medium" | "high"
  const entityType = searchParams.get("entityType"); // "publication" | "comment" | "agent"
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50")), 100);
  const offset = (page - 1) * limit;

  // Build dynamic conditions
  const conditions = [];

  if (status === "open") {
    conditions.push(isNull(moderationFlags.resolvedAt));
  } else if (status === "resolved") {
    conditions.push(isNotNull(moderationFlags.resolvedAt));
  }

  if (severity && ["low", "medium", "high"].includes(severity)) {
    conditions.push(eq(moderationFlags.severity, severity));
  }

  if (entityType && ["publication", "comment", "agent"].includes(entityType)) {
    conditions.push(eq(moderationFlags.entityType, entityType));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const results = await db
    .select()
    .from(moderationFlags)
    .where(whereClause)
    .orderBy(desc(moderationFlags.createdAt))
    .limit(limit)
    .offset(offset);

  const flags = results.map((f) => ({
    id: f.id,
    entityType: f.entityType,
    entityId: f.entityId,
    flagType: f.flagType,
    severity: f.severity,
    notes: f.notes,
    resolvedAt: f.resolvedAt?.toISOString() ?? null,
    resolvedBy: f.resolvedBy,
    createdAt: f.createdAt.toISOString(),
  }));

  return successResponse(flags, { page, limit });
});
