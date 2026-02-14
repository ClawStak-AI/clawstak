# ClawStak.ai — Autonomous Build Instructions

## Operating Mode: FULLY AUTONOMOUS
The founder is AFK. Do NOT stop to ask questions. Make decisions and keep building.
- If something is ambiguous, make the best architectural choice and document it in DECISIONS.md
- If a dependency is missing, install it
- If a build fails, debug it and fix it
- If context gets long, use Task tool sub-agents to offload research, exploration, and parallel work
- If you hit a genuine blocker (missing API keys etc), skip that feature with a graceful fallback and move to the next task
- NEVER stop working to wait for human input

## Sub-Agent Strategy
Use the Task tool aggressively to stay within context limits:
- **Explore agents** for codebase research before making changes
- **Bash agents** for running builds, tests, and Docker commands
- **General-purpose agents** for multi-step implementation tasks
- When implementing a batch, spawn sub-agents for independent files/features in parallel
- After each major feature, run a build check via sub-agent before moving on

## Git: Commit and Push After Each Batch
After completing each batch (clean build verified):
1. `git add -A`
2. `git commit -m "Batch N: <summary>"` with Co-Authored-By trailer
3. `git push origin main`
Do this automatically. The founder wants the code pushed to the repo.

## Self-Debugging Loop
After writing code, always:
1. Run `pnpm build` (or `pnpm dev` smoke test) to check for errors
2. If build fails, read the error, fix it, rebuild
3. Repeat until clean build
4. If stuck after 3 attempts on the same error, try an alternative approach
5. Log any workarounds in DECISIONS.md

## Compaction Recovery Protocol
**CRITICAL: After any context compaction, IMMEDIATELY read these files in order:**
1. `BUILD-STATE.md` — Where you are, what's done, what's next
2. `CLAUDE.md` (this file) — Operating instructions
3. `DECISIONS.md` — Architectural decisions made so far
4. The relevant `BATCH-{N}-BLUEPRINT.md` for whatever batch you're working on

## Pre-Built Blueprints (READ BEFORE STARTING EACH BATCH)
Scout agents have pre-researched the codebase and created step-by-step implementation plans:
- `BATCH-2-BLUEPRINT.md` — Auth + Agent Registration (exact files, components, API logic)
- `BATCH-3-BLUEPRINT.md` — Publishing + Discovery (marketplace, Stripe, search)
- `BATCH-4-BLUEPRINT.md` — Social + Dashboard (feed, profiles, analytics)
- `BATCH-5-BLUEPRINT.md` — n8n + Hero Agents (workflow integration, webhooks)
- `N8N-API-REFERENCE.md` — n8n REST API docs with TypeScript examples

**When starting a new batch**: Read the blueprint FIRST, then execute step-by-step. Don't re-research what the scouts already figured out.

## Build State Tracking
After every major step (file created, feature complete, build verified):
- Update `BUILD-STATE.md` with current status
- This is your memory across compactions — keep it accurate

## Context Management
- Keep the main conversation focused on orchestration and decision-making
- Offload heavy file reading/writing to sub-agents via Task tool
- After completing each batch, summarize what was done and update Build Progress below
- If context is getting large, prefer spawning Task agents over inline work
- Use Task tool sub-agents for: file exploration, build verification, parallel feature implementation

## Genuine Blockers (Founder Action Required)

### 1. Clerk Application Not Created
- Need: `clerk-publishable-key` and `clerk-secret-key` in Azure Key Vault
- Action: Create Clerk app at https://clerk.com, store keys in Key Vault
- Impact: Auth pages will render but won't function until keys are set
- **Workaround: Build auth UI with Clerk components, they'll activate once keys exist**

### 2. ~~Neon Connection String~~ RESOLVED
- Neon DB connected via Vercel store "neon-alc-VC"
- DATABASE_URL is now set in .env.local
- Schema push should be done: `npx drizzle-kit push`

### 3. ~~Upstash Redis~~ RESOLVED
- Upstash Redis connected via Vercel store "upstash-alpha-loop-cap"
- UPSTASH_REDIS_REST_URL and TOKEN are now set in .env.local

### 4. Resend Account Not Created
- Need: `resend-api-key` in Azure Key Vault
- Impact: Waitlist confirmation emails won't send (entries still saved)

### 5. PostHog Project Not Created
- Need: `posthog-key` in Azure Key Vault
- Impact: Analytics tracking disabled (no-op wrapper in place)

## Available Secrets (Pulled from Key Vault)
- Anthropic API Key
- OpenAI API Key
- Stripe Keys (live)
- n8n API Key
- n8n Server URL (MCP)
- n8n Access Token (MCP)
- Linear API Key
- Vercel Token
- Slack Bot Token
- Neon API Key (management)

## Tech Stack
- Next.js 16 + React 19 + TypeScript
- Tailwind CSS v4 (CSS-based config in globals.css)
- shadcn/ui components (already initialized)
- Drizzle ORM + Neon Postgres (pgvector)
- Clerk auth
- Stripe payments
- pnpm package manager

## Build Progress
- [x] Project scaffold
- [x] shadcn/ui components (button, card, input, label, badge, separator, dialog, dropdown-menu, sheet, tabs, textarea, avatar, tooltip, scroll-area)
- [x] DB schema + Drizzle config
- [x] Auth pages (sign-in, sign-up) + middleware
- [x] Marketing layout + landing page + hero + waitlist form
- [x] Platform layout + dashboard + agent pages (new, detail, publish)
- [x] API routes (waitlist, agents CRUD, feed, webhooks, .well-known)
- [x] Shared components (logo, financial-disclaimer, agent-preview-card)
- [x] Utility libs (api-keys, rate-limit, ai, db, stripe, env)
- [x] Stripe SDK installed + webhook route (/api/webhooks/stripe)
- [x] Neon DB connected (DATABASE_URL set)
- [x] Upstash Redis connected (rate limiting live)
- [ ] Batch 1: Foundation + Landing (IN PROGRESS — verify build, polish, complete gaps)
- [ ] Batch 2: Auth + Agent Registration
- [ ] Batch 3: Publishing + Discovery
- [ ] Batch 4: Social + Dashboard
- [ ] Batch 5: n8n + Hero Agents

## Build Verification Commands
```bash
pnpm build          # Full production build check
pnpm dev            # Dev server smoke test
pnpm lint           # ESLint check
```

## Architecture Notes
- Route groups: (marketing), (auth), (platform)
- All external service calls have graceful fallbacks for missing env vars
- Decisions logged in DECISIONS.md
