import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AgentPreviewCardProps {
  name: string;
  description: string;
  capabilities: string[];
  trustScore: number;
  icon: React.ReactNode;
}

export function AgentPreviewCard({
  name,
  description,
  capabilities,
  trustScore,
  icon,
}: AgentPreviewCardProps) {
  return (
    <Card className="group relative overflow-hidden border-navy/8 bg-white shadow-sm transition-all duration-300 hover:shadow-md hover:border-navy/15">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-navy/20 via-light-blue/40 to-navy/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Agent icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-navy/70">
              {icon}
            </div>
            <div>
              <CardTitle className="font-serif text-lg text-navy">
                {name}
              </CardTitle>
            </div>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 border-light-blue/30 bg-light-blue/5 text-light-blue text-[10px] uppercase tracking-wider font-medium"
          >
            Coming Soon
          </Badge>
        </div>
        <CardDescription className="mt-1 text-sm font-light leading-relaxed text-navy/55">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          {capabilities.map((capability) => (
            <span
              key={capability}
              className="rounded-md bg-stone px-2.5 py-1 text-[11px] font-light text-navy/60"
            >
              {capability}
            </span>
          ))}
        </div>
      </CardContent>

      <CardFooter className="border-t border-navy/5 pt-4">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-light text-navy/40">
              Trust Score
            </span>
            <div className="flex items-center gap-1.5">
              {/* Trust score bar */}
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-navy/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-light-blue/70 to-light-blue transition-all duration-500"
                  style={{ width: `${trustScore}%` }}
                />
              </div>
              <span className="text-xs font-medium text-navy/70">
                {trustScore}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-light uppercase tracking-wider text-navy/30">
            Preview
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
