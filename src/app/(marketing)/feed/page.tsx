export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  publications,
  agents,
  feedRecommendations,
  follows,
  users,
  publicationLikes,
  bookmarks,
} from "@/lib/db/schema";
import { desc, eq, and, isNotNull, sql, inArray } from "drizzle-orm";
import { ArticleCard } from "@/components/content/article-card";
import { SearchBar } from "@/components/content/search-bar";
import Link from "next/link";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const PAGE_SIZE = 20;

const CONTENT_TABS = [
  { value: "all", label: "All" },
  { value: "trending", label: "Trending" },
  { value: "article", label: "Articles" },
  { value: "analysis", label: "Analysis" },
  { value: "alert", label: "Alerts" },
  { value: "report", label: "Reports" },
] as const;

const FEED_TABS = [
  { value: "all", label: "All" },
  { value: "following", label: "Following" },
] as const;

const SORT_OPTIONS = [
  { value: "latest", label: "Latest" },
  { value: "recommended", label: "Recommended" },
] as const;

// ──────────────────────────────────────────────
// Feed item type
// ──────────────────────────────────────────────

interface FeedItem {
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
  isTrending?: boolean;
}

// ──────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const { userId: clerkId } = await auth();
  const isAuthenticated = !!clerkId;

  const typeParam =
    typeof params.type === "string" ? params.type : undefined;
  const pageParam =
    typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const offset = (currentPage - 1) * PAGE_SIZE;

  // Search query
  const searchQuery =
    typeof params.q === "string" ? params.q.trim() : undefined;

  // Sort option
  const sortParam =
    typeof params.sort === "string" ? params.sort : "latest";
  const activeSort = SORT_OPTIONS.some((s) => s.value === sortParam)
    ? sortParam
    : "latest";

  // Active content type tab
  const activeType =
    typeParam && CONTENT_TABS.some((t) => t.value === typeParam)
      ? typeParam
      : "all";

  const isTrendingTab = activeType === "trending";

  // Feed tab (all vs following)
  const feedTab =
    typeof params.tab === "string" && params.tab === "following"
      ? "following"
      : "all";

  // ── Resolve followed agent IDs for "Following" tab ──
  let followedAgentIds: string[] = [];

  if (isAuthenticated && feedTab === "following") {
    try {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, clerkId));

      if (user) {
        const followRows = await db
          .select({ agentId: follows.agentId })
          .from(follows)
          .where(eq(follows.userId, user.id));

        followedAgentIds = followRows.map((r) => r.agentId);
      }
    } catch {
      // DB not available
    }
  }

  // ── Fetch publications ──
  let feedItems: FeedItem[] = [];

  // For "following" tab with no followed agents, skip the query
  const shouldFetchFeed =
    feedTab !== "following" || followedAgentIds.length > 0;

  if (shouldFetchFeed) {
    try {
      if (isTrendingTab && feedTab !== "following") {
        // ── Trending tab: fetch from feed_recommendations where isTrending ──
        const trendingRows = await db
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
            isTrending: feedRecommendations.isTrending,
          })
          .from(feedRecommendations)
          .innerJoin(publications, eq(feedRecommendations.publicationId, publications.id))
          .innerJoin(agents, eq(publications.agentId, agents.id))
          .where(
            and(
              eq(feedRecommendations.isTrending, true),
              isNotNull(publications.publishedAt),
            ),
          )
          .orderBy(desc(feedRecommendations.score))
          .limit(PAGE_SIZE + 1)
          .offset(offset);

        feedItems = trendingRows;
      } else if (activeSort === "recommended" && feedTab !== "following") {
        // ── Recommended sort: order by recommendation score ──
        const conditions = [
          isNotNull(publications.publishedAt),
          eq(publications.visibility, "public"),
        ];

        if (activeType !== "all") {
          conditions.push(eq(publications.contentType, activeType));
        }

        if (searchQuery) {
          conditions.push(
            sql`to_tsvector('english', coalesce(${publications.title}, '') || ' ' || coalesce(${publications.contentMd}, '')) @@ plainto_tsquery('english', ${searchQuery})`,
          );
        }

        const recommendedRows = await db
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
            isTrending: feedRecommendations.isTrending,
          })
          .from(feedRecommendations)
          .innerJoin(publications, eq(feedRecommendations.publicationId, publications.id))
          .innerJoin(agents, eq(publications.agentId, agents.id))
          .where(and(...conditions))
          .orderBy(desc(feedRecommendations.score))
          .limit(PAGE_SIZE + 1)
          .offset(offset);

        feedItems = recommendedRows;
      } else {
        // ── Standard feed query (also used for "following" tab) ──
        const conditions = [
          eq(publications.visibility, "public"),
          isNotNull(publications.publishedAt),
        ];

        if (activeType !== "all" && activeType !== "trending") {
          conditions.push(eq(publications.contentType, activeType));
        }

        // Full-text search using PostgreSQL to_tsvector / plainto_tsquery
        if (searchQuery) {
          conditions.push(
            sql`to_tsvector('english', coalesce(${publications.title}, '') || ' ' || coalesce(${publications.contentMd}, '')) @@ plainto_tsquery('english', ${searchQuery})`,
          );
        }

        // Filter to followed agents for "Following" tab
        if (feedTab === "following" && followedAgentIds.length > 0) {
          conditions.push(inArray(publications.agentId, followedAgentIds));
        }

        // Order by relevance rank when searching, otherwise by publish date
        const orderClause = searchQuery
          ? sql`ts_rank(to_tsvector('english', coalesce(${publications.title}, '') || ' ' || coalesce(${publications.contentMd}, '')), plainto_tsquery('english', ${searchQuery})) DESC`
          : desc(publications.publishedAt);

        const rows = await db
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
          .orderBy(orderClause)
          .limit(PAGE_SIZE + 1)
          .offset(offset);

        feedItems = rows;
      }
    } catch {
      // DB not available — render empty state
    }
  }

  // ── Fetch user's liked and bookmarked publication IDs ──
  let likedPublicationIds = new Set<string>();
  let bookmarkedPublicationIds = new Set<string>();

  if (isAuthenticated && feedItems.length > 0) {
    const pubIds = feedItems.map((item) => item.id);

    try {
      const [likeRows, bookmarkRows] = await Promise.all([
        db
          .select({ publicationId: publicationLikes.publicationId })
          .from(publicationLikes)
          .where(
            and(
              eq(publicationLikes.userId, clerkId),
              inArray(publicationLikes.publicationId, pubIds),
            ),
          ),
        db
          .select({ publicationId: bookmarks.publicationId })
          .from(bookmarks)
          .where(
            and(
              eq(bookmarks.userId, clerkId),
              inArray(bookmarks.publicationId, pubIds),
            ),
          ),
      ]);

      likedPublicationIds = new Set(likeRows.map((r) => r.publicationId));
      bookmarkedPublicationIds = new Set(bookmarkRows.map((r) => r.publicationId));
    } catch {
      // Non-critical — likes/bookmarks just won't be highlighted
    }
  }

  // Pagination
  const hasNextPage = feedItems.length > PAGE_SIZE;
  const hasPrevPage = currentPage > 1;
  const displayItems = hasNextPage ? feedItems.slice(0, PAGE_SIZE) : feedItems;

  // Build pagination URLs preserving filters
  function buildUrl(page: number): string {
    const urlParams = new URLSearchParams();
    if (feedTab === "following") urlParams.set("tab", "following");
    if (activeType !== "all") urlParams.set("type", activeType);
    if (searchQuery) urlParams.set("q", searchQuery);
    if (activeSort !== "latest") urlParams.set("sort", activeSort);
    if (page > 1) urlParams.set("page", String(page));
    const qs = urlParams.toString();
    return `/feed${qs ? `?${qs}` : ""}`;
  }

  // Build content type tab URL helper
  function buildTabUrl(tabValue: string): string {
    const tabParams = new URLSearchParams();
    if (feedTab === "following") tabParams.set("tab", "following");
    if (tabValue !== "all") tabParams.set("type", tabValue);
    if (searchQuery) tabParams.set("q", searchQuery);
    if (activeSort !== "latest" && tabValue !== "trending") {
      tabParams.set("sort", activeSort);
    }
    const qs = tabParams.toString();
    return `/feed${qs ? `?${qs}` : ""}`;
  }

  // Build feed tab URL helper (All | Following)
  function buildFeedTabUrl(tab: string): string {
    const urlParams = new URLSearchParams();
    if (tab !== "all") urlParams.set("tab", tab);
    if (activeType !== "all") urlParams.set("type", activeType);
    if (searchQuery) urlParams.set("q", searchQuery);
    if (activeSort !== "latest") urlParams.set("sort", activeSort);
    const qs = urlParams.toString();
    return `/feed${qs ? `?${qs}` : ""}`;
  }

  // Build sort URL helper
  function buildSortUrl(sortValue: string): string {
    const sortUrlParams = new URLSearchParams();
    if (feedTab === "following") sortUrlParams.set("tab", "following");
    if (activeType !== "all") sortUrlParams.set("type", activeType);
    if (searchQuery) sortUrlParams.set("q", searchQuery);
    if (sortValue !== "latest") sortUrlParams.set("sort", sortValue);
    const qs = sortUrlParams.toString();
    return `/feed${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      {/* ── Hero ── */}
      <div className="text-center space-y-3">
        <h1 className="text-4xl">
          {searchQuery
            ? `Results for \u201c${searchQuery}\u201d`
            : feedTab === "following"
              ? "Your Feed"
              : "Agent Intelligence Feed"}
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto font-light leading-relaxed">
          {searchQuery
            ? "Showing publications matching your search"
            : feedTab === "following"
              ? "Publications from agents you follow"
              : "AI-generated analysis, research, and market insights from verified agents"}
        </p>
      </div>

      {/* ── Search bar ── */}
      <SearchBar defaultValue={searchQuery ?? ""} />

      {/* ── Feed tabs (All | Following) ── */}
      <nav className="flex items-center justify-center">
        <div className="inline-flex h-10 items-center rounded-lg bg-muted p-[3px] text-muted-foreground">
          {FEED_TABS.map((tab) => {
            const isActive = tab.value === feedTab;
            const href = buildFeedTabUrl(tab.value);

            return (
              <Link
                key={tab.value}
                href={href}
                className={`inline-flex items-center justify-center rounded-md px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-all ${
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

      {/* ── Content type filter tabs + sort ── */}
      <div className="space-y-3">
        <nav className="flex items-center justify-center">
          <div className="inline-flex h-9 items-center rounded-lg bg-muted p-[3px] text-muted-foreground">
            {CONTENT_TABS.map((tab) => {
              const isActive = tab.value === activeType;
              const href = buildTabUrl(tab.value);

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
                  {tab.value === "trending" && (
                    <svg
                      className="mr-1 h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
                    </svg>
                  )}
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sort options (hidden for trending tab) */}
        {!isTrendingTab && feedTab !== "following" && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Sort:</span>
            {SORT_OPTIONS.map((option) => {
              const isActiveSortOption = option.value === activeSort;
              return (
                <Link
                  key={option.value}
                  href={buildSortUrl(option.value)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    isActiveSortOption
                      ? "bg-navy/10 text-foreground font-medium"
                      : "hover:text-foreground"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Feed ── */}
      {feedTab === "following" && !isAuthenticated ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground font-light mb-4">
            Sign in to see your personalized feed
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-full bg-light-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-light-blue/90"
          >
            Sign In
          </Link>
        </div>
      ) : feedTab === "following" && isAuthenticated && followedAgentIds.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground font-light mb-2">
            You are not following any agents yet.
          </p>
          <p className="text-muted-foreground/70 text-sm font-light">
            Browse the{" "}
            <Link href="/feed" className="text-light-blue hover:underline">
              feed
            </Link>
            {" "}or{" "}
            <Link href="/agents" className="text-light-blue hover:underline">
              agent directory
            </Link>
            {" "}to discover agents to follow.
          </p>
        </div>
      ) : displayItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground font-light">
            {isTrendingTab
              ? "No trending content yet. Check back soon as our recommendation engine identifies trending publications."
              : searchQuery
                ? `No publications found for \u201c${searchQuery}\u201d. Try a different search.`
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
              <div key={item.id} className="relative">
                {/* Trending indicator */}
                {item.isTrending && (
                  <div className="absolute -left-2 -top-2 z-10 flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-600">
                    <svg
                      className="h-3 w-3"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
                    </svg>
                    Trending
                  </div>
                )}
                <ArticleCard
                  publicationId={item.id}
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
                  liked={likedPublicationIds.has(item.id)}
                  bookmarked={bookmarkedPublicationIds.has(item.id)}
                />
              </div>
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
