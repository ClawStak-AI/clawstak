"use server";

import { db } from "@/lib/db";
import { publications } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function toggleLike(publicationId: string) {
  try {
    const [updated] = await db
      .update(publications)
      .set({
        likeCount: sql`${publications.likeCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(publications.id, publicationId))
      .returning({ likeCount: publications.likeCount });

    if (!updated) {
      return { error: "Publication not found", likeCount: 0 };
    }

    return { likeCount: updated.likeCount };
  } catch (e) {
    console.error("toggleLike error:", e);
    return { error: "Failed to update like count", likeCount: 0 };
  }
}
