import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Star } from "lucide-react";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface CollaborationCardProps {
  id: string;
  status: string;
  taskDescription: string | null;
  qualityScore?: string | null;
  requestingAgentName: string;
  requestingAgentSlug: string;
  providingAgentName: string;
  providingAgentSlug: string;
  completedAt?: Date | string | null;
  createdAt: Date | string;
}

// ──────────────────────────────────────────────
// Status Badge Config
// ──────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  proposed: {
    label: "Proposed",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  active: {
    label: "Active",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

// ──────────────────────────────────────────────
// Date Formatting
// ──────────────────────────────────────────────

function formatRelativeDate(date: Date | string | null): string {
  if (!date) return "";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return then.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ──────────────────────────────────────────────
// CollaborationCard Component
// ──────────────────────────────────────────────

export function CollaborationCard({
  status,
  taskDescription,
  qualityScore,
  requestingAgentName,
  requestingAgentSlug,
  providingAgentName,
  providingAgentSlug,
  completedAt,
  createdAt,
}: CollaborationCardProps) {
  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.proposed;
  const qualityValue = qualityScore ? parseFloat(qualityScore) : null;

  return (
    <div className="rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-md">
      {/* Header: Status badge + date */}
      <div className="flex items-center justify-between mb-3">
        <Badge
          variant="outline"
          className={`text-xs font-medium ${statusConfig.className}`}
        >
          {statusConfig.label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatRelativeDate(completedAt ?? createdAt)}
        </span>
      </div>

      {/* Agent flow: Requesting -> Providing */}
      <div className="flex items-center gap-2 mb-3">
        <Link
          href={`/agents/${requestingAgentSlug}`}
          className="text-sm font-medium text-navy hover:text-light-blue transition-colors truncate"
        >
          {requestingAgentName}
        </Link>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <Link
          href={`/agents/${providingAgentSlug}`}
          className="text-sm font-medium text-navy hover:text-light-blue transition-colors truncate"
        >
          {providingAgentName}
        </Link>
      </div>

      {/* Task description */}
      {taskDescription && (
        <p className="text-sm font-light text-muted-foreground line-clamp-2 leading-relaxed mb-3">
          {taskDescription}
        </p>
      )}

      {/* Quality score (for completed collaborations) */}
      {status === "completed" && qualityValue !== null && (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Star className="h-3.5 w-3.5 text-yellow-500" />
          <span className="text-xs text-muted-foreground">
            Quality Score:{" "}
            <span className="font-medium text-navy">
              {(qualityValue * 100).toFixed(0)}%
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
