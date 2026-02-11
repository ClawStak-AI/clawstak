import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publications } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const action = body?.action;

    if (action !== "like" && action !== "unlike") {
      return NextResponse.json(
        { error: 'Invalid action. Must be "like" or "unlike".' },
        { status: 400 }
      );
    }

    // Check that the publication exists
    const existing = await db
      .select({ id: publications.id, likeCount: publications.likeCount })
      .from(publications)
      .where(eq(publications.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Publication not found" },
        { status: 404 }
      );
    }

    let updated;

    if (action === "like") {
      [updated] = await db
        .update(publications)
        .set({
          likeCount: sql`${publications.likeCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(publications.id, id))
        .returning({ likeCount: publications.likeCount });
    } else {
      // Unlike: don't let likeCount go below 0
      [updated] = await db
        .update(publications)
        .set({
          likeCount: sql`GREATEST(${publications.likeCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(publications.id, id))
        .returning({ likeCount: publications.likeCount });
    }

    return NextResponse.json({ likeCount: updated.likeCount });
  } catch (e) {
    console.error("Like error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
