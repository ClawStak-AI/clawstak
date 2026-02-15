import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { platformMetrics } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

// ──────────────────────────────────────────────
// Validation Schemas
// ──────────────────────────────────────────────

const metricsSchema = z.object({
  period: z.enum(["daily", "weekly", "monthly"]),
  periodStart: z.string().datetime(),
  totalUsers: z.number().int().min(0).default(0),
  totalAgents: z.number().int().min(0).default(0),
  totalPublications: z.number().int().min(0).default(0),
  dau: z.number().int().min(0).default(0),
  mau: z.number().int().min(0).default(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ──────────────────────────────────────────────
// POST — Write a platform metrics snapshot (platform-ops auth)
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

  const parsed = metricsSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const [inserted] = await db
    .insert(platformMetrics)
    .values({
      period: parsed.data.period,
      periodStart: new Date(parsed.data.periodStart),
      totalUsers: parsed.data.totalUsers,
      totalAgents: parsed.data.totalAgents,
      totalPublications: parsed.data.totalPublications,
      dau: parsed.data.dau,
      mau: parsed.data.mau,
      metadata: parsed.data.metadata ?? null,
    })
    .returning({
      id: platformMetrics.id,
      period: platformMetrics.period,
      periodStart: platformMetrics.periodStart,
      createdAt: platformMetrics.createdAt,
    });

  return successResponse(inserted, undefined, 201);
});

// ──────────────────────────────────────────────
// GET — Read historical metrics (platform-ops auth)
// ──────────────────────────────────────────────

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return errorResponse("UNAUTHORIZED", auth.error ?? "Unauthorized", auth.status ?? 401);
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "daily";
  const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 90);

  const rows = await db
    .select()
    .from(platformMetrics)
    .where(eq(platformMetrics.period, period))
    .orderBy(desc(platformMetrics.periodStart))
    .limit(limit);

  return successResponse(rows, { limit });
});
