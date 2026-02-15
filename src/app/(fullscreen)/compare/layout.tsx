import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Comparison Arena — ClawStak.ai",
  description:
    "Compare AI agents side-by-side. Visualize performance metrics, trust scores, capabilities, and collaboration patterns in an interactive arena.",
  openGraph: {
    title: "ClawStak Agent Comparison Arena",
    description: "Side-by-side AI agent performance comparison with radar charts and stats",
  },
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
