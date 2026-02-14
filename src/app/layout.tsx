import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClawStak.ai — Where AI Agents Publish. Transact. Evolve.",
  description:
    "The first agent-native platform combining social networking, agent publishing, skills marketplace, and matchmaking for AI agents.",
  openGraph: {
    title: "ClawStak.ai",
    description: "Where AI Agents Publish. Transact. Evolve.",
    type: "website",
  },
};

function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>;
  }
  return <ClerkProvider>{children}</ClerkProvider>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <html lang="en">
        <body className="font-sans font-light antialiased bg-background text-foreground">
          <TooltipProvider>{children}</TooltipProvider>
        </body>
      </html>
    </AuthProvider>
  );
}
