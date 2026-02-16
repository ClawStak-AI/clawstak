# ClawStak.ai — Live Build State (Compaction Recovery File)

**PURPOSE**: This file is the agent's memory. Update it after every major step.
If your context gets compacted, READ THIS FILE FIRST to know exactly where you are.

## Current Status
- **Active Phase**: LAUNCH NIGHT — Feb 15, 2026 8PM EST target
- **Last Completed Steps**:
  - Fixed /sign-in 500 (added force-dynamic to sign-in + sign-up pages)
  - Fixed /sign-up 500 (same fix)
  - Rebranded: light blue #38BDF8 primary, navy #1E293B secondary, lighter stone bg #F8FAFC
  - Updated all hardcoded color refs across 7 component files
  - Created logo set (5 SVG variants in public/logos/)
  - Normalized trust scores (3 agents fixed to 0-100 scale)
  - Built successfully, pushed to main, Vercel deploying
  - Wrote V3 Business Plan, Marketing Plan, Deployment Strategy
  - Wrote Substack A2A/A2M/A2H framework article
  - Wrote 2 VEED.io video scripts (launch + explainer)
- **Next Step**: Get fresh API keys (CRITICAL BLOCKER), configure OpenClaw loop, n8n Twitter workflow
- **Blocking Issues**:
  - Anthropic API key returns 401 (EXPIRED) — blocks agent content generation
  - OpenAI API key returns 401 (EXPIRED)
  - Stripe secret key invalid — blocks payment processing
  - OpenRouter API key ✅ WORKS — can be used as fallback provider
  - OPENCLAW_GATEWAY_TOKEN not available locally — can't control Railway loop remotely

## Deployment
- **Live URL**: https://clawstak.ai
- **Vercel Project**: claw-marketplace on alpha-loop-cap team (Pro plan)
- **GitHub**: ClawStak-AI/clawstak (auto-deploy on push to main)
- **Latest Commit**: 5b14d45 "Fix trust score normalization"
- **OpenClaw Railway**: https://openclaw-gateway-production-3642.up.railway.app
  - Health: OK, 11 agents registered, loop stopped (hit 50 iteration max)
  - Provider: anthropic (needs valid key OR switch to openrouter)

## Database State
- **Neon Project**: solitary-sea-05315978, database: clawstak
- **Tables**: 20+ tables pushed via Drizzle (users, agents, agent_profiles, publications, api_keys, waitlist, subscriptions, collaborations, publication_likes, comments, follows, bookmarks, agent_metrics, trust_score_history, agent_skills, agent_sessions, feed_recommendations, platform_metrics, milestones, moderation_flags, topics, topic_briefings, notifications)
- **9 Agents**: Portfolio Sentinel (92), SEC Filing Analyzer (89), Market Sentiment Scanner (87), Macro Economics Oracle, DeFi Protocol Auditor, Earnings Call Decoder, Quant Strategy Lab, AI Infrastructure Monitor, Regulatory Radar
- **13 Publications**: 3 original + 10 seeded
- **Trust scores**: All normalized to 0-100 scale ✅

## Brand (Updated Feb 15, 2026)
- **Primary**: Light Blue #38BDF8 (sky-400) — CTAs, hero accents, primary marks
- **Secondary**: Navy #1E293B (slate-800) — text, headings, grounding
- **Background**: Stone #F8FAFC (slate-50) — lighter, modern fintech feel
- **Accent**: Cyan #06B6D4 — highlights
- **Vibe**: Modern fintech startup (Linear/Vercel aesthetic), NOT institutional bank
- **Logo**: 5 SVG variants in public/logos/ (full-color, icon, dark-bg, mono, favicon)

## OpenClaw Agent Fleet
- **Railway Gateway**: openclaw-gateway-production-3642
- **Registered Agents**: coordinator, researcher, coder, reviewer, scout, healer, planner, deployer, comms, hailey, sloane
- **Provider**: anthropic (needs switching to openrouter if key expired)
- **OpenRouter Key**: ✅ WORKS (sk-or-v1-...)
- **Loop Status**: Stopped at iteration 50 (needs max_iterations increase and restart)

## n8n Automation
- **Cloud URL**: https://clawstak.app.n8n.cloud
- **API Key**: ✅ Set in openclaw .env
- **Status**: NEEDS VERIFICATION — check workflows are active

## Content Created (Feb 15, 2026)
- docs/substack/a2a-a2m-a2h-framework.md — Substack article (221 lines)
- docs/video-scripts/launch-video-script.md — 60-90s launch video script
- docs/video-scripts/explainer-script.md — 2-3 min explainer script
- docs/plans/CLAWSTAK-BUSINESS-PLAN-V3-FINAL.md — V3 Business Plan (933 lines)
- docs/plans/CLAWSTAK-MARKETING-PLAN-V3.md — V3 Marketing Plan (808 lines)
- docs/plans/CLAWSTAK-DEPLOYMENT-STRATEGY-V3.md — V3 Deployment Strategy (1159 lines)
- docs/plans/2026-02-15-clawstak-launch-battle-plan.md — Launch night battle plan

## Environment Variables (.env.local)
- DATABASE_URL ✅
- ANTHROPIC_API_KEY ❌ (401 - EXPIRED - refresh from console.anthropic.com)
- OPENAI_API_KEY ❌ (401 - EXPIRED - refresh from platform.openai.com)
- UPSTASH_REDIS_REST_URL + TOKEN ✅
- STRIPE_SECRET_KEY ❌ (invalid - refresh from dashboard.stripe.com)
- STRIPE_PUBLISHABLE_KEY ✅
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ✅
- CLERK_SECRET_KEY ✅
- N8N_API_KEY ✅
- VERCEL_TOKEN ✅
- LINEAR_API_KEY ✅
- SLACK_BOT_TOKEN ✅
- NEON_API_KEY ✅

## OpenClaw .env (openclaw-railway/.env)
- OPENROUTER_API_KEY ✅ (VERIFIED WORKING)
- ANTHROPIC_API_KEY ❌ (likely expired)
- OPENAI_API_KEY ❌ (likely expired)
- GOOGLE_GEMINI_API_KEY ✅ (not verified)
- N8N_API_KEY ✅
- SLACK_BOT_TOKEN ✅
- LINEAR_API_KEY ✅
- VERCEL_API_TOKEN ✅
- NEON_API_KEY ✅

## Hostinger SSH
- Host: hostinger-openclaw / tom@openclaw-hostinger
- Password: PennState2718@
- Passphrase: TJH2718

## TODO for Current Session
1. ❌ GET FRESH API KEYS (Anthropic, OpenAI, Stripe) — CRITICAL BLOCKER
2. ❌ Get OPENCLAW_GATEWAY_TOKEN from Railway dashboard
3. ❌ Switch OpenClaw provider to openrouter if Anthropic key can't be refreshed
4. ❌ Restart OpenClaw loop with increased max_iterations (500)
5. ❌ Verify n8n Cloud workflows are active
6. ❌ Configure n8n Twitter posting workflow
7. ❌ Submit launch goals to OpenClaw agent loop
8. ❌ Pre-launch checklist
9. ❌ Launch announcement

## Decisions Log
See DECISIONS.md for D001-D021 architectural decisions.
