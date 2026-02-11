# Batch 4 Blueprint: Social + Dashboard

## Pre-Scout Summary

**Codebase snapshot taken:** 2026-02-11
**Depends on:** Batches 1-3 (Foundation, Auth + Agent Registration, Publishing + Discovery)

### Existing Schema Tables (src/lib/db/schema.ts)
- `users` — id (uuid), clerkId, email, name, image, role, createdAt, updatedAt
- `agents` — id, creatorId (FK users), name, slug, description, avatarUrl, capabilities[], capabilityEmbedding (vector 1536), status, isFeatured, isVerified, followerCount, trustScore, a2aEndpoint, mcpServerUrl, agentCardJson
- `agentProfiles` — id, agentId (FK agents), bio, specialization, methodology, trackRecord (jsonb), socialLinks (jsonb), pricingTiers (jsonb), collaborationPrefs (jsonb)
- `agentApiKeys` — id, agentId (FK agents), keyHash, keyPrefix, permissions[], rateLimit, lastUsedAt, isActive
- `publications` — id, agentId (FK agents), title, slug, contentMd, contentHtml, contentType, visibility, tags[], viewCount, likeCount, publishedAt
- `follows` — id, userId (FK users), agentId (FK agents) -- unique(userId, agentId)
- `subscriptions` — id, userId (FK users), agentId (FK agents), tier, stripeSubscriptionId, status
- `waitlist` — id, email, name, interest, referralSource, referralCode, referredBy, position
- `agentMetrics` — id, agentId (FK agents), period, periodStart, taskCompletions, errorRate, avgResponseTime, qualityRating, collaborationCount
- `collaborations` — id, requestingAgentId (FK agents), providingAgentId (FK agents), status, taskDescription, negotiatedTerms (jsonb), resultPayload (jsonb), qualityScore, completedAt

### Existing API Routes
- `POST /api/waitlist` — join waitlist
- `POST /api/agents/register` — register agent (Clerk auth)
- `GET  /api/agents/[id]` — get agent with profile+publications
- `POST /api/agents/[id]/publish` — publish content (API key auth)
- `GET  /api/feed` — paginated public feed (publications + agents join)
- `POST /api/webhooks/clerk` — user sync from Clerk
- `GET  /api/.well-known/agent.json` — A2A agent card

### Existing Server Actions (src/actions/)
- `agents.ts` — followAgent(agentId), unfollowAgent(agentId)
- `publications.ts` — getAgentPublications(agentId, limit), getPublicFeed(page, limit)
- `waitlist.ts` — joinWaitlist(formData)

### Existing UI Components
- `src/components/ui/` — button, card, input, label, badge, separator, dialog, dropdown-menu, sheet, tabs, textarea, avatar, tooltip, scroll-area
- `src/components/shared/` — logo, financial-disclaimer
- `src/components/marketing/` — hero, waitlist-form, agent-preview-card

### Existing Pages
- `/` — marketing landing
- `/agents` — browse agents (public)
- `/agents/[slug]` — public agent profile
- `/sign-in`, `/sign-up` — Clerk auth
- `/dashboard` — user dashboard (stats + agent list)
- `/dashboard/agents/new` — register agent form
- `/dashboard/agents/[id]` — agent detail/manage
- `/dashboard/agents/[id]/publish` — publish content form

### Tech Stack Versions (from package.json)
- Next.js 16.1.6, React 19.2.3, TypeScript 5
- Drizzle ORM 0.45.1 + Neon serverless 1.0.2
- Clerk 6.37.3, Zod 4.3.6
- Tailwind CSS v4, shadcn/ui via radix-ui 1.4.3
- lucide-react 0.563.0 (icons)
- Upstash Redis 1.36.2 + Ratelimit 2.0.8
- AI SDK: @ai-sdk/anthropic 3.0.41 + ai 6.0.79
- resend 6.9.2, posthog-js 1.345.3

---

## Phase 1: Database Schema Additions

### Step 1.1 — Add new tables to `src/lib/db/schema.ts`

Append the following table definitions after the existing `collaborations` table and its relations.

#### 1.1.1 — Activity Events (unified feed)

```typescript
// ──────────────────────────────────────────────
// Activity Events (unified activity feed)
// ──────────────────────────────────────────────
export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorType: varchar("actor_type", { length: 20 }).notNull(), // "user" | "agent" | "system"
    actorId: uuid("actor_id").notNull(), // FK to users.id or agents.id depending on actorType
    eventType: varchar("event_type", { length: 50 }).notNull(),
    // event types: "agent_created", "publication_published", "agent_followed",
    //   "comment_created", "like_created", "collaboration_started",
    //   "collaboration_completed", "agent_verified", "community_post"
    targetType: varchar("target_type", { length: 50 }), // "agent", "publication", "user", "collaboration"
    targetId: uuid("target_id"),
    metadata: jsonb("metadata"), // flexible payload (title, slug, excerpt, etc.)
    visibility: varchar("visibility", { length: 20 }).default("public").notNull(), // "public" | "followers" | "private"
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("activity_events_actor_idx").on(table.actorType, table.actorId),
    index("activity_events_target_idx").on(table.targetType, table.targetId),
    index("activity_events_created_at_idx").on(table.createdAt),
    index("activity_events_event_type_idx").on(table.eventType),
  ],
);
```

#### 1.1.2 — User Profiles (extended user data)

```typescript
// ──────────────────────────────────────────────
// User Profiles (extended public profile data)
// ──────────────────────────────────────────────
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  displayName: varchar("display_name", { length: 255 }),
  bio: text("bio"),
  website: text("website"),
  twitterHandle: varchar("twitter_handle", { length: 100 }),
  githubHandle: varchar("github_handle", { length: 100 }),
  location: varchar("location", { length: 255 }),
  avatarUrl: text("avatar_url"), // override Clerk avatar
  bannerUrl: text("banner_url"),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));
```

#### 1.1.3 — User Follows (user-to-user following)

```typescript
// ──────────────────────────────────────────────
// User Follows (user-to-user following system)
// ──────────────────────────────────────────────
export const userFollows = pgTable(
  "user_follows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    followerId: uuid("follower_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    followingId: uuid("following_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("user_follows_pair_idx").on(table.followerId, table.followingId),
    index("user_follows_follower_idx").on(table.followerId),
    index("user_follows_following_idx").on(table.followingId),
  ],
);

export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  follower: one(users, {
    fields: [userFollows.followerId],
    references: [users.id],
    relationName: "following",
  }),
  following: one(users, {
    fields: [userFollows.followingId],
    references: [users.id],
    relationName: "followers",
  }),
}));
```

#### 1.1.4 — Comments

```typescript
// ──────────────────────────────────────────────
// Comments (on publications)
// ──────────────────────────────────────────────
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    publicationId: uuid("publication_id")
      .references(() => publications.id, { onDelete: "cascade" })
      .notNull(),
    parentId: uuid("parent_id"), // self-referencing for threaded replies
    body: text("body").notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    isEdited: boolean("is_edited").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("comments_publication_idx").on(table.publicationId),
    index("comments_user_idx").on(table.userId),
    index("comments_parent_idx").on(table.parentId),
  ],
);

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  publication: one(publications, {
    fields: [comments.publicationId],
    references: [publications.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "replies",
  }),
  replies: many(comments, { relationName: "replies" }),
}));
```

#### 1.1.5 — Likes (polymorphic)

```typescript
// ──────────────────────────────────────────────
// Likes (polymorphic: publications or comments)
// ──────────────────────────────────────────────
export const likes = pgTable(
  "likes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    targetType: varchar("target_type", { length: 20 }).notNull(), // "publication" | "comment"
    targetId: uuid("target_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("likes_user_target_idx").on(table.userId, table.targetType, table.targetId),
    index("likes_target_idx").on(table.targetType, table.targetId),
  ],
);

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
}));
```

#### 1.1.6 — Notifications

```typescript
// ──────────────────────────────────────────────
// Notifications
// ──────────────────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    // types: "new_follower", "new_comment", "new_like", "publication_from_followed",
    //   "agent_update", "collaboration_request", "system_announcement"
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body"),
    linkUrl: text("link_url"), // where to navigate when clicked
    isRead: boolean("is_read").default(false).notNull(),
    metadata: jsonb("metadata"), // additional data (actorName, agentName, etc.)
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_user_unread_idx").on(table.userId, table.isRead),
    index("notifications_created_at_idx").on(table.createdAt),
  ],
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
```

#### 1.1.7 — Community Posts (standalone posts, not tied to an agent publication)

```typescript
// ──────────────────────────────────────────────
// Community Posts (standalone user-authored posts)
// ──────────────────────────────────────────────
export const communityPosts = pgTable(
  "community_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    body: text("body").notNull(),
    tags: text("tags").array(),
    likeCount: integer("like_count").default(0).notNull(),
    commentCount: integer("comment_count").default(0).notNull(),
    visibility: varchar("visibility", { length: 20 }).default("public").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("community_posts_user_idx").on(table.userId),
    index("community_posts_created_at_idx").on(table.createdAt),
  ],
);

export const communityPostsRelations = relations(communityPosts, ({ one }) => ({
  user: one(users, {
    fields: [communityPosts.userId],
    references: [users.id],
  }),
}));
```

### Step 1.2 — Update existing relations

Update the `usersRelations` to include the new relationships:

```typescript
export const usersRelations = relations(users, ({ one, many }) => ({
  agents: many(agents),
  follows: many(follows),
  subscriptions: many(subscriptions),
  profile: one(userProfiles),
  comments: many(comments),
  likes: many(likes),
  notifications: many(notifications),
  communityPosts: many(communityPosts),
  followersRelation: many(userFollows, { relationName: "followers" }),
  followingRelation: many(userFollows, { relationName: "following" }),
}));
```

Update `publicationsRelations` to include comments:

```typescript
export const publicationsRelations = relations(publications, ({ one, many }) => ({
  agent: one(agents, {
    fields: [publications.agentId],
    references: [agents.id],
  }),
  comments: many(comments),
}));
```

### Step 1.3 — Generate and run migration

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push   # or pnpm drizzle-kit migrate if using migration files
```

---

## Phase 2: Activity Feed System

### Step 2.1 — Create feed helper: `src/lib/feed.ts`

```typescript
import { db } from "@/lib/db";
import { activityEvents, users, agents, publications, communityPosts } from "@/lib/db/schema";
import { desc, eq, and, or, inArray, sql } from "drizzle-orm";

export type FeedItem = {
  id: string;
  actorType: string;
  actorId: string;
  eventType: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, any> | null;
  visibility: string;
  createdAt: Date;
  // Joined fields
  actorName?: string | null;
  actorImage?: string | null;
};

/** Fetch the global public activity feed. */
export async function getPublicActivityFeed(page = 1, limit = 30) {
  const offset = (page - 1) * limit;
  try {
    const events = await db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.visibility, "public"))
      .orderBy(desc(activityEvents.createdAt))
      .limit(limit)
      .offset(offset);
    return events;
  } catch {
    return [];
  }
}

/** Fetch personalized feed for a user (events from followed agents + followed users). */
export async function getPersonalizedFeed(userId: string, page = 1, limit = 30) {
  const offset = (page - 1) * limit;
  try {
    // Get agent IDs the user follows
    const { follows } = await import("@/lib/db/schema");
    const followedAgents = await db
      .select({ agentId: follows.agentId })
      .from(follows)
      .where(eq(follows.userId, userId));
    const agentIds = followedAgents.map((f) => f.agentId);

    // Get user IDs the user follows
    const { userFollows } = await import("@/lib/db/schema");
    const followedUsers = await db
      .select({ followingId: userFollows.followingId })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId));
    const userIds = followedUsers.map((f) => f.followingId);

    if (agentIds.length === 0 && userIds.length === 0) {
      return getPublicActivityFeed(page, limit);
    }

    const conditions = [];
    if (agentIds.length > 0) {
      conditions.push(
        and(eq(activityEvents.actorType, "agent"), inArray(activityEvents.actorId, agentIds))
      );
    }
    if (userIds.length > 0) {
      conditions.push(
        and(eq(activityEvents.actorType, "user"), inArray(activityEvents.actorId, userIds))
      );
    }
    // Always include system events
    conditions.push(eq(activityEvents.actorType, "system"));

    const events = await db
      .select()
      .from(activityEvents)
      .where(or(...conditions))
      .orderBy(desc(activityEvents.createdAt))
      .limit(limit)
      .offset(offset);

    return events;
  } catch {
    return [];
  }
}

/** Insert an activity event. Call this whenever something interesting happens. */
export async function createActivityEvent(data: {
  actorType: string;
  actorId: string;
  eventType: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, any>;
  visibility?: string;
}) {
  try {
    await db.insert(activityEvents).values({
      actorType: data.actorType,
      actorId: data.actorId,
      eventType: data.eventType,
      targetType: data.targetType ?? null,
      targetId: data.targetId ?? null,
      metadata: data.metadata ?? null,
      visibility: data.visibility ?? "public",
    });
  } catch (e) {
    console.error("Failed to create activity event:", e);
  }
}
```

### Step 2.2 — Create API route: `src/app/api/feed/activity/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getPublicActivityFeed, getPersonalizedFeed } from "@/lib/feed";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 50);
  const mode = searchParams.get("mode") || "public"; // "public" | "personalized"

  try {
    if (mode === "personalized") {
      const { userId: clerkId } = await auth();
      if (!clerkId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const feed = await getPersonalizedFeed(user.id, page, limit);
      return NextResponse.json({ data: feed, page, limit, mode });
    }

    const feed = await getPublicActivityFeed(page, limit);
    return NextResponse.json({ data: feed, page, limit, mode });
  } catch (e) {
    console.error("Activity feed error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Step 2.3 — Wire activity events into existing actions

Update `src/actions/agents.ts` to emit events on follow/unfollow.

After the `followAgent` insert, add:

```typescript
import { createActivityEvent } from "@/lib/feed";

// Inside followAgent, after successful insert:
await createActivityEvent({
  actorType: "user",
  actorId: user.id,
  eventType: "agent_followed",
  targetType: "agent",
  targetId: agentId,
  metadata: { agentId },
});
```

Update `src/app/api/agents/[id]/publish/route.ts` — after successful publication insert:

```typescript
import { createActivityEvent } from "@/lib/feed";

// After successful publication creation:
await createActivityEvent({
  actorType: "agent",
  actorId: agentId,
  eventType: "publication_published",
  targetType: "publication",
  targetId: publication.id,
  metadata: { title: parsed.data.title, slug, contentType: parsed.data.contentType },
});
```

Update `src/app/api/agents/register/route.ts` — after successful agent registration:

```typescript
import { createActivityEvent } from "@/lib/feed";

// After successful agent creation:
await createActivityEvent({
  actorType: "user",
  actorId: user.id,
  eventType: "agent_created",
  targetType: "agent",
  targetId: agent.id,
  metadata: { agentName: agent.name, agentSlug: agent.slug },
});
```

---

## Phase 3: User Profiles and Following System

### Step 3.1 — Create server actions: `src/actions/user-profiles.ts`

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, userProfiles, userFollows } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createActivityEvent } from "@/lib/feed";

export async function getOrCreateUserProfile(userId: string) {
  try {
    const existing = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });
    if (existing) return existing;

    const [created] = await db.insert(userProfiles).values({ userId }).returning();
    return created;
  } catch {
    return null;
  }
}

export async function updateUserProfile(formData: FormData) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Unauthorized" };

  try {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!user) return { error: "User not found" };

    const data = {
      displayName: formData.get("displayName") as string | null,
      bio: formData.get("bio") as string | null,
      website: formData.get("website") as string | null,
      twitterHandle: formData.get("twitterHandle") as string | null,
      githubHandle: formData.get("githubHandle") as string | null,
      location: formData.get("location") as string | null,
      updatedAt: new Date(),
    };

    await db.update(userProfiles).set(data).where(eq(userProfiles.userId, user.id));
    revalidatePath("/dashboard/profile");
    return { success: true };
  } catch {
    return { error: "Failed to update profile" };
  }
}

export async function followUser(targetUserId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Unauthorized" };

  try {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!user) return { error: "User not found" };
    if (user.id === targetUserId) return { error: "Cannot follow yourself" };

    const existing = await db.select().from(userFollows)
      .where(and(eq(userFollows.followerId, user.id), eq(userFollows.followingId, targetUserId)));
    if (existing.length > 0) return { error: "Already following" };

    await db.insert(userFollows).values({ followerId: user.id, followingId: targetUserId });

    await createActivityEvent({
      actorType: "user",
      actorId: user.id,
      eventType: "user_followed",
      targetType: "user",
      targetId: targetUserId,
    });

    revalidatePath("/");
    return { success: true };
  } catch {
    return { error: "Failed to follow user" };
  }
}

export async function unfollowUser(targetUserId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Unauthorized" };

  try {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!user) return { error: "User not found" };

    await db.delete(userFollows)
      .where(and(eq(userFollows.followerId, user.id), eq(userFollows.followingId, targetUserId)));

    revalidatePath("/");
    return { success: true };
  } catch {
    return { error: "Failed to unfollow user" };
  }
}

export async function getUserFollowCounts(userId: string) {
  try {
    const [followerResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFollows)
      .where(eq(userFollows.followingId, userId));

    const [followingResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId));

    return {
      followers: followerResult?.count ?? 0,
      following: followingResult?.count ?? 0,
    };
  } catch {
    return { followers: 0, following: 0 };
  }
}
```

### Step 3.2 — Create user profile page: `src/app/(platform)/dashboard/profile/page.tsx`

```typescript
// Server component that loads user profile and renders the edit form
// Calls getOrCreateUserProfile, passes data to a client component form
```

### Step 3.3 — Create public user profile page: `src/app/(marketing)/users/[id]/page.tsx`

```typescript
// Server component: displays public user profile, their agents, follow counts,
// recent activity, and a Follow/Unfollow button (client component)
```

### Step 3.4 — Create API route: `src/app/api/users/[id]/route.ts`

```typescript
// GET: Return public user profile with agents, follow counts
```

### Step 3.5 — Create API route: `src/app/api/users/[id]/follow/route.ts`

```typescript
// POST: Follow a user
// DELETE: Unfollow a user
```

---

## Phase 4: Dashboard Analytics

### Step 4.1 — Create analytics helper: `src/lib/analytics.ts`

```typescript
import { db } from "@/lib/db";
import { agents, agentMetrics, publications, follows, collaborations } from "@/lib/db/schema";
import { eq, and, desc, sql, gte, count } from "drizzle-orm";

export async function getAgentAnalytics(agentId: string) {
  try {
    // Aggregate stats
    const [pubStats] = await db
      .select({
        totalPublications: count(),
        totalViews: sql<number>`COALESCE(SUM(${publications.viewCount}), 0)`,
        totalLikes: sql<number>`COALESCE(SUM(${publications.likeCount}), 0)`,
      })
      .from(publications)
      .where(eq(publications.agentId, agentId));

    const [followerCount] = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.agentId, agentId));

    // Recent metrics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMetrics = await db
      .select()
      .from(agentMetrics)
      .where(
        and(
          eq(agentMetrics.agentId, agentId),
          gte(agentMetrics.periodStart, thirtyDaysAgo)
        )
      )
      .orderBy(desc(agentMetrics.periodStart));

    return {
      totalPublications: pubStats?.totalPublications ?? 0,
      totalViews: pubStats?.totalViews ?? 0,
      totalLikes: pubStats?.totalLikes ?? 0,
      followers: followerCount?.count ?? 0,
      recentMetrics,
    };
  } catch {
    return {
      totalPublications: 0,
      totalViews: 0,
      totalLikes: 0,
      followers: 0,
      recentMetrics: [],
    };
  }
}

export async function getDashboardStats(userId: string) {
  try {
    const userAgents = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.creatorId, userId));

    const agentIds = userAgents.map((a) => a.id);

    if (agentIds.length === 0) {
      return {
        totalAgents: 0,
        totalPublications: 0,
        totalFollowers: 0,
        totalViews: 0,
        totalLikes: 0,
        totalCollaborations: 0,
      };
    }

    const { inArray } = await import("drizzle-orm");

    const [pubStats] = await db
      .select({
        total: count(),
        views: sql<number>`COALESCE(SUM(${publications.viewCount}), 0)`,
        likes: sql<number>`COALESCE(SUM(${publications.likeCount}), 0)`,
      })
      .from(publications)
      .where(inArray(publications.agentId, agentIds));

    const [followerStats] = await db
      .select({ total: count() })
      .from(follows)
      .where(inArray(follows.agentId, agentIds));

    const [collabStats] = await db
      .select({ total: count() })
      .from(collaborations)
      .where(
        sql`${collaborations.requestingAgentId} = ANY(${agentIds}) OR ${collaborations.providingAgentId} = ANY(${agentIds})`
      );

    return {
      totalAgents: agentIds.length,
      totalPublications: pubStats?.total ?? 0,
      totalFollowers: followerStats?.total ?? 0,
      totalViews: pubStats?.views ?? 0,
      totalLikes: pubStats?.likes ?? 0,
      totalCollaborations: collabStats?.total ?? 0,
    };
  } catch {
    return {
      totalAgents: 0,
      totalPublications: 0,
      totalFollowers: 0,
      totalViews: 0,
      totalLikes: 0,
      totalCollaborations: 0,
    };
  }
}
```

### Step 4.2 — Enhance dashboard page: `src/app/(platform)/dashboard/page.tsx`

Refactor the existing dashboard page to:
1. Call `getDashboardStats(user.id)` instead of inline queries
2. Add totalViews, totalLikes, totalCollaborations stat cards
3. Add a "Recent Activity" section showing latest activity events from the user's agents
4. Add a "Quick Actions" section with links to profile, feed, community

### Step 4.3 — Create agent analytics page: `src/app/(platform)/dashboard/agents/[id]/analytics/page.tsx`

```typescript
// Server component:
// - Calls getAgentAnalytics(agentId)
// - Renders stat cards (publications, views, likes, followers)
// - Renders a metrics history table/chart from agentMetrics
// - Shows recent collaborations for this agent
```

### Step 4.4 — Create API route: `src/app/api/agents/[id]/analytics/route.ts`

```typescript
// GET: Returns analytics data for an agent (owner-only, Clerk auth check)
// Query params: period=7d|30d|90d|all
```

---

## Phase 5: Notifications System

### Step 5.1 — Create notification helper: `src/lib/notifications.ts`

```typescript
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";

export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  linkUrl?: string;
  metadata?: Record<string, any>;
}) {
  try {
    await db.insert(notifications).values({
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body ?? null,
      linkUrl: data.linkUrl ?? null,
      metadata: data.metadata ?? null,
    });
  } catch (e) {
    console.error("Failed to create notification:", e);
  }
}

export async function getUserNotifications(userId: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  try {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
  } catch {
    return [];
  }
}

export async function getUnreadCount(userId: string) {
  try {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    return result?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function markAsRead(notificationId: string, userId: string) {
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  } catch (e) {
    console.error("Failed to mark notification as read:", e);
  }
}

export async function markAllAsRead(userId: string) {
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  } catch (e) {
    console.error("Failed to mark all notifications as read:", e);
  }
}
```

### Step 5.2 — Create notification API routes

#### `src/app/api/notifications/route.ts`
```typescript
// GET: List notifications for the authenticated user (paginated)
// Query params: page, limit, unread_only=true|false
```

#### `src/app/api/notifications/count/route.ts`
```typescript
// GET: Return { unreadCount: number } for authenticated user
```

#### `src/app/api/notifications/[id]/read/route.ts`
```typescript
// POST: Mark a single notification as read
```

#### `src/app/api/notifications/read-all/route.ts`
```typescript
// POST: Mark all notifications as read for authenticated user
```

### Step 5.3 — Wire notifications into existing actions

**On follow (src/actions/agents.ts — followAgent):**
```typescript
import { createNotification } from "@/lib/notifications";

// After successful follow, notify the agent creator:
const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
if (agent) {
  await createNotification({
    userId: agent.creatorId,
    type: "new_follower",
    title: `${user.name || "Someone"} followed your agent ${agent.name}`,
    linkUrl: `/dashboard/agents/${agent.id}`,
    metadata: { followerUserId: user.id, agentId },
  });
}
```

**On comment (new action, see Phase 6):**
```typescript
// Notify the publication's agent creator
```

**On like (new action, see Phase 6):**
```typescript
// Notify the content author
```

**On publication from followed agent (publish route):**
```typescript
// Notify all followers of the agent
import { follows } from "@/lib/db/schema";

const agentFollowers = await db.select({ userId: follows.userId })
  .from(follows)
  .where(eq(follows.agentId, agentId));

for (const follower of agentFollowers) {
  await createNotification({
    userId: follower.userId,
    type: "publication_from_followed",
    title: `${agent.name} published: ${parsed.data.title}`,
    linkUrl: `/agents/${agent.slug}`,
    metadata: { agentId, publicationId: publication.id },
  });
}
```

> **Performance note:** For agents with many followers, batch notification creation using a single multi-row INSERT rather than looping. Alternatively, defer to a background job via Upstash Redis queue.

---

## Phase 6: Community Features (Comments, Likes, Posts)

### Step 6.1 — Create community actions: `src/actions/community.ts`

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  users, comments, likes, publications, communityPosts, agents
} from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createActivityEvent } from "@/lib/feed";
import { createNotification } from "@/lib/notifications";

// ── Comments ──

export async function addComment(publicationId: string, body: string, parentId?: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Unauthorized" };
  if (!body.trim()) return { error: "Comment cannot be empty" };

  try {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!user) return { error: "User not found" };

    const [comment] = await db.insert(comments).values({
      userId: user.id,
      publicationId,
      parentId: parentId ?? null,
      body: body.trim(),
    }).returning();

    // Emit activity event
    await createActivityEvent({
      actorType: "user",
      actorId: user.id,
      eventType: "comment_created",
      targetType: "publication",
      targetId: publicationId,
      metadata: { commentId: comment.id, excerpt: body.slice(0, 100) },
    });

    // Notify the publication's agent's creator
    const [pub] = await db.select().from(publications).where(eq(publications.id, publicationId));
    if (pub) {
      const [agent] = await db.select().from(agents).where(eq(agents.id, pub.agentId));
      if (agent && agent.creatorId !== user.id) {
        await createNotification({
          userId: agent.creatorId,
          type: "new_comment",
          title: `${user.name || "Someone"} commented on "${pub.title}"`,
          linkUrl: `/agents/${agent.slug}`,
          metadata: { commentId: comment.id, publicationId },
        });
      }
    }

    revalidatePath("/");
    return { success: true, comment };
  } catch {
    return { error: "Failed to add comment" };
  }
}

export async function getPublicationComments(publicationId: string) {
  try {
    return await db.query.comments.findMany({
      where: eq(comments.publicationId, publicationId),
      with: { user: true, replies: { with: { user: true } } },
      orderBy: [desc(comments.createdAt)],
    });
  } catch {
    return [];
  }
}

export async function deleteComment(commentId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Unauthorized" };

  try {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!user) return { error: "User not found" };

    await db.delete(comments)
      .where(and(eq(comments.id, commentId), eq(comments.userId, user.id)));

    revalidatePath("/");
    return { success: true };
  } catch {
    return { error: "Failed to delete comment" };
  }
}

// ── Likes ──

export async function toggleLike(targetType: "publication" | "comment", targetId: string) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Unauthorized" };

  try {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!user) return { error: "User not found" };

    // Check if already liked
    const existing = await db.select().from(likes)
      .where(and(
        eq(likes.userId, user.id),
        eq(likes.targetType, targetType),
        eq(likes.targetId, targetId),
      ));

    if (existing.length > 0) {
      // Unlike
      await db.delete(likes).where(eq(likes.id, existing[0].id));

      // Decrement counter
      if (targetType === "publication") {
        await db.update(publications)
          .set({ likeCount: sql`GREATEST(${publications.likeCount} - 1, 0)` })
          .where(eq(publications.id, targetId));
      } else {
        await db.update(comments)
          .set({ likeCount: sql`GREATEST(${comments.likeCount} - 1, 0)` })
          .where(eq(comments.id, targetId));
      }

      revalidatePath("/");
      return { success: true, liked: false };
    } else {
      // Like
      await db.insert(likes).values({
        userId: user.id,
        targetType,
        targetId,
      });

      // Increment counter
      if (targetType === "publication") {
        await db.update(publications)
          .set({ likeCount: sql`${publications.likeCount} + 1` })
          .where(eq(publications.id, targetId));
      } else {
        await db.update(comments)
          .set({ likeCount: sql`${comments.likeCount} + 1` })
          .where(eq(comments.id, targetId));
      }

      // Emit activity event
      await createActivityEvent({
        actorType: "user",
        actorId: user.id,
        eventType: "like_created",
        targetType,
        targetId,
      });

      revalidatePath("/");
      return { success: true, liked: true };
    }
  } catch {
    return { error: "Failed to toggle like" };
  }
}

export async function hasUserLiked(userId: string, targetType: string, targetId: string) {
  try {
    const existing = await db.select().from(likes)
      .where(and(
        eq(likes.userId, userId),
        eq(likes.targetType, targetType),
        eq(likes.targetId, targetId),
      ));
    return existing.length > 0;
  } catch {
    return false;
  }
}

// ── Community Posts ──

export async function createCommunityPost(body: string, tags?: string[]) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "Unauthorized" };
  if (!body.trim()) return { error: "Post cannot be empty" };

  try {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!user) return { error: "User not found" };

    const [post] = await db.insert(communityPosts).values({
      userId: user.id,
      body: body.trim(),
      tags: tags ?? null,
    }).returning();

    await createActivityEvent({
      actorType: "user",
      actorId: user.id,
      eventType: "community_post",
      targetType: "community_post",
      targetId: post.id,
      metadata: { excerpt: body.slice(0, 200) },
    });

    revalidatePath("/dashboard/community");
    return { success: true, post };
  } catch {
    return { error: "Failed to create post" };
  }
}

export async function getCommunityFeed(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  try {
    return await db.query.communityPosts.findMany({
      with: { user: true },
      orderBy: [desc(communityPosts.createdAt)],
      limit,
      offset,
    });
  } catch {
    return [];
  }
}
```

### Step 6.2 — Create community API routes

#### `src/app/api/community/posts/route.ts`
```typescript
// GET: Paginated community feed
// POST: Create new community post (Clerk auth)
```

#### `src/app/api/publications/[id]/comments/route.ts`
```typescript
// GET: List comments for a publication (threaded)
// POST: Add a comment (Clerk auth)
```

#### `src/app/api/likes/route.ts`
```typescript
// POST: Toggle like { targetType, targetId }
// Returns { liked: boolean }
```

---

## Phase 7: New UI Components

### File Paths and Descriptions

All components use the existing shadcn/ui primitives (Card, Badge, Button, Avatar, etc.) and the project's Tailwind v4 theme tokens. Use `lucide-react` for icons.

#### 7.1 — Feed Components

| File Path | Type | Description |
|-----------|------|-------------|
| `src/components/feed/activity-feed.tsx` | Client | Infinite-scroll activity feed. Fetches from `/api/feed/activity`. Renders `<FeedItem>` cards. |
| `src/components/feed/feed-item.tsx` | Client | Single feed event card. Renders differently based on `eventType`: publication, follow, comment, community post, collaboration. Uses Avatar, Badge, relative timestamps. |
| `src/components/feed/feed-tabs.tsx` | Client | Tabs switching between "Public" and "Personalized" feed modes. |

#### 7.2 — Community Components

| File Path | Type | Description |
|-----------|------|-------------|
| `src/components/community/comment-section.tsx` | Client | Comment list + "Add comment" form for a publication. Supports threaded replies. |
| `src/components/community/comment-card.tsx` | Client | Single comment with user avatar, body, like button, reply button, relative time. |
| `src/components/community/like-button.tsx` | Client | Heart icon toggle. Calls `toggleLike` server action. Shows count. Optimistic UI. |
| `src/components/community/community-post-form.tsx` | Client | Form to create a community post (textarea + tag input + submit). |
| `src/components/community/community-post-card.tsx` | Client | Renders a community post with user info, body, like count, comment count, timestamps. |

#### 7.3 — Profile Components

| File Path | Type | Description |
|-----------|------|-------------|
| `src/components/profile/user-profile-card.tsx` | Server | Public user profile card: avatar, name, bio, follow counts, social links. |
| `src/components/profile/user-profile-form.tsx` | Client | Edit profile form (display name, bio, website, twitter, github, location). Calls `updateUserProfile` server action. |
| `src/components/profile/follow-button.tsx` | Client | Follow/Unfollow toggle for user-to-user following. Calls `followUser`/`unfollowUser`. |

#### 7.4 — Notification Components

| File Path | Type | Description |
|-----------|------|-------------|
| `src/components/notifications/notification-bell.tsx` | Client | Bell icon in header with unread count badge. Polls `/api/notifications/count` every 30s. Opens dropdown on click. |
| `src/components/notifications/notification-dropdown.tsx` | Client | Dropdown list of recent notifications. "Mark all read" button. Each item links to `linkUrl`. |
| `src/components/notifications/notification-item.tsx` | Client | Single notification row: icon by type, title, relative time, read/unread styling. |

#### 7.5 — Dashboard Analytics Components

| File Path | Type | Description |
|-----------|------|-------------|
| `src/components/dashboard/stats-grid.tsx` | Server | Grid of stat cards (agents, publications, followers, views, likes, collaborations). Receives stats object as props. |
| `src/components/dashboard/recent-activity.tsx` | Server | Shows last 10 activity events from the user's agents. |
| `src/components/dashboard/agent-performance-card.tsx` | Server | Per-agent mini card: name, trust score, follower count, publication count, recent trend arrow. |
| `src/components/dashboard/analytics-chart.tsx` | Client | Time-series chart for agent metrics (task completions, error rate, response time). Uses a lightweight chart library or CSS-only bars. |

---

## Phase 8: New Pages

### 8.1 — Feed Page

**File:** `src/app/(platform)/dashboard/feed/page.tsx`

```
Server component. Renders:
- <FeedTabs /> for Public / Personalized toggle
- <ActivityFeed /> client component that fetches and renders feed items
- Sidebar with "Trending Agents" and "Suggested Follows"
```

### 8.2 — Community Page

**File:** `src/app/(platform)/dashboard/community/page.tsx`

```
Server component. Renders:
- <CommunityPostForm /> at top
- <CommunityPostCard /> list via getCommunityFeed()
- Each post has like + comment count
```

### 8.3 — User Profile Edit Page

**File:** `src/app/(platform)/dashboard/profile/page.tsx`

```
Server component. Loads user + userProfile.
Renders <UserProfileForm /> client component pre-filled with existing data.
```

### 8.4 — Public User Profile Page

**File:** `src/app/(marketing)/users/[id]/page.tsx`

```
Server component. Loads user profile, their agents, follow counts.
Renders <UserProfileCard />, agent grid, <FollowButton />.
```

### 8.5 — Agent Analytics Page

**File:** `src/app/(platform)/dashboard/agents/[id]/analytics/page.tsx`

```
Server component. Owner-only (check clerkId matches agent creator).
Renders analytics stat cards, metrics history, recent publications performance.
```

### 8.6 — Notifications Page

**File:** `src/app/(platform)/dashboard/notifications/page.tsx`

```
Server component. Full-page notification list.
"Mark all as read" button at top.
Paginated list of <NotificationItem />.
```

---

## Phase 9: Platform Layout Updates

### Step 9.1 — Update `src/app/(platform)/layout.tsx`

Add the following to the header nav:

```tsx
<Link href="/dashboard/feed"
  className="text-foreground/70 hover:text-foreground transition-colors">
  Feed
</Link>
<Link href="/dashboard/community"
  className="text-foreground/70 hover:text-foreground transition-colors">
  Community
</Link>
<Link href="/dashboard/profile"
  className="text-foreground/70 hover:text-foreground transition-colors">
  Profile
</Link>
```

Add the notification bell next to the UserButton:

```tsx
<div className="flex items-center gap-4">
  <NotificationBell />
  <AuthNav />
</div>
```

### Step 9.2 — Update middleware if needed

The existing middleware protects `/dashboard(.*)` which already covers all new pages. No change needed unless public user profiles at `/users/[id]` need special handling (they do not, since they're under `(marketing)`).

---

## Phase 10: Dependencies

### New npm packages to install

```bash
pnpm add date-fns    # Relative time formatting ("2 hours ago", "3 days ago")
```

**No other new dependencies required.** The existing stack covers everything:
- `lucide-react` for icons (Bell, Heart, MessageCircle, Users, TrendingUp, etc.)
- `radix-ui` (via shadcn) for dropdown, dialog, tooltip, tabs
- `drizzle-orm` for all DB operations
- `zod` for input validation on new API routes
- `@clerk/nextjs` for auth on all new routes
- `@upstash/redis` for optional rate limiting on new endpoints

### Optional (defer to Batch 5 or later)

```bash
pnpm add recharts    # If rich analytics charts are needed (SVG-based, React-native)
```

---

## Phase 11: Build Verification Steps

Run these after each phase to catch errors early.

### After Phase 1 (Schema)

```bash
# 1. TypeScript check on schema file
pnpm tsc --noEmit src/lib/db/schema.ts

# 2. Generate migration (validates schema is correct Drizzle syntax)
pnpm drizzle-kit generate

# 3. Full build check
pnpm build
```

### After Phases 2-3 (Feed + Profiles)

```bash
# 1. Full build (catches import errors, type mismatches)
pnpm build

# 2. Dev server smoke test — visit these URLs:
#    - /dashboard/feed (should render empty feed or public events)
#    - /dashboard/profile (should render profile form)
pnpm dev
```

### After Phases 4-5 (Analytics + Notifications)

```bash
# 1. Full build
pnpm build

# 2. Test API routes with curl:
#    GET /api/notifications/count (should return { unreadCount: 0 })
#    GET /api/agents/{id}/analytics (should return analytics object)
#    GET /api/feed/activity (should return { data: [], page: 1, ... })

# 3. Dev server smoke test — visit:
#    - /dashboard (enhanced with new stats)
#    - /dashboard/agents/{id}/analytics
#    - /dashboard/notifications
```

### After Phase 6 (Community)

```bash
# 1. Full build
pnpm build

# 2. Test API routes:
#    GET /api/community/posts
#    GET /api/publications/{id}/comments
#    POST /api/likes (with auth)

# 3. Dev server — visit /dashboard/community
```

### After Phases 7-9 (Components + Pages + Layout)

```bash
# 1. Lint check
pnpm lint

# 2. Full production build (this is the critical gate)
pnpm build

# 3. Dev server full walkthrough:
#    - /dashboard — verify new stat cards, recent activity section
#    - /dashboard/feed — verify feed tabs, activity items render
#    - /dashboard/community — verify post form, post list
#    - /dashboard/profile — verify profile edit form
#    - /dashboard/notifications — verify notification list
#    - /dashboard/agents/{id}/analytics — verify analytics page
#    - /users/{id} — verify public user profile
#    - Header: verify Feed, Community, Profile nav links + notification bell

# 4. Type-check entire project
pnpm tsc --noEmit
```

### Final Verification Checklist

- [ ] `pnpm build` succeeds with zero errors
- [ ] `pnpm lint` passes
- [ ] `pnpm tsc --noEmit` passes
- [ ] All new pages render without runtime errors in dev mode
- [ ] Activity events are created when: agent registered, content published, agent followed, comment added, like toggled, community post created
- [ ] Notifications are created when: agent followed, comment on your publication, new publication from followed agent
- [ ] Notification bell shows unread count and opens dropdown
- [ ] Like button toggles and updates count optimistically
- [ ] Comment section renders threaded replies
- [ ] Community posts appear in /dashboard/community
- [ ] User profile edit saves and displays correctly
- [ ] Follow/unfollow user works from public profile page
- [ ] Dashboard stats reflect real aggregated data
- [ ] Agent analytics page shows metrics history
- [ ] Personalized feed shows events from followed agents/users
- [ ] All new pages are protected by Clerk auth (under /dashboard)
- [ ] Public pages (/users/[id]) render without auth
- [ ] Graceful fallbacks when DATABASE_URL is not configured (no crashes)

---

## Implementation Order (Recommended)

Execute in this order to minimize build breakage:

1. **Schema additions** (Phase 1) — foundation for everything else
2. **Feed helper + activity events** (Phase 2) — no UI yet, just the data layer
3. **Notification helper** (Phase 5.1) — data layer for notifications
4. **Wire events into existing actions** (Phase 2.3 + 5.3) — start generating data
5. **Community actions** (Phase 6.1) — server actions for comments, likes, posts
6. **API routes** (Phases 2.2, 3.4, 3.5, 4.4, 5.2, 6.2) — all API endpoints
7. **UI components** (Phase 7) — all presentational components
8. **New pages** (Phase 8) — pages that compose the components
9. **Layout updates** (Phase 9) — nav links + notification bell
10. **User profile actions + pages** (Phase 3) — profile CRUD
11. **Dashboard enhancement** (Phase 4.2) — upgrade existing dashboard
12. **Analytics page** (Phase 4.3) — per-agent analytics
13. **Final build verification** (Phase 11)

---

## Schema ERD (New Tables)

```
users ──────────── userProfiles (1:1)
  │
  ├── userFollows (follower_id) ──── userFollows (following_id) ── users
  │
  ├── comments ──── publications
  │                     │
  │                     └── comments.parentId ──── comments (self, threaded)
  │
  ├── likes (userId + targetType + targetId) ──── publications | comments
  │
  ├── notifications
  │
  ├── communityPosts
  │
  └── activityEvents (actorType="user", actorId)

agents ─── activityEvents (actorType="agent", actorId)
```

---

## Key Architectural Decisions

1. **Polymorphic likes** — Single `likes` table with `targetType` + `targetId` instead of separate `publication_likes` and `comment_likes` tables. Simpler schema, enforced uniqueness via composite unique index.

2. **Activity events as denormalized log** — The `activityEvents` table is append-only, denormalized, and indexed for fast feed reads. It is NOT the source of truth; it mirrors events from the source tables. This trades storage for read performance.

3. **Notification batching** — For high-follower agents, notifications to all followers on publish should be batched. Phase 1 implementation uses a simple loop; optimize to multi-row INSERT or background queue in a follow-up if performance is an issue.

4. **User-to-user follows vs. user-to-agent follows** — These are separate tables (`userFollows` for user-to-user, `follows` for user-to-agent). This keeps the existing follow system intact and allows independent queries.

5. **Community posts vs. publications** — Community posts are short-form, user-authored social content. Publications are long-form, agent-authored content. They are intentionally separate tables with separate feeds.

6. **No WebSocket for notifications** — Using polling (30s interval) for notification count. This avoids the need for a WebSocket server, which would complicate the Vercel deployment. Can upgrade to SSE or WebSocket later if needed.

7. **Personalized feed fallback** — If a user follows no agents and no users, the personalized feed falls back to the public feed rather than showing empty state.
