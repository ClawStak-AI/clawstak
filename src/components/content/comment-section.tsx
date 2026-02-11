"use client";

import { useState, useEffect, useCallback } from "react";
import { CommentForm } from "./comment-form";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  content: string;
  guestName: string | null;
  userName: string | null;
  parentId: string | null;
  likeCount: number;
  createdAt: string;
  replies?: Comment[];
}

interface CommentSectionProps {
  publicationId: string;
  className?: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function CommentCard({
  comment,
  publicationId,
  onReplyAdded,
  depth = 0,
}: {
  comment: Comment;
  publicationId: string;
  onReplyAdded: (comment: Comment) => void;
  depth?: number;
}) {
  const [showReply, setShowReply] = useState(false);
  const displayName = comment.userName || comment.guestName || "Anonymous";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className={cn("group", depth > 0 && "ml-8 border-l-2 border-navy/5 pl-4")}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/8 text-xs font-medium text-navy/60">
          {initial}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-navy">{displayName}</span>
            <span className="text-foreground/30">&middot;</span>
            <span className="text-xs text-foreground/40">
              {timeAgo(comment.createdAt)}
            </span>
          </div>

          {/* Content */}
          <p className="mt-1 text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">
            {comment.content}
          </p>

          {/* Actions */}
          <div className="mt-2 flex items-center gap-4">
            {depth < 2 && (
              <button
                onClick={() => setShowReply(!showReply)}
                className="text-xs text-foreground/40 hover:text-navy transition-colors"
              >
                Reply
              </button>
            )}
            {comment.likeCount > 0 && (
              <span className="text-xs text-foreground/30 flex items-center gap-1">
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                {comment.likeCount}
              </span>
            )}
          </div>

          {/* Reply form */}
          {showReply && (
            <div className="mt-3">
              <CommentForm
                publicationId={publicationId}
                parentId={comment.id}
                compact
                onCommentAdded={(newComment) => {
                  setShowReply(false);
                  onReplyAdded(newComment);
                }}
                onCancel={() => setShowReply(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              publicationId={publicationId}
              onReplyAdded={onReplyAdded}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentSection({
  publicationId,
  className,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/publications/${publicationId}/comments`
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [publicationId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleNewComment = useCallback(() => {
    fetchComments();
  }, [fetchComments]);

  const totalCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies?.length || 0),
    0
  );

  return (
    <section className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="font-serif text-xl text-navy">Discussion</h2>
        <span className="text-sm text-foreground/40 font-sans">
          {totalCount > 0
            ? `${totalCount} comment${totalCount !== 1 ? "s" : ""}`
            : ""}
        </span>
      </div>

      {/* New comment form */}
      <CommentForm
        publicationId={publicationId}
        onCommentAdded={handleNewComment}
      />

      {/* Comments list */}
      {isLoading ? (
        <div className="py-8 text-center">
          <p className="text-sm text-foreground/40 font-sans">
            Loading discussion...
          </p>
        </div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center rounded-lg border border-dashed border-navy/10">
          <p className="text-sm text-foreground/40 font-sans">
            Be the first to comment on this article.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              publicationId={publicationId}
              onReplyAdded={handleNewComment}
            />
          ))}
        </div>
      )}
    </section>
  );
}
