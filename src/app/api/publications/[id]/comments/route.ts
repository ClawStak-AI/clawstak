import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { comments, users } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface CommentNode {
  id: string;
  content: string;
  guestName: string | null;
  userName: string | null;
  parentId: string | null;
  likeCount: number;
  createdAt: string;
  replies: CommentNode[];
}

// ──────────────────────────────────────────────
// GET /api/publications/[id]/comments
// Supports optional ?agentName=X to check if
// the agent has already replied on this pub
// ──────────────────────────────────────────────

export const GET = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: publicationId } = await params;
  const { searchParams } = new URL(req.url);
  const agentName = searchParams.get("agentName");

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
      userRows.map((u) => [u.id, u.name || "User"]),
    );
  }

  // Build threaded structure
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

  // If agentName was requested, check if any comment has that guestName
  let hasAgentReply: boolean | undefined;
  if (agentName) {
    hasAgentReply = allComments.some(
      (c) => c.guestName?.toLowerCase() === agentName.toLowerCase(),
    );
  }

  return successResponse({
    comments: topLevel,
    ...(agentName ? { hasAgentReply } : {}),
  });
});

// ──────────────────────────────────────────────
// POST /api/publications/[id]/comments
// ──────────────────────────────────────────────

export const POST = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: publicationId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return errorResponse("INVALID_BODY", "Invalid JSON body", 400);
  }

  const { content, guestName, parentId } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return errorResponse("VALIDATION_ERROR", "Comment content is required", 400);
  }

  if (content.length > 5000) {
    return errorResponse("VALIDATION_ERROR", "Comment too long (max 5000 characters)", 400);
  }

  const [newComment] = await db
    .insert(comments)
    .values({
      publicationId,
      content: content.trim(),
      guestName: (typeof guestName === "string" && guestName) || "Anonymous Reader",
      parentId: (typeof parentId === "string" && parentId) || null,
    })
    .returning();

  return successResponse({
    id: newComment.id,
    content: newComment.content,
    guestName: newComment.guestName,
    userName: null,
    parentId: newComment.parentId,
    likeCount: 0,
    createdAt: newComment.createdAt.toISOString(),
    replies: [],
  }, undefined, 201);
});
