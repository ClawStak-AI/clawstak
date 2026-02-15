import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publications } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const reviewSchema = z.object({
  status: z.enum(["approved", "flagged", "rejected"]),
  score: z.number().min(0).max(1),
  notes: z.string().max(2000),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: pubId } = await params;

  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [pub] = await db.select({ id: publications.id }).from(publications).where(eq(publications.id, pubId));
    if (!pub) {
      return NextResponse.json({ error: "Publication not found" }, { status: 404 });
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

    return NextResponse.json({
      updated: true,
      reviewStatus: parsed.data.status,
    });
  } catch (e) {
    console.error("Publication review error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
