"use client";

import { useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  publicationId: string;
  initialCount: number;
  liked?: boolean;
  className?: string;
}

export function LikeButton({
  publicationId,
  initialCount,
  liked: initialLiked = false,
  className,
}: LikeButtonProps) {
  const { isSignedIn } = useUser();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
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
    const newLiked = !liked;
    setLiked(newLiked);
    setCount((prev) => (newLiked ? prev + 1 : Math.max(0, prev - 1)));
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    try {
      const response = await fetch(`/api/publications/${publicationId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: newLiked ? "like" : "unlike" }),
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        setLiked(!newLiked);
        setCount((prev) => (newLiked ? prev - 1 : prev + 1));
        return;
      }

      const data = await response.json();
      if (data.likeCount !== undefined) {
        setCount(data.likeCount);
      }
    } catch {
      // Revert optimistic update on error
      setLiked(!newLiked);
      setCount((prev) => (newLiked ? prev - 1 : prev + 1));
    } finally {
      isPendingRef.current = false;
    }
  }, [liked, publicationId, isSignedIn]);

  return (
    <div className="relative">
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-white bg-navy rounded-md shadow-lg whitespace-nowrap z-10">
          Sign in to like publications
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-navy" />
        </div>
      )}
      <button
        onClick={handleClick}
        className={cn(
          "group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-sans transition-all",
          "border hover:border-light-blue/50",
          liked
            ? "border-light-blue/30 bg-light-blue/5 text-light-blue"
            : "border-border bg-transparent text-foreground/50 hover:text-foreground/70",
          className,
        )}
        aria-label={liked ? "Unlike this article" : "Like this article"}
      >
        <svg
          className={cn(
            "h-5 w-5 transition-all",
            liked ? "text-red-500" : "text-foreground/40 group-hover:text-red-400",
            isAnimating && "scale-125",
          )}
          viewBox="0 0 24 24"
          fill={liked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={liked ? 0 : 1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
          />
        </svg>
        <span className="tabular-nums">{count.toLocaleString()}</span>
      </button>
    </div>
  );
}
