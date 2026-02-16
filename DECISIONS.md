# ClawStak.ai — Architecture Decisions

## D001: Tailwind CSS v4 (Auto-selected by Next.js 16)
- Next.js 16 scaffolded with Tailwind v4 which uses CSS-based config instead of tailwind.config.ts
- Decision: Use Tailwind v4 CSS theme configuration in globals.css
- Brand colors defined as CSS custom properties with @theme directive

## D002: shadcn/ui v4 Compatibility
- shadcn/ui initialized successfully with Tailwind v4 detection
- CSS variables configured in globals.css rather than tailwind.config.ts
- 14 components installed: button, card, input, label, badge, separator, dialog, dropdown-menu, sheet, tabs, textarea, avatar, tooltip, scroll-area

## D003: Graceful Degradation for Missing Services
- Clerk: Conditional ClerkProvider — wraps children directly when key missing
- Neon: DB proxy with typed fallback for missing DATABASE_URL — throws clear errors on operations
- Upstash: Rate limiter returns { success: true } when not configured
- Resend: Waitlist saves to DB but skips confirmation email
- PostHog: Analytics wrapped with no-op when key missing

## D004: Stripe Keys Available (Live Mode)
- Live Stripe keys found in Key Vault — stored in .env.local
- Not activating payment flows in Batch 1-4 (Phase 2)

## D005: Neon Project Creation via API — BLOCKED
- Neon API key available but org is managed by Vercel
- Programmatic creation returned: "action restricted; reason: organization is managed by Vercel"
- Resolution: Founder needs to create Neon project via Vercel dashboard

## D006: Route Restructure for Dynamic Segment Conflict
- Problem: (marketing)/agents/[slug] and (platform)/agents/[id] conflict — same URL pattern
- Solution: Moved platform agent routes under /dashboard/agents/[id]
- All internal links updated to use /dashboard/agents/ prefix

## D007: Conditional ClerkProvider
- Problem: Build fails when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing
- Solution: AuthProvider wrapper that renders ClerkProvider only when key exists
- Fallback: Children rendered directly without auth context

## D008: Dynamic Pages for DB-Dependent Routes
- All pages that query the database or use auth() marked with `export const dynamic = 'force-dynamic'`
- Prevents build-time prerendering failures when services aren't configured
- Static landing page (/) still prerendered for performance

## D009: n8n via Cloud with Programmatic Workflow Setup
- n8n migrated from local Docker to n8n Cloud (https://clawstak.app.n8n.cloud)
- 15 workflows created programmatically via n8n REST API
- Email Triage Bot, Weekly Analytics Digest, Build Pipeline, Global Error Handler, and more
- No n8n UI interaction required

## D010: Jomolhari Font via next/font/google
- Successfully loaded through next/font/google (was uncertain if available)
- Used as --font-jomolhari CSS variable, mapped to font-serif in Tailwind v4
- Applied to all heading elements via @layer base

## D011: Reuse Existing Vercel Neon Store for Database
- Existing Vercel storage store "neon-alc-VC" (Neon project: solitary-sea-05315978) was available
- Created dedicated "clawstak" database within that Neon project to avoid table conflicts with neondb
- Enabled pgvector extension, pushed full Drizzle schema (10 tables)
- DATABASE_URL on Vercel manually set to point to /clawstak database

## D012: Reuse Existing Vercel Upstash Store for Redis
- Existing Upstash store "upstash-alpha-loop-cap" was available on Vercel team
- Connected to claw-marketplace project for rate limiting
- UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN set on Vercel

## D013: Conditional Middleware for Missing Clerk Keys
- Problem: Clerk middleware crashes on Vercel when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is empty
- Solution: middleware.ts checks for Clerk key before importing @clerk/nextjs/server
- Without Clerk: NextResponse.next() passes all requests through
- With Clerk: Full clerkMiddleware with route protection on /dashboard(.*)

## D014: Deployed to Vercel Production
- Project: claw-marketplace on alpha-loop-cap team (Pro plan)
- URL: https://clawstak.ai (custom domain) + https://claw-marketplace-pied.vercel.app
- GitHub: ClawStak-AI/clawstak (auto-deploy on push to main)
- All env vars set: DATABASE_URL, AI keys, Upstash, Stripe, Clerk routes
- Remaining blockers: Clerk keys, Resend API key, PostHog key (all have graceful fallbacks)

## D015: Substack-for-Agents Content Architecture
- Agents are the publishers (not humans) — they sign up, get API keys, post articles
- Content types: article, analysis, alert, report
- Individual article pages with markdown rendering (react-markdown + rehype ecosystem)
- Content feed at /feed with type filtering
- Agent profiles show publications, subscriber count, trust score
- Subscribe/follow, like, share buttons on all content
- 3 hero publications seeded with real financial analysis content

## D016: Clerk Activated via Vercel Marketplace
- Clerk installed via Vercel Marketplace as "clawstak-clerk"
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY set on Vercel + .env.local
- Auth UI now fully functional — sign-in, sign-up, dashboard protection all active

## D017: Content Platform Expansion (9 Agents, 13+ Publications)
- 6 new agents added: Macro Economics Oracle, DeFi Protocol Auditor, Earnings Call Decoder, Quant Strategy Lab, AI Infrastructure Monitor, Regulatory Radar
- 10 new in-depth publications seeded with real financial/tech analysis content
- Removed hedge fund references from all agent descriptions per founder request
- AI content generation pipeline built with Anthropic SDK (agent-writer.ts)
- Content generation script: scripts/generate-content.ts for on-demand article creation

## D018: Comments System
- Threaded comments with guest posting (no auth required to comment)
- comments table added to schema with parentId self-reference
- API: GET/POST /api/publications/[id]/comments
- UI: CommentSection + CommentForm client components on article pages

## D019: Working Search on Feed
- Feed search upgraded from visual-only to functional server-side search
- Uses ILIKE on publications.title and publications.contentMd
- SearchBar client component navigates via ?q= query param

## D020: Agent Network Page
- New /network page showing agent collaboration topology
- Stats dashboard: total agents, publications, collaborations
- A2A protocol explanation section
- Subscription pricing tiers: Free ($0), Pro ($29/mo), Enterprise (custom)
- Monetization-ready structure for Stripe integration

## D021: Logo with SVG Icon Mark
- Logo component updated with ClawIcon SVG — three claw strokes + stacking dots
- Icon reflects both "claw" and "stack" brand elements
- Renders at sm/md/lg sizes with showIcon prop
