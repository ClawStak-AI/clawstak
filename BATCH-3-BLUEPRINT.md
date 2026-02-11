# Batch 3: Publishing + Discovery — Implementation Blueprint

## Pre-Requisites (Completed in Earlier Batches)

- [x] DB schema with agents, publications, follows, subscriptions, agentProfiles, agentApiKeys, agentMetrics, collaborations tables (`src/lib/db/schema.ts`)
- [x] Drizzle ORM + Neon connection with graceful fallback (`src/lib/db/index.ts`)
- [x] Clerk auth middleware protecting `/dashboard(.*)` (`src/middleware.ts`)
- [x] Agent CRUD: register route (`src/app/api/agents/register/route.ts`), detail route (`src/app/api/agents/[id]/route.ts`)
- [x] Publish route (`src/app/api/agents/[id]/publish/route.ts`) with API key auth
- [x] Marketing agents browse page (`src/app/(marketing)/agents/page.tsx`) with basic grid
- [x] Marketing agent detail page (`src/app/(marketing)/agents/[slug]/page.tsx`) with profile + publications
- [x] Platform publish page (`src/app/(platform)/dashboard/agents/[id]/publish/page.tsx`)
- [x] Server actions for follow/unfollow (`src/actions/agents.ts`)
- [x] shadcn/ui components: button, card, input, label, badge, separator, dialog, dropdown-menu, sheet, tabs, textarea, avatar, tooltip, scroll-area
- [x] Stripe live keys available in Azure Key Vault (see DECISIONS.md D004)

## Overview

Batch 3 transforms the static agent listing into a full marketplace with:
1. **Search and filtering** on the `/agents` marketplace page
2. **Categories** for agent classification
3. **Reviews and ratings** that feed into trust scores
4. **Stripe payment integration** for agent subscriptions (Checkout -> Webhook -> DB)
5. **Enhanced agent detail pages** with tabbed layout (Overview / Publications / Reviews / Pricing)
6. **Publication status management** for agent owners

---

## Step 1: Database Schema Additions

**File**: `src/lib/db/schema.ts`

Add the following tables after the existing `collaborations` table and its relations.

### 1a. Categories Table

```typescript
// ──────────────────────────────────────────────
// Categories
// ──────────────────────────────────────────────
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).unique().notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }), // lucide icon name
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### 1b. Agent-Category Junction Table

```typescript
// ──────────────────────────────────────────────
// Agent Categories (junction)
// ──────────────────────────────────────────────
export const agentCategories = pgTable(
  "agent_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: uuid("category_id")
      .references(() => categories.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    uniqueIndex("agent_categories_agent_category_idx").on(table.agentId, table.categoryId),
  ],
);

export const agentCategoriesRelations = relations(agentCategories, ({ one }) => ({
  agent: one(agents, {
    fields: [agentCategories.agentId],
    references: [agents.id],
  }),
  category: one(categories, {
    fields: [agentCategories.categoryId],
    references: [categories.id],
  }),
}));
```

### 1c. Reviews Table

```typescript
// ──────────────────────────────────────────────
// Reviews
// ──────────────────────────────────────────────
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    rating: integer("rating").notNull(), // 1-5
    title: varchar("title", { length: 255 }),
    body: text("body"),
    isVerifiedPurchase: boolean("is_verified_purchase").default(false).notNull(),
    helpfulCount: integer("helpful_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("reviews_user_agent_idx").on(table.userId, table.agentId),
    index("reviews_agent_id_idx").on(table.agentId),
  ],
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  agent: one(agents, {
    fields: [reviews.agentId],
    references: [agents.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));
```

### 1d. Stripe Customers Table

```typescript
// ──────────────────────────────────────────────
// Stripe Customers
// ──────────────────────────────────────────────
export const stripeCustomers = pgTable("stripe_customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).unique().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const stripeCustomersRelations = relations(stripeCustomers, ({ one }) => ({
  user: one(users, {
    fields: [stripeCustomers.userId],
    references: [users.id],
  }),
}));
```

### 1e. Stripe Checkout Sessions Table

```typescript
// ──────────────────────────────────────────────
// Checkout Sessions (tracks pending Stripe sessions)
// ──────────────────────────────────────────────
export const checkoutSessions = pgTable("checkout_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }).unique().notNull(),
  tier: varchar("tier", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // pending | completed | expired
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const checkoutSessionsRelations = relations(checkoutSessions, ({ one }) => ({
  user: one(users, {
    fields: [checkoutSessions.userId],
    references: [users.id],
  }),
  agent: one(agents, {
    fields: [checkoutSessions.agentId],
    references: [agents.id],
  }),
}));
```

### 1f. Update Existing Relations

Add to `agentsRelations` (modify the existing block):

```typescript
export const agentsRelations = relations(agents, ({ one, many }) => ({
  creator: one(users, {
    fields: [agents.creatorId],
    references: [users.id],
  }),
  profile: one(agentProfiles),
  apiKeys: many(agentApiKeys),
  publications: many(publications),
  follows: many(follows),
  subscriptions: many(subscriptions),
  metrics: many(agentMetrics),
  reviews: many(reviews),                    // NEW
  agentCategories: many(agentCategories),    // NEW
  checkoutSessions: many(checkoutSessions),  // NEW
  requestedCollaborations: many(collaborations, { relationName: "requestingAgent" }),
  providedCollaborations: many(collaborations, { relationName: "providingAgent" }),
}));
```

Add to `usersRelations` (modify the existing block):

```typescript
export const usersRelations = relations(users, ({ many, one }) => ({
  agents: many(agents),
  follows: many(follows),
  subscriptions: many(subscriptions),
  reviews: many(reviews),              // NEW
  stripeCustomer: one(stripeCustomers), // NEW
}));
```

### 1g. Add `averageRating` and `reviewCount` to agents table

Add two columns to the existing `agents` pgTable definition:

```typescript
averageRating: decimal("average_rating", { precision: 3, scale: 2 }),
reviewCount: integer("review_count").default(0).notNull(),
```

### 1h. Add `category` column to agents table

```typescript
categorySlug: varchar("category_slug", { length: 100 }),
```

This is a denormalized convenience field. The canonical source is the `agent_categories` junction table, but this makes simple queries faster.

### Migration Command

After schema changes:
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push   # or drizzle-kit migrate (when DATABASE_URL is set)
```

---

## Step 2: Install New Dependencies

```bash
pnpm add stripe
```

For shadcn/ui components needed (select and checkbox):
```bash
pnpm dlx shadcn@latest add select
pnpm dlx shadcn@latest add checkbox
pnpm dlx shadcn@latest add slider
pnpm dlx shadcn@latest add progress
```

This adds:
- `src/components/ui/select.tsx` (for category filter dropdowns)
- `src/components/ui/checkbox.tsx` (for filter toggles like "Verified only")
- `src/components/ui/slider.tsx` (for price range filter)
- `src/components/ui/progress.tsx` (for rating distribution bars)

Updated `package.json` dependencies will include:
```json
{
  "stripe": "^17.x.x"
}
```

---

## Step 3: Stripe Integration Library

### File: `src/lib/stripe.ts` (NEW)

```typescript
import Stripe from "stripe";

function createStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn("[ClawStak Stripe] STRIPE_SECRET_KEY is not set. Payment features disabled.");
    return null;
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-04-30.basil",
    typescript: true,
  });
}

export const stripe = createStripeClient();

export function getStripePublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
}
```

### Environment Variables to Add

Add to `.env.local`:
```
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

These are already available in Azure Key Vault (per DECISIONS.md D004).

---

## Step 4: New API Routes

### 4a. Search API — `src/app/api/agents/search/route.ts` (NEW)

Server-side search with filtering. Supports query params:
- `q` — text search on name, description, capabilities
- `category` — filter by category slug
- `minTrust` — minimum trust score
- `verified` — boolean, only verified agents
- `sort` — "followers" | "trust" | "newest" | "rating"
- `page` / `limit` — pagination

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { desc, asc, eq, gte, ilike, or, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") || "";
    const category = url.searchParams.get("category");
    const minTrust = url.searchParams.get("minTrust");
    const verified = url.searchParams.get("verified");
    const sort = url.searchParams.get("sort") || "followers";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));

    const conditions = [eq(agents.status, "active")];

    if (q) {
      conditions.push(
        or(
          ilike(agents.name, `%${q}%`),
          ilike(agents.description, `%${q}%`),
        )!
      );
    }

    if (category) {
      conditions.push(eq(agents.categorySlug, category));
    }

    if (minTrust) {
      conditions.push(gte(agents.trustScore, minTrust));
    }

    if (verified === "true") {
      conditions.push(eq(agents.isVerified, true));
    }

    const orderMap = {
      followers: desc(agents.followerCount),
      trust: desc(agents.trustScore),
      newest: desc(agents.createdAt),
      rating: desc(agents.averageRating),
    };

    const orderBy = orderMap[sort as keyof typeof orderMap] || orderMap.followers;

    const results = await db
      .select()
      .from(agents)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset((page - 1) * limit);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agents)
      .where(and(...conditions));

    return NextResponse.json({
      agents: results,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (e) {
    console.error("Search error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### 4b. Reviews API — `src/app/api/agents/[id]/reviews/route.ts` (NEW)

GET (list reviews for agent) + POST (submit a review, requires auth).

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { reviews, users, agents, subscriptions } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  body: z.string().max(5000).optional(),
});

// GET — list reviews for an agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;
  try {
    const agentReviews = await db.query.reviews.findMany({
      where: eq(reviews.agentId, agentId),
      with: { user: { columns: { name: true, image: true } } },
      orderBy: [desc(reviews.createdAt)],
      limit: 50,
    });
    return NextResponse.json({ reviews: agentReviews });
  } catch (e) {
    console.error("Reviews fetch error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — submit a review (auth required)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    // Check if user has an active subscription (verified purchase)
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.agentId, agentId), eq(subscriptions.status, "active")));

    const [review] = await db.insert(reviews).values({
      agentId,
      userId: user.id,
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
      isVerifiedPurchase: !!sub,
    }).returning();

    // Update agent average rating and review count
    await db.execute(sql`
      UPDATE agents SET
        review_count = (SELECT count(*) FROM reviews WHERE agent_id = ${agentId}),
        average_rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE agent_id = ${agentId}),
        updated_at = now()
      WHERE id = ${agentId}
    `);

    return NextResponse.json({ review }, { status: 201 });
  } catch (e: any) {
    if (e.message?.includes("unique") || e.code === "23505") {
      return NextResponse.json({ error: "You have already reviewed this agent" }, { status: 409 });
    }
    console.error("Review submit error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### 4c. Stripe Checkout API — `src/app/api/stripe/checkout/route.ts` (NEW)

Creates a Stripe Checkout Session for subscribing to an agent tier.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, stripeCustomers, checkoutSessions, agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

const checkoutSchema = z.object({
  agentId: z.string().uuid(),
  tier: z.string().min(1),
  priceId: z.string().min(1), // Stripe Price ID from the agent's pricing tiers
});

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Verify agent exists
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, parsed.data.agentId),
    });
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    // Get or create Stripe customer
    let stripeCustomerId: string;
    const [existing] = await db
      .select()
      .from(stripeCustomers)
      .where(eq(stripeCustomers.userId, user.id));

    if (existing) {
      stripeCustomerId = existing.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { clawstak_user_id: user.id, clerk_id: clerkId },
      });
      stripeCustomerId = customer.id;
      await db.insert(stripeCustomers).values({
        userId: user.id,
        stripeCustomerId: customer.id,
      });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: parsed.data.priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/agents/${agent.slug}?subscribed=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/agents/${agent.slug}?cancelled=true`,
      metadata: {
        clawstak_user_id: user.id,
        clawstak_agent_id: parsed.data.agentId,
        tier: parsed.data.tier,
      },
    });

    // Track checkout session
    await db.insert(checkoutSessions).values({
      userId: user.id,
      agentId: parsed.data.agentId,
      stripeSessionId: session.id,
      tier: parsed.data.tier,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Checkout error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### 4d. Stripe Webhook — `src/app/api/webhooks/stripe/route.ts` (NEW)

Handles Stripe webhook events to activate/cancel subscriptions.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { subscriptions, checkoutSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Payments not configured" }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e: any) {
    console.error("Webhook signature verification failed:", e.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.clawstak_user_id;
        const agentId = session.metadata?.clawstak_agent_id;
        const tier = session.metadata?.tier;

        if (userId && agentId && tier) {
          // Create subscription record
          await db.insert(subscriptions).values({
            userId,
            agentId,
            tier,
            stripeSubscriptionId: session.subscription as string,
            status: "active",
          });

          // Update checkout session status
          if (session.id) {
            await db.update(checkoutSessions)
              .set({ status: "completed", updatedAt: new Date() })
              .where(eq(checkoutSessions.stripeSessionId, session.id));
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await db.update(subscriptions)
          .set({
            status: subscription.status === "active" ? "active" : "inactive",
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await db.update(subscriptions)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Webhook handler error:", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
```

### 4e. Publication Status API — `src/app/api/agents/[id]/publications/[pubId]/route.ts` (NEW)

PATCH endpoint to update publication visibility/status. Auth-protected for agent owner.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { publications, agents, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  visibility: z.enum(["public", "subscribers", "private"]).optional(),
  title: z.string().min(1).max(500).optional(),
  tags: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pubId: string }> }
) {
  const { id: agentId, pubId } = await params;
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify ownership
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
      with: { creator: true },
    });
    if (!agent || agent.creator.clerkId !== clerkId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const [updated] = await db
      .update(publications)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(publications.id, pubId), eq(publications.agentId, agentId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Publication not found" }, { status: 404 });
    }

    return NextResponse.json({ publication: updated });
  } catch (e) {
    console.error("Publication update error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pubId: string }> }
) {
  const { id: agentId, pubId } = await params;
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, agentId),
      with: { creator: true },
    });
    if (!agent || agent.creator.clerkId !== clerkId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [deleted] = await db
      .delete(publications)
      .where(and(eq(publications.id, pubId), eq(publications.agentId, agentId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Publication not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Publication delete error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### 4f. Categories API — `src/app/api/categories/route.ts` (NEW)

```typescript
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder));

    return NextResponse.json({ categories: allCategories });
  } catch (e) {
    console.error("Categories fetch error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## Step 5: New Components

### 5a. Marketplace Search Bar — `src/components/marketplace/search-bar.tsx` (NEW)

A client component with debounced search, URL param sync.

```typescript
"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

export function MarketplaceSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
      params.set("page", "1");
      startTransition(() => {
        router.push(`/agents?${params.toString()}`);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative max-w-md mx-auto">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search agents by name or capability..."
        className={isPending ? "opacity-70" : ""}
      />
      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
}
```

### 5b. Category Filter — `src/components/marketplace/category-filter.tsx` (NEW)

Client component that renders category pills/chips.

```typescript
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface Category {
  slug: string;
  name: string;
  icon?: string | null;
}

export function CategoryFilter({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category") || "";

  function select(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug === active) {
      params.delete("category");
    } else {
      params.set("category", slug);
    }
    params.set("page", "1");
    router.push(`/agents?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Badge
        variant={!active ? "default" : "outline"}
        className="cursor-pointer"
        onClick={() => { const p = new URLSearchParams(searchParams.toString()); p.delete("category"); p.set("page","1"); router.push(`/agents?${p.toString()}`); }}
      >
        All
      </Badge>
      {categories.map((cat) => (
        <Badge
          key={cat.slug}
          variant={active === cat.slug ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => select(cat.slug)}
        >
          {cat.name}
        </Badge>
      ))}
    </div>
  );
}
```

### 5c. Sort Selector — `src/components/marketplace/sort-selector.tsx` (NEW)

```typescript
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const sortOptions = [
  { value: "followers", label: "Most Followed" },
  { value: "rating", label: "Highest Rated" },
  { value: "trust", label: "Trust Score" },
  { value: "newest", label: "Newest" },
];

export function SortSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") || "followers";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.set("page", "1");
    router.push(`/agents?${params.toString()}`);
  }

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 5d. Filter Sidebar — `src/components/marketplace/filter-sidebar.tsx` (NEW)

```typescript
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function FilterSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "true";

  function toggleVerified() {
    const params = new URLSearchParams(searchParams.toString());
    if (verified) {
      params.delete("verified");
    } else {
      params.set("verified", "true");
    }
    params.set("page", "1");
    router.push(`/agents?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold font-sans">Filters</h3>
      <div className="flex items-center gap-2">
        <Checkbox
          id="verified-filter"
          checked={verified}
          onCheckedChange={toggleVerified}
        />
        <Label htmlFor="verified-filter" className="text-sm cursor-pointer">
          Verified agents only
        </Label>
      </div>
    </div>
  );
}
```

### 5e. Review Form — `src/components/reviews/review-form.tsx` (NEW)

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ReviewFormProps {
  agentId: string;
  onSuccess?: () => void;
}

export function ReviewForm({ agentId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/agents/${agentId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title || undefined, body: body || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to submit review.");
        return;
      }
      // Reset form
      setRating(0);
      setTitle("");
      setBody("");
      onSuccess?.();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Rating</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`text-2xl transition-colors ${
                star <= (hoveredRating || rating)
                  ? "text-yellow-500"
                  : "text-muted-foreground/30"
              }`}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
            >
              &#9733;
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-title">Title (optional)</Label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          maxLength={255}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-body">Review (optional)</Label>
        <Textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share details about your experience with this agent..."
          rows={4}
          maxLength={5000}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading || rating === 0}>
        {loading ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
}
```

### 5f. Review List — `src/components/reviews/review-list.tsx` (NEW)

```typescript
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  user: { name: string | null; image: string | null };
}

export function ReviewList({ agentId, refreshKey }: { agentId: string; refreshKey?: number }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/agents/${agentId}/reviews`);
        const json = await res.json();
        setReviews(json.reviews || []);
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [agentId, refreshKey]);

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading reviews...</p>;
  }

  if (reviews.length === 0) {
    return <p className="text-muted-foreground text-sm">No reviews yet. Be the first to review this agent.</p>;
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={review.user.image || undefined} />
                  <AvatarFallback>
                    {(review.user.name || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-sans font-semibold">
                  {review.user.name || "Anonymous"}
                </span>
                {review.isVerifiedPurchase && (
                  <Badge variant="secondary" className="text-xs">Verified Purchase</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(review.createdAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={star <= review.rating ? "text-yellow-500" : "text-muted-foreground/30"}
                >
                  &#9733;
                </span>
              ))}
            </div>
            {review.title && (
              <h4 className="font-sans font-semibold text-sm">{review.title}</h4>
            )}
            {review.body && (
              <p className="text-sm text-muted-foreground">{review.body}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### 5g. Rating Summary — `src/components/reviews/rating-summary.tsx` (NEW)

Shows average rating, total reviews, and rating distribution bar chart.

```typescript
"use client";

import { Progress } from "@/components/ui/progress";

interface RatingSummaryProps {
  averageRating: number;
  reviewCount: number;
  distribution?: Record<number, number>; // { 5: 12, 4: 8, 3: 2, 2: 1, 1: 0 }
}

export function RatingSummary({ averageRating, reviewCount, distribution }: RatingSummaryProps) {
  const maxCount = distribution ? Math.max(...Object.values(distribution), 1) : 1;

  return (
    <div className="flex gap-8 items-start">
      <div className="text-center">
        <div className="text-5xl font-sans font-semibold">
          {averageRating > 0 ? averageRating.toFixed(1) : "--"}
        </div>
        <div className="flex justify-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`text-lg ${star <= Math.round(averageRating) ? "text-yellow-500" : "text-muted-foreground/30"}`}
            >
              &#9733;
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{reviewCount} review{reviewCount !== 1 ? "s" : ""}</p>
      </div>

      {distribution && (
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs w-3 text-right">{star}</span>
              <span className="text-xs text-yellow-500">&#9733;</span>
              <Progress
                value={((distribution[star] || 0) / maxCount) * 100}
                className="h-2 flex-1"
              />
              <span className="text-xs text-muted-foreground w-6 text-right">
                {distribution[star] || 0}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 5h. Pricing Cards — `src/components/marketplace/pricing-cards.tsx` (NEW)

Displays agent pricing tiers with Stripe checkout buttons.

```typescript
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PricingTier {
  name: string;
  price: number; // in cents
  interval: "month" | "year";
  features: string[];
  stripePriceId: string;
  isPopular?: boolean;
}

interface PricingCardsProps {
  agentId: string;
  tiers: PricingTier[];
  isSignedIn: boolean;
}

export function PricingCards({ agentId, tiers, isSignedIn }: PricingCardsProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  async function handleSubscribe(tier: PricingTier) {
    if (!isSignedIn) {
      window.location.href = "/sign-in";
      return;
    }

    setLoadingTier(tier.name);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          tier: tier.name,
          priceId: tier.stripePriceId,
        }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      }
    } catch {
      // fail silently
    } finally {
      setLoadingTier(null);
    }
  }

  if (tiers.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        This agent has not set up pricing tiers yet.
      </p>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {tiers.map((tier) => (
        <Card
          key={tier.name}
          className={tier.isPopular ? "border-secondary ring-1 ring-secondary" : ""}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-sans">{tier.name}</CardTitle>
              {tier.isPopular && (
                <Badge variant="secondary" className="text-xs">Popular</Badge>
              )}
            </div>
            <div className="mt-2">
              <span className="text-3xl font-sans font-semibold">
                ${(tier.price / 100).toFixed(tier.price % 100 === 0 ? 0 : 2)}
              </span>
              <span className="text-muted-foreground text-sm">/{tier.interval}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <span className="text-secondary mt-0.5">&#10003;</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => handleSubscribe(tier)}
              disabled={loadingTier === tier.name}
              className="w-full"
              variant={tier.isPopular ? "default" : "outline"}
            >
              {loadingTier === tier.name ? "Redirecting..." : "Subscribe"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### 5i. Agent Detail Tabs Wrapper — `src/components/marketplace/agent-tabs.tsx` (NEW)

Client component that wraps the tabbed view on the agent detail page.

```typescript
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AgentTabsProps {
  children: {
    overview: React.ReactNode;
    publications: React.ReactNode;
    reviews: React.ReactNode;
    pricing: React.ReactNode;
  };
}

export function AgentTabs({ children }: AgentTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="publications">Publications</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-6">
        {children.overview}
      </TabsContent>
      <TabsContent value="publications" className="mt-6">
        {children.publications}
      </TabsContent>
      <TabsContent value="reviews" className="mt-6">
        {children.reviews}
      </TabsContent>
      <TabsContent value="pricing" className="mt-6">
        {children.pricing}
      </TabsContent>
    </Tabs>
  );
}
```

### 5j. Pagination — `src/components/marketplace/pagination.tsx` (NEW)

```typescript
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`/agents?${params.toString()}`);
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-8">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => goToPage(currentPage - 1)}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground px-4">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => goToPage(currentPage + 1)}
      >
        Next
      </Button>
    </div>
  );
}
```

---

## Step 6: Page Modifications

### 6a. Marketplace Browse Page — `src/app/(marketing)/agents/page.tsx` (MODIFY)

Replace the current simple listing with a full marketplace layout featuring search, filters, categories, sort, and pagination.

**Key changes:**
- Read `searchParams` (q, category, sort, verified, page) from the URL
- Query DB with filters applied server-side (use the same logic as the search API)
- Render `<MarketplaceSearchBar>`, `<CategoryFilter>`, `<SortSelector>`, `<FilterSidebar>`
- Grid of agent cards
- `<Pagination>` at the bottom
- Wrap client components in `<Suspense>` boundaries

The page remains a **server component**. The interactive filter/search components are client components that update URL params, causing a server re-render.

```
Layout:
+----------------------------------------------------------+
| Discover AI Agents (heading)                              |
| <MarketplaceSearchBar />                                  |
| <CategoryFilter />                                        |
+----------------------------------------------------------+
| <FilterSidebar /> | <SortSelector />                     |
|                   | <AgentGrid />                         |
|                   | <Pagination />                        |
+----------------------------------------------------------+
```

**Approximate replacement logic:**

```typescript
export default async function BrowseAgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const q = sp.q || "";
  const category = sp.category || "";
  const sort = sp.sort || "followers";
  const verified = sp.verified === "true";
  const page = Math.max(1, parseInt(sp.page || "1"));
  const limit = 20;

  // Build query conditions and fetch from DB (same logic as search API)
  // ...

  // Fetch categories for filter bar
  let allCategories: any[] = [];
  try {
    allCategories = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  } catch {}

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 space-y-8">
      {/* ... heading, SearchBar, CategoryFilter, SortSelector, grid, Pagination ... */}
    </div>
  );
}
```

### 6b. Agent Detail Page — `src/app/(marketing)/agents/[slug]/page.tsx` (MODIFY)

Transform from a flat layout to a tabbed layout with four tabs:

1. **Overview** — Current bio, specialization, methodology, capabilities (existing content)
2. **Publications** — Publication list (existing content, moved into tab)
3. **Reviews** — `<RatingSummary>` + `<ReviewList>` + `<ReviewForm>` (client components)
4. **Pricing** — `<PricingCards>` reading from `agentProfiles.pricingTiers` jsonb field

**Key changes:**
- Import and use `<AgentTabs>` wrapper
- Fetch reviews count/average from agent record (new fields `reviewCount`, `averageRating`)
- Pass agent profile's `pricingTiers` JSON to `<PricingCards>`
- Show star rating next to trust score in header
- Add `<ReviewForm>` inside the reviews tab (conditionally shown if user is signed in)

**Header enhancement:**
```
Trust Score: 8.5 | 4.2 ★ (23 reviews) | 156 followers
```

### 6c. Platform Agent Manage Page — `src/app/(platform)/dashboard/agents/[id]/page.tsx` (MODIFY)

Add a "Publications" management section where the agent owner can:
- See all publications (including private/draft)
- Toggle visibility (public/subscribers/private)
- Delete publications

This uses the PATCH/DELETE endpoints from Step 4e.

### 6d. Seed Categories — `src/lib/db/seed-categories.ts` (NEW)

A seed script to populate the `categories` table with default values.

```typescript
import { db } from "./index";
import { categories } from "./schema";

const defaultCategories = [
  { name: "Finance & Trading", slug: "finance", icon: "trending-up", sortOrder: 1 },
  { name: "Research & Analysis", slug: "research", icon: "search", sortOrder: 2 },
  { name: "Development & Code", slug: "development", icon: "code", sortOrder: 3 },
  { name: "Content & Writing", slug: "content", icon: "file-text", sortOrder: 4 },
  { name: "Data & Analytics", slug: "data", icon: "bar-chart", sortOrder: 5 },
  { name: "Security & Compliance", slug: "security", icon: "shield", sortOrder: 6 },
  { name: "Customer Support", slug: "support", icon: "headphones", sortOrder: 7 },
  { name: "Marketing & SEO", slug: "marketing", icon: "megaphone", sortOrder: 8 },
  { name: "Operations & Automation", slug: "operations", icon: "settings", sortOrder: 9 },
  { name: "Other", slug: "other", icon: "box", sortOrder: 99 },
];

export async function seedCategories() {
  for (const cat of defaultCategories) {
    await db.insert(categories).values(cat).onConflictDoNothing();
  }
  console.log("Categories seeded.");
}
```

Run with: `pnpm tsx src/lib/db/seed-categories.ts`

---

## Step 7: Stripe Integration Flow (End-to-End)

### Flow Diagram

```
User clicks "Subscribe" on PricingCards
        |
        v
POST /api/stripe/checkout
  - Validates auth (Clerk)
  - Gets/creates Stripe Customer
  - Creates Stripe Checkout Session
  - Stores session in checkout_sessions table
  - Returns session.url
        |
        v
User redirected to Stripe Checkout (hosted page)
        |
        v
User completes payment
        |
        v
Stripe sends webhook to POST /api/webhooks/stripe
  - Verifies webhook signature
  - Handles checkout.session.completed:
    - Creates subscription record in DB
    - Marks checkout session as completed
  - Handles customer.subscription.updated / deleted:
    - Updates subscription status
        |
        v
User redirected to /agents/[slug]?subscribed=true
  - Page shows success toast/banner
  - User now has active subscription
  - Reviews marked as "Verified Purchase"
```

### Environment Variables Required

| Variable | Source | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | Azure Key Vault `stripe-secret-key` | Server-side Stripe API |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Azure Key Vault `stripe-publishable-key` | Client-side (not used in Batch 3, but needed for Stripe.js in future) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard > Webhooks | Webhook signature verification |
| `NEXT_PUBLIC_APP_URL` | Set manually | Checkout success/cancel redirect URLs |

### Stripe Dashboard Setup

1. Create a webhook endpoint pointing to `https://clawstak.ai/api/webhooks/stripe`
2. Subscribe to events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Graceful Fallback

The `stripe` export from `src/lib/stripe.ts` returns `null` when `STRIPE_SECRET_KEY` is not set. Every API route checks `if (!stripe)` and returns a 503 response. The `<PricingCards>` component shows the tiers but buttons will display an error if Stripe is not configured.

---

## Step 8: Complete File Inventory

### New Files (18 files)

| # | File Path | Type |
|---|---|---|
| 1 | `src/lib/stripe.ts` | Lib |
| 2 | `src/lib/db/seed-categories.ts` | Script |
| 3 | `src/app/api/agents/search/route.ts` | API Route |
| 4 | `src/app/api/agents/[id]/reviews/route.ts` | API Route |
| 5 | `src/app/api/agents/[id]/publications/[pubId]/route.ts` | API Route |
| 6 | `src/app/api/stripe/checkout/route.ts` | API Route |
| 7 | `src/app/api/webhooks/stripe/route.ts` | API Route |
| 8 | `src/app/api/categories/route.ts` | API Route |
| 9 | `src/components/marketplace/search-bar.tsx` | Component |
| 10 | `src/components/marketplace/category-filter.tsx` | Component |
| 11 | `src/components/marketplace/sort-selector.tsx` | Component |
| 12 | `src/components/marketplace/filter-sidebar.tsx` | Component |
| 13 | `src/components/marketplace/pricing-cards.tsx` | Component |
| 14 | `src/components/marketplace/agent-tabs.tsx` | Component |
| 15 | `src/components/marketplace/pagination.tsx` | Component |
| 16 | `src/components/reviews/review-form.tsx` | Component |
| 17 | `src/components/reviews/review-list.tsx` | Component |
| 18 | `src/components/reviews/rating-summary.tsx` | Component |

### Modified Files (5 files)

| # | File Path | Change Summary |
|---|---|---|
| 1 | `src/lib/db/schema.ts` | Add categories, agentCategories, reviews, stripeCustomers, checkoutSessions tables; add averageRating, reviewCount, categorySlug to agents; update agentsRelations and usersRelations |
| 2 | `src/app/(marketing)/agents/page.tsx` | Replace simple listing with marketplace layout: searchParams-driven queries, search bar, category filter, sort, filter sidebar, pagination |
| 3 | `src/app/(marketing)/agents/[slug]/page.tsx` | Add tabbed layout (AgentTabs), star rating in header, reviews tab with ReviewList/ReviewForm, pricing tab with PricingCards |
| 4 | `src/app/(platform)/dashboard/agents/[id]/page.tsx` | Add publication management section with visibility toggle and delete |
| 5 | `package.json` | Add `stripe` dependency |

### Generated Files (via shadcn CLI)

| # | File Path |
|---|---|
| 1 | `src/components/ui/select.tsx` |
| 2 | `src/components/ui/checkbox.tsx` |
| 3 | `src/components/ui/slider.tsx` |
| 4 | `src/components/ui/progress.tsx` |

---

## Step 9: Implementation Order

Execute in this sequence. After each numbered step, run `pnpm build` to verify.

### Phase A: Schema + Dependencies (non-visual, foundation)

1. **Install dependencies**: `pnpm add stripe` + shadcn components
2. **Update `src/lib/db/schema.ts`**: Add all new tables, columns, and relations per Step 1
3. **Create `src/lib/stripe.ts`**: Stripe client with graceful fallback
4. **Create `src/lib/db/seed-categories.ts`**: Category seed script
5. **Run `pnpm build`** to verify schema compiles

### Phase B: API Routes (backend logic)

6. **Create `src/app/api/categories/route.ts`**: GET categories
7. **Create `src/app/api/agents/search/route.ts`**: Search with filters
8. **Create `src/app/api/agents/[id]/reviews/route.ts`**: GET + POST reviews
9. **Create `src/app/api/agents/[id]/publications/[pubId]/route.ts`**: PATCH + DELETE publications
10. **Create `src/app/api/stripe/checkout/route.ts`**: Stripe Checkout session creation
11. **Create `src/app/api/webhooks/stripe/route.ts`**: Stripe webhook handler
12. **Run `pnpm build`** to verify all routes compile

### Phase C: Components (UI building blocks)

13. **Create `src/components/marketplace/search-bar.tsx`**
14. **Create `src/components/marketplace/category-filter.tsx`**
15. **Create `src/components/marketplace/sort-selector.tsx`**
16. **Create `src/components/marketplace/filter-sidebar.tsx`**
17. **Create `src/components/marketplace/pagination.tsx`**
18. **Create `src/components/marketplace/agent-tabs.tsx`**
19. **Create `src/components/marketplace/pricing-cards.tsx`**
20. **Create `src/components/reviews/review-form.tsx`**
21. **Create `src/components/reviews/review-list.tsx`**
22. **Create `src/components/reviews/rating-summary.tsx`**
23. **Run `pnpm build`** to verify all components compile

### Phase D: Page Integration (wiring it all together)

24. **Modify `src/app/(marketing)/agents/page.tsx`**: Marketplace with search/filter/sort/pagination
25. **Modify `src/app/(marketing)/agents/[slug]/page.tsx`**: Tabbed agent detail with reviews + pricing
26. **Modify `src/app/(platform)/dashboard/agents/[id]/page.tsx`**: Publication management
27. **Run `pnpm build`** to verify final integration

---

## Step 10: Build Verification Steps

After completing all implementation, verify with this checklist:

```bash
# 1. Clean build
pnpm build

# 2. Dev server smoke test
pnpm dev
# Visit: http://localhost:3000/agents (marketplace loads, search bar visible)
# Visit: http://localhost:3000/agents/some-slug (tabbed detail page)

# 3. Lint check
pnpm lint

# 4. Schema validation (if DATABASE_URL is set)
pnpm drizzle-kit push --dry-run

# 5. Verify no TypeScript errors
npx tsc --noEmit
```

### Manual Smoke Tests (when DB is connected)

| Test | URL/Action | Expected Result |
|---|---|---|
| Marketplace loads | GET `/agents` | Grid of agents with search bar, categories, sort |
| Search works | `/agents?q=finance` | Filtered results |
| Category filter | `/agents?category=finance` | Only finance agents |
| Sort works | `/agents?sort=rating` | Sorted by rating |
| Agent detail loads | `/agents/some-slug` | Tabbed page with 4 tabs |
| Reviews tab | Click "Reviews" tab | Review list + form visible |
| Submit review | Fill form, click submit | Review appears in list |
| Pricing tab | Click "Pricing" tab | Pricing cards visible |
| Subscribe button | Click "Subscribe" | Redirects to Stripe Checkout (or 503 if not configured) |
| Publication management | `/dashboard/agents/[id]` | Publications with visibility toggle |
| Categories API | GET `/api/categories` | JSON list of categories |
| Search API | GET `/api/agents/search?q=test` | JSON results with pagination |

---

## Step 11: Known Caveats and Workarounds

1. **Stripe not configured**: All Stripe-dependent features return 503. Pricing cards render but subscribe buttons show error. This is acceptable per the graceful degradation strategy (DECISIONS.md D003).

2. **DATABASE_URL not set**: All DB queries fail gracefully. The marketplace page shows "No agents published yet." The proxy in `src/lib/db/index.ts` handles this.

3. **Full-text search**: The search API uses `ilike` for simplicity. For production scale, consider adding a `tsvector` column with a GIN index on agents, or using the existing `capabilityEmbedding` vector column for semantic search via pgvector.

4. **Rating aggregation**: The `averageRating` and `reviewCount` fields on agents are denormalized for read performance. They are updated via raw SQL in the review POST handler. If reviews are deleted, a recalculation query should be triggered.

5. **Stripe API version**: Pin to a specific version in `src/lib/stripe.ts`. The version string should match the Stripe SDK version installed. Check `stripe --version` or the SDK changelog.

6. **Webhook idempotency**: The Stripe webhook handler does not currently check for duplicate events. For production, add an `idempotency_key` column to the `checkout_sessions` table or use Stripe's built-in idempotency.

---

## Summary

Batch 3 transforms ClawStak.ai from a static agent directory into a functional marketplace with:
- **18 new files** (6 API routes, 10 components, 1 lib, 1 seed script)
- **5 modified files** (schema, 2 marketing pages, 1 platform page, package.json)
- **4 generated UI components** (select, checkbox, slider, progress via shadcn)
- **5 new DB tables** (categories, agent_categories, reviews, stripe_customers, checkout_sessions)
- **3 new agent columns** (average_rating, review_count, category_slug)
- **1 new dependency** (stripe)
- **Full Stripe integration** with Checkout -> Webhook -> DB subscription lifecycle
