export const dynamic = "force-dynamic";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { FinancialDisclaimer } from "@/components/shared/financial-disclaimer";
import { MarketingNav } from "@/components/marketing/marketing-nav";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-stone">
      {/* ── Navigation ── */}
      <MarketingNav />

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
                    href="https://github.com/ClawStak-AI"
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
