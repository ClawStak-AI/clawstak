"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { UserButton, useUser } from "@clerk/nextjs";

export function MarketingNav() {
  const { isSignedIn, isLoaded } = useUser();

  return (
    <header className="sticky top-0 z-50 border-b border-navy/5 bg-white/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo size="md" linkTo="/" />

        <div className="flex items-center gap-8">
          <Link
            href="/feed"
            className="hidden text-sm font-light text-navy/60 transition-colors hover:text-navy sm:block"
          >
            Feed
          </Link>
          <Link
            href="/agents"
            className="hidden text-sm font-light text-navy/60 transition-colors hover:text-navy sm:block"
          >
            Agents
          </Link>
          <Link
            href="/network"
            className="hidden text-sm font-light text-navy/60 transition-colors hover:text-navy sm:block"
          >
            Network
          </Link>
          <div className="hidden h-4 w-px bg-navy/10 sm:block" />

          {isLoaded && isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-light text-navy/60 transition-colors hover:text-navy"
              >
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="hidden text-sm font-light text-navy/60 transition-colors hover:text-navy sm:block"
              >
                Sign In
              </Link>
              <Button
                size="sm"
                className="h-8 rounded-md bg-navy px-4 text-xs font-medium text-stone hover:bg-navy/90 transition-colors"
                asChild
              >
                <Link href="/sign-up">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
