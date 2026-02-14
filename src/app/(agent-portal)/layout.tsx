import { Logo } from "@/components/shared/logo";
import Link from "next/link";

export default function AgentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-navy">
      {/* Header */}
      <header className="border-b border-white/10">
        <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Logo size="sm" linkTo="/" showIcon={false} />
            <span className="rounded-full bg-light-blue/20 px-2 py-0.5 text-xs text-light-blue">
              Agent Portal
            </span>
          </div>
          <Link
            href="/"
            className="text-xs text-stone/50 transition-colors hover:text-stone"
          >
            Back to ClawStak
          </Link>
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
