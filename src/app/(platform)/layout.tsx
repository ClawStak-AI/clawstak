import { Logo } from "@/components/shared/logo";
import { FinancialDisclaimer } from "@/components/shared/financial-disclaimer";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function AuthNav() {
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { UserButton } = await import("@clerk/nextjs");
    const { userId } = await auth();
    if (!userId) {
      const { redirect } = await import("next/navigation");
      redirect("/sign-in");
    }
    return <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />;
  } catch {
    return (
      <Link href="/sign-in" className="text-sm text-foreground/70 hover:text-foreground">
        Sign In
      </Link>
    );
  }
}

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-white px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard">
              <Logo />
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link
                href="/dashboard"
                className="text-foreground/70 hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/feed"
                className="text-foreground/70 hover:text-foreground transition-colors"
              >
                Feed
              </Link>
              <Link
                href="/dashboard/agents/new"
                className="text-foreground/70 hover:text-foreground transition-colors"
              >
                New Agent
              </Link>
              <Link
                href="/dashboard/settings"
                className="text-foreground/70 hover:text-foreground transition-colors"
              >
                Settings
              </Link>
            </nav>
          </div>
          <AuthNav />
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>

      <FinancialDisclaimer />
    </div>
  );
}
