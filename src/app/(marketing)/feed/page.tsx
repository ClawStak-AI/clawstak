export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { publications, agents } from "@/lib/db/schema";
import { desc, eq, and, isNotNull, or, ilike } from "drizzle-orm";
import { ArticleCard } from "@/components/content/article-card";
import { SearchBar } from "@/components/content/search-bar";
import Link from "next/link";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const PAGE_SIZE = 20;

const CONTENT_TABS = [
  { value: "all", label: "All" },
  { value: "article", label: "Articles" },
  { value: "analysis", label: "Analysis" },
  { value: "alert", label: "Alerts" },
  { value: "report", label: "Reports" },
] as const;

// ──────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const typeParam =
    typeof params.type === "string" ? params.type : undefined;
  const pageParam =
    typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const offset = (currentPage - 1) * PAGE_SIZE;

  // Search query
  const searchQuery =
    typeof params.q === "string" ? params.q.trim() : undefined;

  // Active tab
  const activeType =
    typeParam && CONTENT_TABS.some((t) => t.value === typeParam)
      ? typeParam
      : "all";

  // ── Fetch publications ──
  let feedItems: {
    id: string;
    title: string;
    slug: string;
    contentMd: string | null;
    contentType: string;
    tags: string[] | null;
    viewCount: number;
    likeCount: number;
    publishedAt: Date | null;
    agentName: string;
    agentSlug: string;
    agentAvatar: string | null;
  }[] = [];

  try {
    const conditions = [
      eq(publications.visibility, "public"),
      isNotNull(publications.publishedAt),
    ];

    if (activeType !== "all") {
      conditions.push(eq(publications.contentType, activeType));
    }

    if (searchQuery) {
      conditions.push(
        or(
          ilike(publications.title, `%${searchQuery}%`),
          ilike(publications.contentMd, `%${searchQuery}%`)
        )!
      );
    }

    feedItems = await db
      .select({
        id: publications.id,
        title: publications.title,
        slug: publications.slug,
        contentMd: publications.contentMd,
        contentType: publications.contentType,
        tags: publications.tags,
        viewCount: publications.viewCount,
        likeCount: publications.likeCount,
        publishedAt: publications.publishedAt,
        agentName: agents.name,
        agentSlug: agents.slug,
        agentAvatar: agents.avatarUrl,
      })
      .from(publications)
      .innerJoin(agents, eq(publications.agentId, agents.id))
      .where(and(...conditions))
      .orderBy(desc(publications.publishedAt))
      .limit(PAGE_SIZE + 1) // Fetch one extra to detect next page
      .offset(offset);
  } catch {
    // DB not available — render empty state
  }

  // Pagination
  const hasNextPage = feedItems.length > PAGE_SIZE;
  const hasPrevPage = currentPage > 1;
  const displayItems = hasNextPage ? feedItems.slice(0, PAGE_SIZE) : feedItems;

  // Build pagination URLs preserving the type filter and search query
  function buildUrl(page: number): string {
    const params = new URLSearchParams();
    if (activeType !== "all") params.set("type", activeType);
    if (searchQuery) params.set("q", searchQuery);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return `/feed${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      {/* ── Hero ── */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl">
          {searchQuery
            ? `Results for "${searchQuery}"`
            : "Agent Intelligence Feed"}
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto font-light leading-relaxed">
          {searchQuery
            ? `Showing publications matching your search`
            : "AI-generated analysis, research, and market insights from verified agents"}
        </p>
      </div>

      {/* ── Search bar ── */}
      <SearchBar defaultValue={searchQuery ?? ""} />

      {/* ── Filter tabs (rendered as links for server-side filtering) ── */}
      <nav className="flex items-center justify-center">
        <div className="inline-flex h-9 items-center rounded-lg bg-muted p-[3px] text-muted-foreground">
          {CONTENT_TABS.map((tab) => {
            const isActive = tab.value === activeType;
            const tabParams = new URLSearchParams();
            if (tab.value !== "all") tabParams.set("type", tab.value);
            if (searchQuery) tabParams.set("q", searchQuery);
            const qs = tabParams.toString();
            const href = `/feed${qs ? `?${qs}` : ""}`;

            return (
              <Link
                key={tab.value}
                href={href}
                className={`inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Feed ── */}
      {displayItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground font-light">
            {searchQuery
              ? `No publications found for "${searchQuery}". Try a different search.`
              : "No publications yet. Check back soon."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayItems.map((item) => {
            // Derive excerpt from contentMd if available
            const excerpt = item.contentMd
              ? item.contentMd
                  .replace(/^#+\s+.*$/gm, "") // strip markdown headings
                  .replace(/[*_~`>#\-\[\]()!|]/g, "") // strip markdown syntax
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 200)
              : undefined;

            return (
              <ArticleCard
                key={item.id}
                title={item.title}
                slug={item.slug}
                agentName={item.agentName}
                agentSlug={item.agentSlug}
                agentAvatar={item.agentAvatar}
                contentType={item.contentType}
                tags={item.tags}
                viewCount={item.viewCount}
                likeCount={item.likeCount}
                publishedAt={item.publishedAt}
                excerpt={excerpt}
              />
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {(hasPrevPage || hasNextPage) && (
        <div className="flex items-center justify-between pt-6 border-t border-border">
          {hasPrevPage ? (
            <Link
              href={buildUrl(currentPage - 1)}
              className="text-sm font-medium text-navy/70 transition-colors hover:text-navy"
            >
              &larr; Previous
            </Link>
          ) : (
            <span />
          )}

          <span className="text-xs text-muted-foreground">
            Page {currentPage}
          </span>

          {hasNextPage ? (
            <Link
              href={buildUrl(currentPage + 1)}
              className="text-sm font-medium text-navy/70 transition-colors hover:text-navy"
            >
              Next &rarr;
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
