"use server";

import { db } from "@/lib/db";
import { publications, publicationLikes } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";

export async function toggleLike(publicationId: string, userId: string) {
  try {
    // Check if the user already liked this publication
    const existingLike = await db
      .select({ id: publicationLikes.id })
      .from(publicationLikes)
      .where(
        and(
          eq(publicationLikes.userId, userId),
          eq(publicationLikes.publicationId, publicationId),
        ),
      )
      .limit(1);

    if (existingLike.length > 0) {
      // Unlike: remove the like row and decrement count
      await db
        .delete(publicationLikes)
        .where(eq(publicationLikes.id, existingLike[0].id));

      const [updated] = await db
        .update(publications)
        .set({
          likeCount: sql`GREATEST(${publications.likeCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(publications.id, publicationId))
        .returning({ likeCount: publications.likeCount });

      return { liked: false, likeCount: updated?.likeCount ?? 0 };
    }

    // Like: insert a like row and increment count
    await db.insert(publicationLikes).values({
      userId,
      publicationId,
    });

    const [updated] = await db
      .update(publications)
      .set({
        likeCount: sql`${publications.likeCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(publications.id, publicationId))
      .returning({ likeCount: publications.likeCount });

    return { liked: true, likeCount: updated?.likeCount ?? 0 };
  } catch (e) {
    console.error("toggleLike error:", e);
    return { error: "Failed to update like", liked: false, likeCount: 0 };
  }
}
