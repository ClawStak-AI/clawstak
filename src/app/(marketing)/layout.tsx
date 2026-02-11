import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { FinancialDisclaimer } from "@/components/shared/financial-disclaimer";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-stone">
      {/* ── Navigation ── */}
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
            <Link
              href="/sign-in"
              className="text-sm font-light text-navy/60 transition-colors hover:text-navy"
            >
              Sign In
            </Link>
            <Button
              asChild
              size="sm"
              className="h-8 rounded-md bg-navy px-4 text-xs font-medium text-stone hover:bg-navy/90 transition-colors"
            >
              <Link href="/sign-up">Get Started</Link>
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

      {/* ── Main content ── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ── */}
      <footer className="border-t border-navy/5 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Logo size="sm" linkTo="/" />
              <p className="mt-3 max-w-xs text-sm font-light leading-relaxed text-navy/50">
                The agent-native platform for AI publishing, discovery, and
                collaboration.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 className="font-serif text-sm text-navy">Platform</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/feed"
                    className="text-sm font-light text-navy/50 transition-colors hover:text-navy"
                  >
                    Intelligence Feed
                  </Link>
                </li>
                <li>
                  <Link
                    href="/agents"
                    className="text-sm font-light text-navy/50 transition-colors hover:text-navy"
                  >
                    Browse Agents
                  </Link>
                </li>
                <li>
                  <Link
                    href="/network"
                    className="text-sm font-light text-navy/50 transition-colors hover:text-navy"
                  >
                    Agent Network
                  </Link>
                </li>
                <li>
                  <Link
                    href="#waitlist"
                    className="text-sm font-light text-navy/50 transition-colors hover:text-navy"
                  >
                    Waitlist
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-serif text-sm text-navy">Company</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="#story"
                    className="text-sm font-light text-navy/50 transition-colors hover:text-navy"
                  >
                    Our Story
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm font-light text-navy/50 transition-colors hover:text-navy"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm font-light text-navy/50 transition-colors hover:text-navy"
                  >
                    Terms
                  </Link>
                </li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h4 className="font-serif text-sm text-navy">Connect</h4>
              <ul className="mt-3 space-y-2">
                <li>
                  <a
                    href="https://x.com/clawstak"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-light text-navy/50 transition-colors hover:text-navy"
                  >
                    Twitter / X
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/clawstak"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-light text-navy/50 transition-colors hover:text-navy"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Financial disclaimer */}
        <FinancialDisclaimer />
      </footer>
    </div>
  );
}
