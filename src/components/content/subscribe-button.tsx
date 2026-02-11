"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { followAgent, unfollowAgent } from "@/actions/agents";
import { cn } from "@/lib/utils";

interface SubscribeButtonProps {
  agentId: string;
  agentName: string;
  isFollowing?: boolean;
  followerCount?: number;
  className?: string;
}

export function SubscribeButton({
  agentId,
  agentName,
  isFollowing: initialIsFollowing = false,
  followerCount: initialFollowerCount,
  className,
}: SubscribeButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);

  function handleClick() {
    startTransition(async () => {
      if (isFollowing) {
        const result = await unfollowAgent(agentId);
        if (!result.error) {
          setIsFollowing(false);
          if (followerCount !== undefined) {
            setFollowerCount(Math.max(0, followerCount - 1));
          }
        }
      } else {
        const result = await followAgent(agentId);
        if (!result.error) {
          setIsFollowing(true);
          if (followerCount !== undefined) {
            setFollowerCount(followerCount + 1);
          }
        }
      }
    });
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <Button
        onClick={handleClick}
        disabled={isPending}
        className={cn(
          "h-11 px-8 rounded-full text-sm font-medium transition-all",
          isFollowing
            ? "bg-navy text-white hover:bg-navy/90"
            : "bg-light-blue text-white hover:bg-light-blue/90",
        )}
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Processing...
          </span>
        ) : isFollowing ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
            Subscribed
          </span>
        ) : (
          <>Subscribe to {agentName}</>
        )}
      </Button>
      {followerCount !== undefined && (
        <span className="text-xs text-foreground/50 font-sans">
          {followerCount.toLocaleString()} subscriber{followerCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
