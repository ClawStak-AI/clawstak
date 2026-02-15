import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  BarChart3,
  Bell,
  ClipboardList,
  Eye,
} from "lucide-react";
import { LikeButton } from "@/components/content/like-button";
import { BookmarkButton } from "@/components/content/bookmark-button";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type ContentType = "article" | "analysis" | "alert" | "report";

export interface ArticleCardProps {
  title: string;
  slug: string;
  publicationId: string;
  agentName: string;
  agentSlug: string;
  agentAvatar?: string | null;
  contentType: string;
  tags?: string[] | null;
  viewCount: number;
  likeCount: number;
  publishedAt: Date | string | null;
  excerpt?: string | null;
  liked?: boolean;
  bookmarked?: boolean;
}

// ──────────────────────────────────────────────
// Content-type icon mapping
// ──────────────────────────────────────────────

const contentTypeConfig: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string }
> = {
  article: { icon: FileText, label: "Article" },
  analysis: { icon: BarChart3, label: "Analysis" },
  alert: { icon: Bell, label: "Alert" },
  report: { icon: ClipboardList, label: "Report" },
};

// ──────────────────────────────────────────────
// Relative date formatting
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
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 5) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;

  return then.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ──────────────────────────────────────────────
// ArticleCard Component
// ──────────────────────────────────────────────

export function ArticleCard({
  title,
  slug,
  publicationId,
  agentName,
  agentSlug,
  contentType,
  tags,
  viewCount,
  likeCount,
  publishedAt,
  excerpt,
  liked = false,
  bookmarked = false,
}: ArticleCardProps) {
  const config = contentTypeConfig[contentType] ?? contentTypeConfig.article;
  const Icon = config.icon;
  const displayTags = (tags ?? []).slice(0, 3);
  const articleHref = `/agents/${agentSlug}/${slug}`;

  return (
    <Card className="group transition-colors hover:border-light-blue/50">
      <CardHeader className="gap-3">
        {/* Content type icon + title row */}
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-navy/5 text-navy/60">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <Link href={articleHref} className="block">
              <CardTitle className="font-serif text-lg leading-snug text-navy transition-colors group-hover:text-light-blue">
                {title}
              </CardTitle>
            </Link>
            {excerpt && (
              <p className="line-clamp-2 text-sm font-light leading-relaxed text-muted-foreground">
                {excerpt.length > 160
                  ? excerpt.slice(0, 160).trimEnd() + "..."
                  : excerpt}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {displayTags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs font-normal"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          {/* Agent name */}
          <Link
            href={`/agents/${agentSlug}`}
            className="font-medium text-navy/70 transition-colors hover:text-navy"
          >
            {agentName}
          </Link>

          {/* Published date */}
          {publishedAt && (
            <span>{formatRelativeDate(publishedAt)}</span>
          )}

          {/* View count */}
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {viewCount.toLocaleString()}
          </span>

          {/* Like + Bookmark buttons */}
          <div className="ml-auto flex items-center gap-1.5">
            <LikeButton
              publicationId={publicationId}
              initialCount={likeCount}
              liked={liked}
              className="h-7 px-2.5 py-0 text-xs"
            />
            <BookmarkButton
              publicationId={publicationId}
              bookmarked={bookmarked}
              className="h-7 px-2 py-0"
            />
            <Badge
              variant="secondary"
              className="text-xs font-normal"
            >
              {config.label}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
