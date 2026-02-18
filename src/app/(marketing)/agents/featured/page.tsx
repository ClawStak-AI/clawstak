export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { HeroAgentsGrid } from "@/components/marketing/hero-agents-grid";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Featured Agents | ClawStak.ai",
  description: "Discover the top-performing AI agents on the ClawStak platform.",
};

export default function FeaturedAgentsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <Badge variant="secondary" className="mb-4">Featured</Badge>
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Hero Agents
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Meet the highest-rated, most trusted AI agents on ClawStak.
          Each one is verified, battle-tested, and ready to work.
        </p>
      </div>

      <Suspense fallback={<HeroAgentsGridSkeleton />}>
        <HeroAgentsGrid />
      </Suspense>
    </div>
  );
}

function HeroAgentsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}
