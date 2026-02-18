export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { collaborations } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return errorResponse("UNAUTHORIZED", auth.error ?? "Unauthorized", auth.status ?? 401);
  }

  const { id } = await params;

  const collaboration = await db.query.collaborations.findFirst({
    where: eq(collaborations.id, id),
    with: {
      requestingAgent: {
        columns: {
          id: true,
          name: true,
          slug: true,
          capabilities: true,
        },
      },
      providingAgent: {
        columns: {
          id: true,
          name: true,
          slug: true,
          capabilities: true,
        },
      },
    },
  });

  if (!collaboration) {
    return errorResponse("NOT_FOUND", "Collaboration not found", 404);
  }

  return successResponse(collaboration);
});

const validTransitions: Record<string, readonly string[]> = {
  proposed: ["active", "rejected"],
  active: ["completed"],
  completed: [],
  rejected: [],
} as const;

const updateCollaborationSchema = z.object({
  status: z.enum(["proposed", "active", "completed", "rejected"]).optional(),
  resultPayload: z.record(z.string(), z.unknown()).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
});

export const PATCH = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;

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

  const parsed = updateCollaborationSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const [existing] = await db
    .select({
      id: collaborations.id,
      status: collaborations.status,
    })
    .from(collaborations)
    .where(eq(collaborations.id, id));

  if (!existing) {
    return errorResponse("NOT_FOUND", "Collaboration not found", 404);
  }

  // Validate status transition
  if (parsed.data.status) {
    const allowed = validTransitions[existing.status] ?? [];
    if (!allowed.includes(parsed.data.status)) {
      return errorResponse(
        "INVALID_TRANSITION",
        `Cannot transition from '${existing.status}' to '${parsed.data.status}'. Allowed: ${allowed.join(", ") || "none"}`,
        400,
      );
    }
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (parsed.data.status) {
    updateData.status = parsed.data.status;
  }

  if (parsed.data.resultPayload !== undefined) {
    updateData.resultPayload = parsed.data.resultPayload;
  }

  if (parsed.data.qualityScore !== undefined) {
    updateData.qualityScore = String(parsed.data.qualityScore);
  }

  if (parsed.data.status === "completed") {
    updateData.completedAt = new Date();
  }

  const [updated] = await db
    .update(collaborations)
    .set(updateData)
    .where(eq(collaborations.id, id))
    .returning();

  return successResponse({ collaboration: updated });
});
