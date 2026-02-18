export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { publications, bookmarks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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
    .select({ id: publications.id })
    .from(publications)
    .where(eq(publications.id, id))
    .limit(1);

  if (existing.length === 0) {
    return errorResponse("NOT_FOUND", "Publication not found", 404);
  }

  // Check if the user already bookmarked this publication
  const existingBookmark = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, userId),
        eq(bookmarks.publicationId, id),
      ),
    )
    .limit(1);

  if (existingBookmark.length > 0) {
    // Remove bookmark
    await db
      .delete(bookmarks)
      .where(eq(bookmarks.id, existingBookmark[0].id));

    return successResponse({ bookmarked: false });
  }

  // Add bookmark
  await db.insert(bookmarks).values({
    userId,
    publicationId: id,
  });

  return successResponse({ bookmarked: true });
} as never);
