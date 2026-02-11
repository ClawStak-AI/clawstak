import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comments, users } from "@/lib/db/schema";
import { eq, isNull, asc } from "drizzle-orm";

// GET /api/publications/[id]/comments — fetch threaded comments
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: publicationId } = await params;

  try {
    // Fetch all comments for this publication
    const allComments = await db
      .select({
        id: comments.id,
        content: comments.content,
        guestName: comments.guestName,
        parentId: comments.parentId,
        likeCount: comments.likeCount,
        createdAt: comments.createdAt,
        userId: comments.userId,
      })
      .from(comments)
      .where(eq(comments.publicationId, publicationId))
      .orderBy(asc(comments.createdAt));

    // Get user names for comments with userId
    const userIds = allComments
      .filter((c) => c.userId)
      .map((c) => c.userId!);

    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const userRows = await db
        .select({ id: users.id, name: users.name })
        .from(users);
      userMap = Object.fromEntries(
        userRows.map((u) => [u.id, u.name || "User"])
      );
    }

    // Build threaded structure
    type CommentNode = {
      id: string;
      content: string;
      guestName: string | null;
      userName: string | null;
      parentId: string | null;
      likeCount: number;
      createdAt: string;
      replies: CommentNode[];
    };

    const commentMap = new Map<string, CommentNode>();
    const topLevel: CommentNode[] = [];

    for (const c of allComments) {
      const node: CommentNode = {
        id: c.id,
        content: c.content,
        guestName: c.guestName,
        userName: c.userId ? (userMap[c.userId] || null) : null,
        parentId: c.parentId,
        likeCount: c.likeCount,
        createdAt: c.createdAt.toISOString(),
        replies: [],
      };
      commentMap.set(c.id, node);
    }

    for (const node of commentMap.values()) {
      if (node.parentId && commentMap.has(node.parentId)) {
        commentMap.get(node.parentId)!.replies.push(node);
      } else {
        topLevel.push(node);
      }
    }

    return NextResponse.json({ comments: topLevel });
  } catch {
    return NextResponse.json({ comments: [] });
  }
}

// POST /api/publications/[id]/comments — add a comment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: publicationId } = await params;

  try {
    const body = await req.json();
    const { content, guestName, parentId } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: "Comment too long (max 5000 characters)" },
        { status: 400 }
      );
    }

    const [newComment] = await db
      .insert(comments)
      .values({
        publicationId,
        content: content.trim(),
        guestName: guestName || "Anonymous Reader",
        parentId: parentId || null,
      })
      .returning();

    return NextResponse.json({
      id: newComment.id,
      content: newComment.content,
      guestName: newComment.guestName,
      userName: null,
      parentId: newComment.parentId,
      likeCount: 0,
      createdAt: newComment.createdAt.toISOString(),
      replies: [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to post comment" },
      { status: 500 }
    );
  }
}
