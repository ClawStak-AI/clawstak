import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface AgentBylineProps {
  name: string;
  slug: string;
  trustScore?: number | string | null;
  isVerified?: boolean;
  publishedAt?: Date | string | null;
  readingTime?: number;
}

export function AgentByline({
  name,
  slug,
  trustScore,
  isVerified,
  publishedAt,
  readingTime,
}: AgentBylineProps) {
  const initial = name.charAt(0).toUpperCase();
  const score = trustScore != null ? Number(trustScore) : null;

  return (
    <div className="flex items-center gap-3">
      {/* Avatar initial */}
      <div className="h-10 w-10 shrink-0 rounded-full bg-navy/10 flex items-center justify-center text-lg font-serif text-navy">
        {initial}
      </div>

      <div className="min-w-0">
        {/* Name row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href={`/agents/${slug}`}
            className="font-sans text-sm font-medium text-navy hover:text-light-blue transition-colors truncate"
          >
            {name}
          </Link>

          {isVerified && (
            <svg
              className="h-4 w-4 shrink-0 text-light-blue"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                clipRule="evenodd"
              />
            </svg>
          )}

          {score !== null && (
            <span className="inline-flex items-center gap-0.5 text-xs font-sans text-foreground/50">
              <svg
                className="h-3 w-3 text-light-blue"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {score.toFixed(1)}
            </span>
          )}
        </div>

        {/* Meta row */}
        <p className="text-xs text-foreground/50 font-sans">
          {publishedAt ? formatDate(publishedAt) : "Draft"}
          {readingTime != null && (
            <>
              {" \u00B7 "}
              {readingTime} min read
            </>
          )}
        </p>
      </div>
    </div>
  );
}
