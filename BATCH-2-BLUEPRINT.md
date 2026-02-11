# Batch 2 Blueprint: Auth + Agent Registration

## Scope

Batch 2 makes authentication fully functional, hardens the Clerk webhook for user sync, completes the agent registration flow end-to-end, adds proper form validation and error handling, and ensures the platform layout guards all protected routes. By the end of this batch, a user can sign up, land on a dashboard, register an AI agent, receive an API key, and manage that agent.

---

## 1. What Already Exists (Inventory)

### 1A. Auth Layer (PARTIAL -- scaffolded, not hardened)

| File | Status | Notes |
|------|--------|-------|
| `src/app/(auth)/layout.tsx` | EXISTS | Minimal passthrough layout, no styling wrapper |
| `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` | EXISTS | Uses `<SignIn>` from `@clerk/nextjs` with branded appearance |
| `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | EXISTS | Uses `<SignUp>` from `@clerk/nextjs` with branded appearance |
| `src/middleware.ts` | EXISTS | Clerk middleware protecting `/dashboard(.*)` only |
| `src/app/layout.tsx` | EXISTS | Root layout wraps with `<ClerkProvider>`, has graceful fallback when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is missing |
| `.env.local` | EXISTS | Clerk env vars defined but **values are empty** (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=`, `CLERK_SECRET_KEY=`) |

### 1B. Clerk Webhook (PARTIAL -- no signature verification)

| File | Status | Notes |
|------|--------|-------|
| `src/app/api/webhooks/clerk/route.ts` | EXISTS | Handles `user.created`, `user.updated`, `user.deleted` -- upserts into `users` table. **CRITICAL GAP: No Svix signature verification.** Raw `request.json()` with no HMAC check. |

### 1C. Agent Registration API (EXISTS -- functional)

| File | Status | Notes |
|------|--------|-------|
| `src/app/api/agents/register/route.ts` | EXISTS | POST endpoint. Validates with Zod, checks Clerk auth, rate-limits, creates agent + profile + API key, returns key once. Handles slug generation and unique constraint errors. |
| `src/app/(platform)/dashboard/agents/new/page.tsx` | EXISTS | Client component form. Calls `/api/agents/register`, handles loading/error states, displays API key on success. Located at `(platform)/dashboard/agents/new/` (NOT `(platform)/agents/new/` as originally listed in the task). |

### 1D. Agent Management Pages (EXISTS -- functional)

| File | Status | Notes |
|------|--------|-------|
| `src/app/(platform)/dashboard/page.tsx` | EXISTS | Server component. Loads user's agents from DB, shows stats cards, agent list with links. Has graceful DB fallback. |
| `src/app/(platform)/dashboard/agents/[id]/page.tsx` | EXISTS | Server component. Shows agent detail with trust score, followers, publications, capabilities. Verifies ownership via Clerk ID. |
| `src/app/(platform)/dashboard/agents/[id]/publish/page.tsx` | EXISTS | Client component. Publish form with API key auth, content type selector, tags, markdown editor. |

### 1E. Platform Layout (EXISTS -- functional)

| File | Status | Notes |
|------|--------|-------|
| `src/app/(platform)/layout.tsx` | EXISTS | Async server layout with `AuthNav` component. Dynamic imports for Clerk. Redirects to `/sign-in` if no userId. Has try/catch fallback that renders a "Sign In" link when Clerk fails. |

### 1F. Supporting Libraries (EXISTS)

| File | Status | Notes |
|------|--------|-------|
| `src/lib/db/schema.ts` | EXISTS | Full schema: `users`, `agents`, `agentProfiles`, `agentApiKeys`, `publications`, `follows`, `subscriptions`, `waitlist`, `agentMetrics`, `collaborations` with relations |
| `src/lib/db/index.ts` | EXISTS | Neon HTTP driver with Proxy-based graceful fallback when `DATABASE_URL` is missing |
| `src/lib/api-keys.ts` | EXISTS | `generateApiKey()`, `hashApiKey()`, `validateApiKeyFormat()` using `crypto` |
| `src/lib/rate-limit.ts` | EXISTS | Upstash rate limiter with no-op fallback |
| `src/lib/utils.ts` | EXISTS | `cn()`, `generateSlug()`, `formatDate()` |
| `src/actions/agents.ts` | EXISTS | Server actions: `followAgent()`, `unfollowAgent()` |
| `src/actions/publications.ts` | EXISTS | Server actions: `getAgentPublications()`, `getPublicFeed()` |

### 1G. Dependencies Already Installed

From `package.json`:
- `@clerk/nextjs@^6.37.3` -- Clerk auth
- `zod@^4.3.6` -- Validation
- `drizzle-orm@^0.45.1` -- ORM
- `@neondatabase/serverless@^1.0.2` -- DB driver
- `@upstash/ratelimit@^2.0.8` + `@upstash/redis@^1.36.2` -- Rate limiting

---

## 2. What Needs to Be Built / Changed

### GAP ANALYSIS

| # | Gap | Severity | Description |
|---|-----|----------|-------------|
| G1 | Clerk webhook signature verification | HIGH | Webhook is completely open -- anyone can POST fake events. Must add `svix` verification. |
| G2 | Middleware route protection incomplete | MEDIUM | Only `/dashboard(.*)` is protected. Should also protect `/api/agents/register`, and any future `/settings` routes. Public API routes (`/api/feed`, `/api/agents/[id]`) should stay open. |
| G3 | Auth layout has no branded styling | LOW | Auth layout is a bare `<>{children}</>` passthrough. Should center content with background and branding. |
| G4 | No `svix` dependency | HIGH | Required for Clerk webhook verification. Not in `package.json`. |
| G5 | No agent edit/update endpoint | MEDIUM | Can create agents but cannot update name, description, capabilities, or A2A endpoint. |
| G6 | No API key rotation | MEDIUM | Cannot revoke and regenerate API keys after initial creation. |
| G7 | No user settings/profile page | LOW | User can only see agents. No way to view/edit their own profile or see account info. |
| G8 | Dashboard does not compute publication/follower stats | LOW | `stats.totalPublications` and `stats.totalFollowers` are always 0 -- queries exist but results are not aggregated. |
| G9 | Slug collision handling | LOW | `generateSlug()` does not append a random suffix. Two agents named "My Agent" will collide. |
| G10 | No webhook secret env var | HIGH | `.env.local` has no `CLERK_WEBHOOK_SECRET` variable defined. |
| G11 | Missing `svix` package for webhook verification | HIGH | Clerk recommends `svix` for verifying webhook signatures. |

---

## 3. Step-by-Step Implementation Plan

### Step 1: Install `svix` dependency

```bash
cd C:\Users\tom\Dev\ClawStakAI\Development\clawstak
pnpm add svix
```

**Why**: Clerk webhook verification requires Svix to validate HMAC signatures on incoming webhook payloads. Without this, the webhook endpoint is unauthenticated and anyone can spoof user creation events.

No other new dependencies are needed. All other required packages (`@clerk/nextjs`, `zod`, `drizzle-orm`, etc.) are already installed.

---

### Step 2: Add `CLERK_WEBHOOK_SECRET` to environment config

**File**: `C:\Users\tom\Dev\ClawStakAI\Development\clawstak\.env.local`

Add this line (value stays empty until Clerk is configured):
```
CLERK_WEBHOOK_SECRET=
```

**Placement**: After the existing `CLERK_SECRET_KEY=` line.

---

### Step 3: Harden the Clerk webhook with Svix signature verification

**File**: `C:\Users\tom\Dev\ClawStakAI\Development\clawstak\src\app\api\webhooks\clerk\route.ts`

**What to change**:
1. Import `Webhook` from `svix`
2. Read the raw body as text (not JSON) first
3. Extract `svix-id`, `svix-timestamp`, `svix-signature` headers
4. Verify the signature using the `CLERK_WEBHOOK_SECRET` env var
5. Only then parse the JSON and process the event
6. Add graceful fallback: if `CLERK_WEBHOOK_SECRET` is not set, log a warning and process without verification (development mode only)

**New structure**:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Verify webhook signature (skip in dev if secret not set)
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (secret) {
      const wh = new Webhook(secret);
      const svixId = request.headers.get("svix-id");
      const svixTimestamp = request.headers.get("svix-timestamp");
      const svixSignature = request.headers.get("svix-signature");

      if (!svixId || !svixTimestamp || !svixSignature) {
        return NextResponse.json(
          { error: "Missing svix headers" },
          { status: 400 }
        );
      }

      try {
        wh.verify(body, {
          "svix-id": svixId,
          "svix-timestamp": svixTimestamp,
          "svix-signature": svixSignature,
        });
      } catch {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    } else {
      console.warn(
        "[ClawStak Webhook] CLERK_WEBHOOK_SECRET not set — skipping signature verification. Set this in production!"
      );
    }

    const event = JSON.parse(body) as ClerkWebhookEvent;

    // ... rest of switch/case logic stays the same ...
  } catch (e) {
    console.error("Clerk webhook error:", e);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
```

**Key behavioral change**: The endpoint now requires valid Svix signatures in production. In development (no `CLERK_WEBHOOK_SECRET`), it logs a warning and processes anyway.

---

### Step 4: Expand middleware route protection

**File**: `C:\Users\tom\Dev\ClawStakAI\Development\clawstak\src\middleware.ts`

**What to change**: The `isProtectedRoute` matcher currently only covers `/dashboard(.*)`. Expand it to also protect:
- `/api/agents/register` (agent creation requires auth)
- `/settings(.*)` (future user settings)

Leave these routes PUBLIC (no auth required):
- `/api/feed` -- public content feed
- `/api/agents/[id]` -- public agent detail
- `/api/agents/[id]/publish` -- uses API key auth, not Clerk session
- `/api/webhooks/(.*)` -- webhook endpoints need to accept external calls
- `/api/waitlist` -- public waitlist signup
- `/api/.well-known/(.*)` -- A2A agent card

**New structure**:
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/settings(.*)",
  "/api/agents/register",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

---

### Step 5: Add branded auth layout

**File**: `C:\Users\tom\Dev\ClawStakAI\Development\clawstak\src\app\(auth)\layout.tsx`

**What to change**: Replace the bare passthrough with a centered layout that includes branding.

**New structure**:
```typescript
import { Logo } from "@/components/shared/logo";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="mb-8">
        <Link href="/">
          <Logo />
        </Link>
      </div>
      {children}
      <p className="mt-8 text-xs text-muted-foreground max-w-md text-center">
        By signing in, you agree to ClawStak&apos;s Terms of Service and acknowledge
        that AI-generated content on this platform does not constitute financial advice.
      </p>
    </div>
  );
}
```

---

### Step 6: Fix slug collision in agent registration

**File**: `C:\Users\tom\Dev\ClawStakAI\Development\clawstak\src\lib\utils.ts`

**What to change**: Update `generateSlug()` to append a short random suffix to prevent collisions.

**New structure**:
```typescript
export function generateSlug(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}
```

**Impact**: Every agent slug will now be unique by default (e.g., `portfolio-sentinel-a3f8k2`). This eliminates the need for retry logic on unique constraint violations for slugs.

---

### Step 7: Add agent update API endpoint

**File**: `C:\Users\tom\Dev\ClawStakAI\Development\clawstak\src\app\api\agents\[id]\route.ts`

**What to change**: Add a `PATCH` method to the existing route file alongside the existing `GET`.

**New structure** (append to existing file):
```typescript
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

const updateAgentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  a2aEndpoint: z.string().url().optional().nullable(),
  mcpServerUrl: z.string().url().optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify ownership
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, id),
      with: { creator: true },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    if (agent.creator.clerkId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateAgentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(agents)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Agent update error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Additional imports needed at top of file**: `auth` from `@clerk/nextjs/server`, `z` from `zod`, `users` from schema.

---

### Step 8: Add API key rotation endpoint

**File** (NEW): `C:\Users\tom\Dev\ClawStakAI\Development\clawstak\src\app\api\agents\[id]\keys\route.ts`

**Purpose**: Allow agent owners to revoke existing keys and generate new ones.

**Structure**:
```typescript
// POST /api/agents/[id]/keys — Generate a new API key (revokes all previous)
// GET  /api/agents/[id]/keys — List active keys (prefix only, not full key)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { agents, agentApiKeys } from "@/lib/db/schema";
import { generateApiKey } from "@/lib/api-keys";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership through the agents -> users relation
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    with: { creator: true },
  });

  if (!agent || agent.creator.clerkId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Revoke all existing keys
  await db
    .update(agentApiKeys)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(agentApiKeys.agentId, agentId), eq(agentApiKeys.isActive, true)));

  // Generate new key
  const { key, hash, prefix } = generateApiKey();
  await db.insert(agentApiKeys).values({
    agentId,
    keyHash: hash,
    keyPrefix: prefix,
  });

  return NextResponse.json({ apiKey: key }, { status: 201 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    with: { creator: true },
  });

  if (!agent || agent.creator.clerkId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const keys = await db
    .select({
      id: agentApiKeys.id,
      keyPrefix: agentApiKeys.keyPrefix,
      permissions: agentApiKeys.permissions,
      isActive: agentApiKeys.isActive,
      lastUsedAt: agentApiKeys.lastUsedAt,
      createdAt: agentApiKeys.createdAt,
    })
    .from(agentApiKeys)
    .where(eq(agentApiKeys.agentId, agentId));

  return NextResponse.json({ keys });
}
```

---

### Step 9: Fix dashboard stats computation

**File**: `C:\Users\tom\Dev\ClawStakAI\Development\clawstak\src\app\(platform)\dashboard\page.tsx`

**What to change**: After fetching `userAgents`, compute `totalPublications` and `totalFollowers` with actual DB queries.

**Code to add** inside the `try` block, after `userAgents` is fetched:
```typescript
// Compute publication count across all user's agents
if (userAgents.length > 0) {
  const agentIds = userAgents.map((a) => a.id);
  const [pubCount] = await db
    .select({ count: count() })
    .from(publications)
    .where(inArray(publications.agentId, agentIds));
  stats.totalPublications = pubCount?.count || 0;

  // Sum follower counts from agents
  stats.totalFollowers = userAgents.reduce(
    (sum, a) => sum + (a.followerCount || 0),
    0
  );
}
```

**Additional import needed**: `inArray` from `drizzle-orm`.

---

### Step 10: Add agent edit page (UI)

**File** (NEW): `C:\Users\tom\Dev\ClawStakAI\Development\clawstak\src\app\(platform)\dashboard\agents\[id]\edit\page.tsx`

**Purpose**: Client component form that calls `PATCH /api/agents/[id]` to update agent details.

**Structure**:
- `"use client"` component
- Fetches current agent data on mount via `GET /api/agents/[id]`
- Pre-populates form fields (name, description, capabilities, A2A endpoint, MCP server URL)
- Submit calls `PATCH /api/agents/[id]` with updated fields
- Shows success/error states
- "Rotate API Key" button that calls `POST /api/agents/[id]/keys` and shows the new key once
- Link back to agent detail page

**Key UI elements**:
```
- Input: Agent Name (pre-filled)
- Textarea: Description (pre-filled)
- Capability tag editor (pre-filled, same pattern as new agent page)
- Input: A2A Endpoint URL (optional)
- Input: MCP Server URL (optional)
- Select: Status (active/inactive)
- Separator
- Section: "API Key Management"
  - Display current key prefix (cs_xxxxxx...)
  - Button: "Rotate API Key" with confirmation dialog
- Button: "Save Changes"
```

---

### Step 11: Add "Edit" link to agent detail page

**File**: `C:\Users\tom\Dev\ClawStakAI\Development\clawstak\src\app\(platform)\dashboard\agents\[id]\page.tsx`

**What to change**: Add an "Edit Agent" button next to the existing "Publish Content" button in the header.

```typescript
<div className="flex gap-3">
  <Link href={`/dashboard/agents/${id}/edit`}>
    <Button variant="outline">Edit Agent</Button>
  </Link>
  <Link href={`/dashboard/agents/${id}/publish`}>
    <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
      Publish Content
    </Button>
  </Link>
</div>
```

---

### Step 12: Add "Discover Agents" and "Settings" nav links to platform layout

**File**: `C:\Users\tom\Dev\ClawStakAI\Development\clawstak\src\app\(platform)\layout.tsx`

**What to change**: Add nav links for future pages. The nav currently has "Dashboard" and "New Agent". Add "Discover" (links to `/agents`) to the nav.

```typescript
<nav className="hidden md:flex items-center gap-6 text-sm">
  <Link href="/dashboard" className="text-foreground/70 hover:text-foreground transition-colors">
    Dashboard
  </Link>
  <Link href="/agents" className="text-foreground/70 hover:text-foreground transition-colors">
    Discover
  </Link>
  <Link href="/dashboard/agents/new" className="text-foreground/70 hover:text-foreground transition-colors">
    New Agent
  </Link>
</nav>
```

---

## 4. Dependencies to Install

| Package | Version | Purpose | Command |
|---------|---------|---------|---------|
| `svix` | latest | Clerk webhook signature verification | `pnpm add svix` |

That is the **only** new dependency required. Everything else is already in `package.json`.

---

## 5. Build Verification Commands

Run these after each step to ensure nothing breaks:

```bash
# From C:\Users\tom\Dev\ClawStakAI\Development\clawstak

# 1. TypeScript type check (catches import errors, type mismatches)
pnpm exec tsc --noEmit

# 2. Full production build (catches runtime issues, RSC errors)
pnpm build

# 3. Lint check
pnpm lint

# 4. Quick smoke test — start dev server and check key routes respond
pnpm dev
# Then manually verify in browser or curl:
#   GET  http://localhost:3000/sign-in        -> Clerk sign-in page (or fallback)
#   GET  http://localhost:3000/dashboard       -> Redirects to /sign-in (no auth)
#   GET  http://localhost:3000/api/feed        -> Returns JSON (even if empty)
#   POST http://localhost:3000/api/webhooks/clerk -> Should work (webhook endpoint)
```

### Expected Build Warnings (Not Errors)
- `[ClawStak DB] DATABASE_URL is not set` -- expected until Neon is configured
- `[ClawStak Webhook] CLERK_WEBHOOK_SECRET not set` -- expected until Clerk is configured
- Clerk components may render placeholder/error UI if `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is empty

---

## 6. Known Gotchas and Graceful Fallback Requirements

### Gotcha 1: Clerk Keys Missing (CRITICAL)

**Problem**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are empty in `.env.local`. Without them:
- `<ClerkProvider>` will throw at runtime
- `auth()` calls will fail
- `<SignIn>` and `<SignUp>` components will not render

**Existing fallback**: Root layout (`src/app/layout.tsx`) already has:
```typescript
function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <>{children}</>;
  }
  return <ClerkProvider>{children}</ClerkProvider>;
}
```

**Additional fallbacks needed**:
1. **Middleware**: The Clerk middleware will throw if keys are missing. Wrap `clerkMiddleware` in a try/catch or check for the key before calling `auth.protect()`:
   ```typescript
   export default clerkMiddleware(async (auth, req) => {
     if (isProtectedRoute(req)) {
       try {
         await auth.protect();
       } catch {
         // Clerk not configured -- allow through in dev
         if (!process.env.CLERK_SECRET_KEY) return;
         throw; // Re-throw in production
       }
     }
   });
   ```

2. **Platform layout**: Already has try/catch around `auth()` in `AuthNav` -- this is sufficient.

3. **Dashboard page**: Calls `auth()` directly and redirects. Needs a try/catch:
   ```typescript
   let clerkId: string | null = null;
   try {
     const result = await auth();
     clerkId = result.userId;
   } catch {
     // Clerk not configured
   }
   if (!clerkId) redirect("/sign-in");
   ```

4. **Agent register API**: Already has `auth()` at top. Same try/catch pattern needed.

### Gotcha 2: DATABASE_URL Missing

**Problem**: Database operations will fail. All DB calls throw `"DATABASE_URL is not configured"`.

**Existing fallback**: `src/lib/db/index.ts` returns a Proxy that throws on any operation. Each consumer must catch this.

**Required pattern**: Every server component and API route that uses `db` must wrap calls in try/catch blocks. The existing code largely does this already:
- Dashboard: has try/catch with empty-state UI
- Agent detail: has try/catch with `notFound()`
- Agent register API: has try/catch with 500 response
- Webhook: has try/catch with 500 response

**No additional changes needed** -- the fallback pattern is already in place.

### Gotcha 3: Webhook Without Secret in Development

**Problem**: In local dev, the Clerk webhook will be called manually or via Clerk's dashboard test. Without `CLERK_WEBHOOK_SECRET`, signature verification cannot work.

**Solution**: The new webhook code (Step 3) includes a graceful fallback:
```typescript
if (secret) {
  // Verify signature
} else {
  console.warn("[ClawStak Webhook] CLERK_WEBHOOK_SECRET not set — skipping verification");
}
```

This allows testing the webhook handler locally while maintaining security in production.

### Gotcha 4: Clerk Middleware + API Routes

**Problem**: If Clerk middleware is applied to API routes that use **API key auth** (like `/api/agents/[id]/publish`), it will reject requests from agents that don't have a Clerk session.

**Solution**: Do NOT add these API key-authenticated routes to the protected route matcher. The middleware only protects session-based routes:
- Protected by Clerk middleware: `/dashboard(.*)`, `/settings(.*)`, `/api/agents/register`
- Protected by API key: `/api/agents/[id]/publish` (handled in route handler itself)
- Public: `/api/feed`, `/api/agents/[id]` (GET), `/api/.well-known/*`, `/api/waitlist`, `/api/webhooks/*`

### Gotcha 5: `svix` and Edge Runtime

**Problem**: `svix` uses Node.js `crypto` module internally. If any API route is configured for Edge runtime, `svix` will fail.

**Solution**: The webhook route file must NOT export `export const runtime = "edge"`. Keep it on the Node.js runtime (the default). This is already the case -- no file in the project currently specifies Edge runtime.

### Gotcha 6: Clerk `auth()` in Server Components vs API Routes

**Pattern difference**:
- **Server Components** (dashboard, agent detail): Use `const { userId } = await auth()` from `@clerk/nextjs/server`
- **API Routes** (register, webhook): Same import, same usage
- **Client Components** (new agent form, publish form): Use `fetch()` to call API routes -- they DON'T call `auth()` directly. The API route handles auth.

This pattern is already correctly implemented throughout the codebase.

### Gotcha 7: Zod v4 Breaking Changes

**Problem**: The project uses `zod@^4.3.6` which has different API from Zod v3. Key differences:
- `z.object()` works the same
- `.safeParse()` works the same
- `.flatten()` on errors works the same
- BUT: if any Zod v3-specific patterns are used, they may break

**Solution**: The existing Zod usage is basic (`.object()`, `.string()`, `.array()`, `.enum()`, `.safeParse()`) and is compatible with Zod v4. No changes needed.

---

## 7. File Change Summary

| File | Action | Step |
|------|--------|------|
| `package.json` | ADD `svix` dependency | 1 |
| `.env.local` | ADD `CLERK_WEBHOOK_SECRET=` | 2 |
| `src/app/api/webhooks/clerk/route.ts` | MODIFY -- add Svix verification | 3 |
| `src/middleware.ts` | MODIFY -- expand protected routes | 4 |
| `src/app/(auth)/layout.tsx` | MODIFY -- add branding | 5 |
| `src/lib/utils.ts` | MODIFY -- improve slug generation | 6 |
| `src/app/api/agents/[id]/route.ts` | MODIFY -- add PATCH method | 7 |
| `src/app/api/agents/[id]/keys/route.ts` | CREATE -- API key rotation | 8 |
| `src/app/(platform)/dashboard/page.tsx` | MODIFY -- fix stats computation | 9 |
| `src/app/(platform)/dashboard/agents/[id]/edit/page.tsx` | CREATE -- agent edit UI | 10 |
| `src/app/(platform)/dashboard/agents/[id]/page.tsx` | MODIFY -- add Edit link | 11 |
| `src/app/(platform)/layout.tsx` | MODIFY -- add nav links | 12 |

### Files NOT Changed (confirmed working as-is)
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` -- Clerk SignIn component, no changes needed
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` -- Clerk SignUp component, no changes needed
- `src/app/layout.tsx` -- Root layout, ClerkProvider fallback already in place
- `src/lib/db/schema.ts` -- Schema is complete for Batch 2
- `src/lib/db/index.ts` -- Graceful proxy fallback already in place
- `src/lib/api-keys.ts` -- Key generation works correctly
- `src/lib/rate-limit.ts` -- Upstash fallback already in place
- `src/app/api/agents/register/route.ts` -- Registration API is complete
- `src/app/(platform)/dashboard/agents/new/page.tsx` -- Registration form is complete
- `src/app/(platform)/dashboard/agents/[id]/publish/page.tsx` -- Publish form is complete
- `src/actions/agents.ts` -- Follow/unfollow actions work
- `src/actions/publications.ts` -- Publication queries work

---

## 8. Implementation Order (Dependency Graph)

```
Step 1 (install svix)
  |
  v
Step 2 (env var) -----> Step 3 (webhook hardening)
  |
  v
Step 4 (middleware) ---> independent of Step 3
  |
  v
Step 5 (auth layout) -> independent
  |
  v
Step 6 (slug fix) ----> independent
  |
  v
Step 7 (PATCH agent) -> Step 10 (edit page) -> Step 11 (edit link)
  |
  v
Step 8 (key rotation) -> feeds into Step 10 (edit page has key rotation)
  |
  v
Step 9 (dashboard stats) -> independent
  |
  v
Step 12 (nav links) ---> independent
```

**Recommended parallel execution**:
- **Wave 1**: Steps 1, 2 (prerequisites)
- **Wave 2**: Steps 3, 4, 5, 6 (all independent after Wave 1)
- **Wave 3**: Steps 7, 8, 9, 12 (independent of each other)
- **Wave 4**: Steps 10, 11 (depend on Step 7 and 8)
- **Wave 5**: Build verification (`pnpm build`)

---

## 9. Testing Checklist

After implementation, verify these scenarios work:

- [ ] `pnpm build` completes with zero errors
- [ ] `/sign-in` renders Clerk SignIn component (or fallback text if keys missing)
- [ ] `/sign-up` renders Clerk SignUp component (or fallback text if keys missing)
- [ ] `/dashboard` redirects to `/sign-in` when not authenticated
- [ ] `/dashboard` shows empty state when authenticated but no agents
- [ ] `/dashboard/agents/new` renders registration form
- [ ] `POST /api/agents/register` returns 401 without auth
- [ ] `POST /api/agents/register` returns agent + API key with valid auth
- [ ] `POST /api/webhooks/clerk` processes user creation events
- [ ] `POST /api/webhooks/clerk` rejects requests with bad signatures (when secret is set)
- [ ] `PATCH /api/agents/[id]` updates agent fields for owner
- [ ] `PATCH /api/agents/[id]` returns 403 for non-owner
- [ ] `POST /api/agents/[id]/keys` rotates API key and returns new key
- [ ] `GET /api/agents/[id]/keys` returns key prefixes (not full keys)
- [ ] `/dashboard/agents/[id]/edit` renders edit form with pre-populated data
- [ ] Dashboard stats show correct publication and follower counts
- [ ] Slug generation produces unique slugs for same-name agents
