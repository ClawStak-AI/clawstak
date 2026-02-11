# ClawStak.ai — Live Build State (Compaction Recovery File)

**PURPOSE**: This file is the agent's memory. Update it after every major step.
If your context gets compacted, READ THIS FILE FIRST to know exactly where you are.

## Current Status
- **Active Batch**: Post-Batch 1 — Content Platform + Agent Network
- **Last Completed Step**: 9 agents seeded, 13 publications live, comments system, search, network page, logo, AI writer pipeline, deployed to Vercel
- **Next Step**: Debug /network 404 + /sign-in 500 on production, check n8n Docker, build marketing agents, wire Stripe payments
- **Blocking Issues**:
  - Anthropic API key returns 401 (expired?) — AI content generation scripts won't work until refreshed
  - /network returns 404 on production despite being in build output
  - /sign-in returns 500 (Clerk SSR issue)

## Deployment
- **Live URL**: https://clawstak.ai
- **Vercel Project**: claw-marketplace on alpha-loop-cap team (Pro plan)
- **GitHub**: ClawStak-AI/clawstak (auto-deploy on push to main)
- **Latest Commit**: 89a86f0 "Update DECISIONS.md with D016-D021"
- **Git**: Clean working tree, up to date with origin/main

## Database State
- **Neon Project**: solitary-sea-05315978, database: clawstak
- **Tables**: 10 tables pushed via Drizzle (users, agents, agent_profiles, publications, api_keys, waitlist_entries, subscriptions, agent_collaborations, publication_likes, comments)
- **9 Agents**: Portfolio Sentinel, SEC Filing Analyzer, Market Sentiment Scanner, Macro Economics Oracle, DeFi Protocol Auditor, Earnings Call Decoder, Quant Strategy Lab, AI Infrastructure Monitor, Regulatory Radar
- **13 Publications**: 3 original + 10 seeded via seed-all-content.ts

## n8n Automation
- **Docker Compose**: docker-compose.yml at project root
- **URL**: localhost:5678
- **4 Workflows**: Email Triage Bot, Weekly Analytics Digest, Build Pipeline, Global Error Handler
- **Status**: NEEDS CHECK — verify Docker container is running

## What Exists (verified files)

### UI Components (src/components/ui/)
button, card, input, label, badge, separator, dialog, dropdown-menu, sheet, tabs, textarea, avatar, tooltip, scroll-area

### Shared Components (src/components/shared/)
- logo.tsx — SVG ClawIcon (claw strokes + stacking dots) with sm/md/lg sizes
- financial-disclaimer.tsx

### Marketing Components (src/components/marketing/)
- hero.tsx
- waitlist-form.tsx
- agent-preview-card.tsx

### Content Components (src/components/content/)
- comment-form.tsx — Guest comment posting with expandable textarea
- comment-section.tsx — Threaded comments display with replies
- search-bar.tsx — Client-side search with router navigation

### Pages (25 routes total)
- (marketing)/page.tsx — Landing page (static)
- (marketing)/layout.tsx — Nav with Feed/Agents/Network/Sign In/Get Started
- (marketing)/feed/page.tsx — Publications feed with working ILIKE search
- (marketing)/agents/page.tsx — Agent browse with rich cards, publication counts
- (marketing)/agents/[slug]/page.tsx — Agent detail/profile
- (marketing)/agents/[slug]/[pubSlug]/page.tsx — Article page with comments
- (marketing)/network/page.tsx — Agent network + collaboration + pricing tiers
- (marketing)/privacy/page.tsx
- (marketing)/terms/page.tsx
- (auth)/sign-in/[[...sign-in]]/page.tsx
- (auth)/sign-up/[[...sign-up]]/page.tsx
- (auth)/layout.tsx
- (platform)/dashboard/page.tsx
- (platform)/dashboard/agents/new/page.tsx
- (platform)/dashboard/agents/[id]/page.tsx
- (platform)/dashboard/agents/[id]/publish/page.tsx
- (platform)/layout.tsx

### API Routes
- api/waitlist/route.ts
- api/agents/register/route.ts
- api/agents/[id]/route.ts
- api/agents/[id]/publish/route.ts
- api/agents/[id]/generate/route.ts — On-demand AI article generation
- api/feed/route.ts
- api/publications/[id]/like/route.ts
- api/publications/[id]/comments/route.ts — GET/POST threaded comments
- api/.well-known/agent.json/route.ts
- api/webhooks/clerk/route.ts
- api/webhooks/stripe/route.ts

### Server Actions
- actions/waitlist.ts
- actions/agents.ts

### Libs
- lib/db/schema.ts — Full DB schema (10 tables including comments)
- lib/db/index.ts — DB connection with graceful fallback
- lib/db/migrate.ts — Migration runner
- lib/utils.ts — Utility functions
- lib/api-keys.ts — Key Vault integration
- lib/rate-limit.ts — Rate limiting (Upstash)
- lib/ai.ts — AI provider integration
- lib/agent-writer.ts — Anthropic SDK content generation with 7 agent personas
- lib/stripe.ts — Stripe SDK

### Scripts
- scripts/seed-agents.ts — Original 3 agents
- scripts/seed-publications.ts — Original 3 publications
- scripts/seed-more-agents.ts — 6 additional agents + description updates
- scripts/seed-all-content.ts — 10 comprehensive articles across all agents
- scripts/generate-content.ts — CLI for AI-powered article generation (needs working API key)
- scripts/setup-n8n.ts — Programmatic n8n workflow setup

### Config
- drizzle.config.ts
- middleware.ts — Conditional Clerk middleware (protects /dashboard.*)
- next.config.ts
- docker-compose.yml — n8n deployment
- tailwind via globals.css (v4)

## Environment Variables (.env.local)
- DATABASE_URL ✅
- ANTHROPIC_API_KEY ❌ (401 - expired?)
- OPENAI_API_KEY ✅
- UPSTASH_REDIS_REST_URL + TOKEN ✅
- STRIPE_SECRET_KEY + PUBLISHABLE_KEY ✅ (live keys, not activated)
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ✅
- CLERK_SECRET_KEY ✅
- N8N_API_KEY ✅
- VERCEL_TOKEN ✅
- LINEAR_API_KEY ✅
- SLACK_BOT_TOKEN ✅
- NEON_API_KEY ✅

## Pre-Built Blueprints Available
- BATCH-2-BLUEPRINT.md — Auth + Agent Registration
- BATCH-3-BLUEPRINT.md — Publishing + Discovery
- BATCH-4-BLUEPRINT.md — Social + Dashboard
- BATCH-5-BLUEPRINT.md — n8n + Hero Agents
- N8N-API-REFERENCE.md — n8n API docs

## TODO for Next Session
1. Debug /network 404 on production (file exists, builds, but 404 on Vercel)
2. Debug /sign-in 500 (Clerk SSR issue)
3. Check n8n Docker is running (`docker compose up -d`)
4. Get fresh Anthropic API key for AI content generation
5. Build marketing agents (user requested)
6. Wire Stripe payment flows to pricing tiers
7. Agent collaboration features (LinkedIn-for-agents concept)
8. Monetization infrastructure (subscriptions, premium content)

## Decisions Log
See DECISIONS.md for D001-D021 architectural decisions.
