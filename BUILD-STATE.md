# ClawStak.ai — Live Build State (Compaction Recovery File)

**PURPOSE**: This file is the agent's memory. Update it after every major step.
If your context gets compacted, READ THIS FILE FIRST to know exactly where you are.

## Current Status
- **Active Batch**: 1 (Foundation + Landing)
- **Last Completed Step**: Project scaffold, shadcn/ui components, initial page structure
- **Next Step**: Verify build, fix any errors, polish landing page, complete Batch 1 gaps
- **Blocking Issues**: None (all services have graceful fallbacks)

## What Exists (verified files)
### UI Components (src/components/ui/)
button, card, input, label, badge, separator, dialog, dropdown-menu, sheet, tabs, textarea, avatar, tooltip, scroll-area

### Shared Components (src/components/shared/)
- logo.tsx
- financial-disclaimer.tsx

### Marketing Components (src/components/marketing/)
- hero.tsx
- waitlist-form.tsx
- agent-preview-card.tsx

### Pages
- (marketing)/page.tsx — Landing page
- (marketing)/layout.tsx
- (marketing)/agents/page.tsx — Agent browsing
- (marketing)/agents/[slug]/page.tsx — Agent detail
- (auth)/sign-in/[[...sign-in]]/page.tsx
- (auth)/sign-up/[[...sign-up]]/page.tsx
- (auth)/layout.tsx
- (platform)/dashboard/page.tsx
- (platform)/agents/new/page.tsx
- (platform)/agents/[id]/page.tsx
- (platform)/agents/[id]/publish/page.tsx
- (platform)/layout.tsx

### API Routes
- api/waitlist/route.ts
- api/agents/register/route.ts
- api/agents/[id]/route.ts
- api/agents/[id]/publish/route.ts
- api/feed/route.ts
- api/.well-known/agent.json/route.ts
- api/webhooks/clerk/route.ts

### Server Actions
- actions/waitlist.ts
- actions/agents.ts

### Libs
- lib/db/schema.ts — Full DB schema
- lib/db/index.ts — DB connection
- lib/db/migrate.ts — Migration runner
- lib/utils.ts — Utility functions
- lib/api-keys.ts — Key Vault integration
- lib/rate-limit.ts — Rate limiting (Upstash fallback)
- lib/ai.ts — AI provider integration

### Config
- drizzle.config.ts
- middleware.ts — Clerk auth middleware
- next.config.ts
- tailwind via globals.css (v4)

## Pre-Built Blueprints Available
When starting a new batch, READ THE BLUEPRINT FIRST:
- BATCH-2-BLUEPRINT.md — Auth + Agent Registration
- BATCH-3-BLUEPRINT.md — Publishing + Discovery
- BATCH-4-BLUEPRINT.md — Social + Dashboard
- BATCH-5-BLUEPRINT.md — n8n + Hero Agents
- N8N-API-REFERENCE.md — n8n API docs for Batch 5

## Decisions Log
See DECISIONS.md for architectural decisions made so far.

## Update Instructions
After completing a step, update this file:
1. Change "Active Batch" to current batch
2. Change "Last Completed Step" to what you just did
3. Change "Next Step" to what's coming
4. Add any new files to the "What Exists" section
5. Note any new blocking issues
