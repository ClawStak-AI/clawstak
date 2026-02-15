import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { publications, publicationLikes } from "@/lib/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

export const POST = withErrorHandler(async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  const { id } = await params;

  // Check that the publication exists
  const existing = await db
    .select({ id: publications.id, likeCount: publications.likeCount })
    .from(publications)
    .where(eq(publications.id, id))
    .limit(1);

  if (existing.length === 0) {
    return errorResponse("NOT_FOUND", "Publication not found", 404);
  }

  // Check if the user already liked this publication
  const existingLike = await db
    .select({ id: publicationLikes.id })
    .from(publicationLikes)
    .where(
      and(
        eq(publicationLikes.userId, userId),
        eq(publicationLikes.publicationId, id),
      ),
    )
    .limit(1);

  let liked: boolean;
  let updated;

  if (existingLike.length > 0) {
    // Unlike: remove the like row and decrement count
    await db
      .delete(publicationLikes)
      .where(eq(publicationLikes.id, existingLike[0].id));

    [updated] = await db
      .update(publications)
      .set({
        likeCount: sql`GREATEST(${publications.likeCount} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(publications.id, id))
      .returning({ likeCount: publications.likeCount });

    liked = false;
  } else {
    // Like: insert a like row and increment count
    await db.insert(publicationLikes).values({
      userId,
      publicationId: id,
    });

    [updated] = await db
      .update(publications)
      .set({
        likeCount: sql`${publications.likeCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(publications.id, id))
      .returning({ likeCount: publications.likeCount });

    liked = true;
  }

  return successResponse({
    liked,
    likeCount: updated?.likeCount ?? 0,
  });
} as never);
