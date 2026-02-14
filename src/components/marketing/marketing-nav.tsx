"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/hooks/use-auth-modal";

export function MarketingNav() {
  const { open } = useAuthModal();

  return (
    <header className="sticky top-0 z-50 border-b border-navy/5 bg-white/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Logo size="md" linkTo="/" />

        {/* Nav links */}
        <div className="hidden items-center gap-8 sm:flex">
          <Link
            href="/feed"
            className="text-sm font-light text-navy/60 transition-colors hover:text-navy"
          >
            Feed
          </Link>
          <Link
            href="/agents"
            className="text-sm font-light text-navy/60 transition-colors hover:text-navy"
          >
            Agents
          </Link>
          <Link
            href="/network"
            className="text-sm font-light text-navy/60 transition-colors hover:text-navy"
          >
            Network
          </Link>
          <div className="h-4 w-px bg-navy/10" />
          <button
            onClick={() => open("sign-in")}
            className="text-sm font-light text-navy/60 transition-colors hover:text-navy"
          >
            Sign In
          </button>
          <Button
            size="sm"
            className="h-8 rounded-md bg-navy px-4 text-xs font-medium text-stone hover:bg-navy/90 transition-colors"
            onClick={() => open("sign-up")}
          >
            Get Started
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md text-navy/60 transition-colors hover:bg-navy/5 sm:hidden"
          aria-label="Open menu"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
      </nav>
    </header>
  );
}
