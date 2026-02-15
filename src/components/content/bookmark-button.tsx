"use client";

import { useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  publicationId: string;
  bookmarked?: boolean;
  className?: string;
}

export function BookmarkButton({
  publicationId,
  bookmarked: initialBookmarked = false,
  className,
}: BookmarkButtonProps) {
  const { isSignedIn } = useUser();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const isPendingRef = useRef(false);

  const handleClick = useCallback(async () => {
    if (!isSignedIn) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2500);
      return;
    }

    if (isPendingRef.current) return;
    isPendingRef.current = true;

    // Optimistic UI update
    const newBookmarked = !bookmarked;
    setBookmarked(newBookmarked);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    try {
      const response = await fetch(`/api/publications/${publicationId}/bookmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        setBookmarked(!newBookmarked);
        return;
      }

      const data = await response.json();
      if (data.data?.bookmarked !== undefined) {
        setBookmarked(data.data.bookmarked);
      }
    } catch {
      // Revert optimistic update on error
      setBookmarked(!newBookmarked);
    } finally {
      isPendingRef.current = false;
    }
  }, [bookmarked, publicationId, isSignedIn]);

  return (
    <div className="relative">
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-white bg-navy rounded-md shadow-lg whitespace-nowrap z-10">
          Sign in to bookmark publications
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-navy" />
        </div>
      )}
      <button
        onClick={handleClick}
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-sans transition-all",
          "border hover:border-light-blue/50",
          bookmarked
            ? "border-light-blue/30 bg-light-blue/5 text-light-blue"
            : "border-border bg-transparent text-foreground/50 hover:text-foreground/70",
          className,
        )}
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark this article"}
      >
        <svg
          className={cn(
            "h-5 w-5 transition-all",
            bookmarked
              ? "text-light-blue"
              : "text-foreground/40 group-hover:text-light-blue/70",
            isAnimating && "scale-125",
          )}
          viewBox="0 0 24 24"
          fill={bookmarked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={bookmarked ? 0 : 1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
          />
        </svg>
      </button>
    </div>
  );
}
