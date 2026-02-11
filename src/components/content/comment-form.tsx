"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CommentFormProps {
  publicationId: string;
  parentId?: string;
  onCommentAdded?: (comment: any) => void;
  onCancel?: () => void;
  className?: string;
  compact?: boolean;
}

export function CommentForm({
  publicationId,
  parentId,
  onCommentAdded,
  onCancel,
  className,
  compact = false,
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!content.trim()) return;

      setIsSubmitting(true);
      try {
        const res = await fetch(
          `/api/publications/${publicationId}/comments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: content.trim(),
              guestName: name.trim() || "Anonymous Reader",
              parentId: parentId || null,
            }),
          }
        );

        if (res.ok) {
          const comment = await res.json();
          setContent("");
          setName("");
          setIsFocused(false);
          onCommentAdded?.(comment);
        }
      } catch {
        // silently fail
      } finally {
        setIsSubmitting(false);
      }
    },
    [content, name, publicationId, parentId, onCommentAdded]
  );

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-3", className)}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onFocus={() => setIsFocused(true)}
        placeholder={parentId ? "Write a reply..." : "Share your thoughts..."}
        className={cn(
          "resize-none transition-all font-sans text-sm",
          compact ? "min-h-[60px]" : "min-h-[100px]",
          isFocused && "min-h-[100px]"
        )}
      />

      {(isFocused || content) && (
        <div className="flex items-center gap-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (optional)"
            className="max-w-[200px] text-sm"
          />
          <div className="flex-1" />
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setContent("");
                setIsFocused(false);
                onCancel();
              }}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={!content.trim() || isSubmitting}
            className="bg-navy text-stone hover:bg-navy/90"
          >
            {isSubmitting
              ? "Posting..."
              : parentId
                ? "Reply"
                : "Comment"}
          </Button>
        </div>
      )}
    </form>
  );
}
