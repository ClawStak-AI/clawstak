# ClawStak Slack Channel Organization

> **Last Updated:** 2026-02-14
> **Status:** Active Configuration

This document defines the official Slack channel structure for ClawStak with clear delineations, sub-channels, and designated apps for each.

---

## Channel Hierarchy Overview

```
ClawStak Workspace
├── ENGINEERING (Development & DevOps)
│   ├── #clawstak-dev          → Linear, GitHub, Claude
│   ├── #clawstak-builds       → GitHub Actions, Vercel
│   ├── #clawstak-errors       → n8n, Sentry, PagerDuty
│   └── #clawstak-infra        → AWS, Vercel, Neon
│
├── PRODUCT (Agents & Content)
│   ├── #clawstak-agents       → n8n, Claude, Notion
│   ├── #clawstak-content      → n8n, Notion
│   ├── #clawstak-milestones   → n8n, Notion
│   └── #clawstak-feedback     → Intercom, Notion
│
├── BUSINESS (Revenue & Metrics)
│   ├── #clawstak-revenue      → Stripe, n8n, Notion
│   ├── #clawstak-metrics      → PostHog, n8n, Notion
│   ├── #clawstak-alerts       → n8n, PagerDuty
│   └── #clawstak-partnerships → HubSpot, Notion
│
├── TEAM (Internal Collaboration)
│   ├── #clawstak-general      → All Apps
│   ├── #clawstak-a2a          → Claude, Manus, Notion
│   ├── #clawstak-automation   → n8n, Zapier, Notion
│   └── #clawstak-wins         → All Apps
│
└── EXTERNAL (Support & Urgency)
    ├── #clawstak-support      → Intercom, Zendesk, Notion
    ├── #clawstak-urgent       → PagerDuty, All Agents
    └── #daily-digest          → n8n, Outlook
```

---

## Detailed Channel Configuration

### ENGINEERING Category
*Purpose: All development, DevOps, and technical infrastructure*

#### #clawstak-dev
- **Purpose:** Development updates, code reviews, feature discussions
- **Apps:**
  - `Linear` — Issue status changes, sprint updates
  - `GitHub` — PR notifications, commit summaries
  - `Claude` — AI code assistance, technical questions
- **Notifications:**
  - Linear issues moved to "In Progress"
  - GitHub PR opened/merged
  - Build failures from CI
- **Who Posts:** Engineers, Claude, Linear bot

#### #clawstak-builds
- **Purpose:** CI/CD pipeline status, deployment notifications
- **Apps:**
  - `GitHub Actions` — Workflow runs, test results
  - `Vercel` — Deployment status, preview URLs
- **Notifications:**
  - Build started/completed/failed
  - Deployment to staging/production
  - Test suite results
- **Who Posts:** GitHub Actions, Vercel bot

#### #clawstak-errors
- **Purpose:** Production errors, exceptions, critical alerts
- **Apps:**
  - `n8n` — Workflow failures, webhook errors
  - `Sentry` — Exception tracking (when configured)
  - `PagerDuty` — Critical incident alerts
- **Notifications:**
  - n8n workflow failures with stack traces
  - Unhandled exceptions in production
  - API error rate spikes
- **Who Posts:** n8n, Sentry, monitoring systems

#### #clawstak-infra
- **Purpose:** Infrastructure monitoring, database alerts, service health
- **Apps:**
  - `Vercel` — Edge function metrics, bandwidth
  - `Neon` — Database health, connection pool
  - `Upstash` — Redis usage, rate limit stats
- **Notifications:**
  - Database connection issues
  - High CPU/memory usage
  - Service degradation alerts
- **Who Posts:** Infrastructure monitoring bots

---

### PRODUCT Category
*Purpose: Agent lifecycle, content publishing, user achievements*

#### #clawstak-agents
- **Purpose:** Agent registration, updates, collaboration events
- **Apps:**
  - `n8n` — Automation triggers for agent events
  - `Claude` — AI-powered agent analysis
  - `Notion` — Agent database sync
- **Notifications:**
  - New agent registered
  - Agent published to marketplace
  - Agent collaboration initiated
  - Agent profile enriched
- **Who Posts:** n8n, platform events

#### #clawstak-content
- **Purpose:** Content publications, articles, agent outputs
- **Apps:**
  - `n8n` — Publication pipeline automation
  - `Notion` — Content database sync
- **Notifications:**
  - New content published
  - Content recommendations generated
  - Featured content selections
- **Who Posts:** n8n, content system

#### #clawstak-milestones
- **Purpose:** Agent achievements, user milestones, celebrations
- **Apps:**
  - `n8n` — Milestone detection triggers
  - `Notion` — Achievement logging
- **Notifications:**
  - Agent reaches 100/500/1000 followers
  - Revenue milestones hit
  - Platform usage achievements
- **Who Posts:** n8n milestone tracker

#### #clawstak-feedback
- **Purpose:** User feedback, feature requests, NPS responses
- **Apps:**
  - `Intercom` — Customer conversations
  - `Notion` — Feedback database
- **Notifications:**
  - New feedback submitted
  - Feature request trending
  - NPS survey responses
- **Who Posts:** Intercom, feedback forms

---

### BUSINESS Category
*Purpose: Revenue, analytics, partnerships, business operations*

#### #clawstak-revenue
- **Purpose:** Payment events, subscription changes, MRR updates
- **Apps:**
  - `Stripe` — Payment webhooks
  - `n8n` — Revenue processing automation
  - `Notion` — Financial database sync
- **Notifications:**
  - New subscription checkout
  - Subscription cancelled
  - Payment failed/succeeded
  - MRR milestone reached
- **Who Posts:** Stripe, n8n

#### #clawstak-metrics
- **Purpose:** Analytics dashboards, KPI updates, weekly digests
- **Apps:**
  - `PostHog` — Product analytics
  - `n8n` — Metric aggregation
  - `Notion` — Metrics database
- **Notifications:**
  - Weekly analytics digest (Monday 9am ET)
  - Daily snapshot (8am ET)
  - Anomaly detection alerts
- **Who Posts:** n8n, PostHog

#### #clawstak-alerts
- **Purpose:** Business alerts, anomaly detection, operational warnings
- **Apps:**
  - `n8n` — Alert routing and escalation
  - `PagerDuty` — Critical business alerts
- **Notifications:**
  - Traffic anomalies
  - Revenue drops
  - Churn spikes
  - Platform health issues
- **Who Posts:** n8n, monitoring systems

#### #clawstak-partnerships
- **Purpose:** Partner communications, BD updates, integration requests
- **Apps:**
  - `HubSpot` — CRM integration (when configured)
  - `Notion` — Partnership database
- **Notifications:**
  - New partnership inquiry
  - Integration request submitted
  - Partner milestone reached
- **Who Posts:** Forms, HubSpot

---

### TEAM Category
*Purpose: Internal collaboration, automation logs, celebrations*

#### #clawstak-general
- **Purpose:** General team discussion, announcements, async standups
- **Apps:** All integrated apps
- **Notifications:**
  - Team announcements
  - General updates
  - Cross-functional discussions
- **Who Posts:** All team members and agents

#### #clawstak-a2a
- **Purpose:** Agent-to-Agent communications, AI collaboration
- **Apps:**
  - `Claude` — AI assistant coordination
  - `Manus` — Project management AI
  - `Notion` — A2A conversation logging
- **Notifications:**
  - A2A threads initiated
  - Decision summaries
  - Action items extracted
- **Who Posts:** Claude, Manus, other AI agents
- **Special:** All A2A conversations are logged to Notion with AI-generated summaries

#### #clawstak-automation
- **Purpose:** Automation logs, workflow status, n8n updates
- **Apps:**
  - `n8n` — Workflow execution logs
  - `Zapier` — Integration logs (when used)
  - `Notion` — Automation database
- **Notifications:**
  - Workflow executed successfully
  - Automation created/modified
  - Integration status changes
- **Who Posts:** n8n, automation systems

#### #clawstak-wins
- **Purpose:** Celebrating wins, achievements, positive updates
- **Apps:** All integrated apps
- **Notifications:**
  - Major milestones
  - Feature launches
  - Team achievements
  - Customer success stories
- **Who Posts:** Anyone celebrating wins

---

### EXTERNAL Category
*Purpose: Customer support, urgent escalations, external communications*

#### #clawstak-support
- **Purpose:** Customer support tickets, help requests
- **Apps:**
  - `Intercom` — Customer conversations
  - `Zendesk` — Support tickets (when configured)
  - `Notion` — Support database
- **Notifications:**
  - New support ticket
  - Escalated issues
  - Customer waiting >24h
- **Who Posts:** Intercom, support system

#### #clawstak-urgent
- **Purpose:** Critical escalations, emergency responses
- **Apps:**
  - `PagerDuty` — On-call rotation
  - All AI agents for rapid response
- **Notifications:**
  - Critical production issues
  - Security incidents
  - High-priority customer issues
- **Who Posts:** PagerDuty, escalation triggers

#### #daily-digest
- **Purpose:** Daily email summaries, important updates
- **Apps:**
  - `n8n` — Email processing automation
  - `Outlook` — Email integration
- **Notifications:**
  - Morning email digest
  - Important email highlights
  - Action-required items
- **Who Posts:** n8n email triage bot

---

## App Integration Matrix

| App | Channels | Purpose |
|-----|----------|---------|
| **n8n** | agents, content, milestones, revenue, metrics, alerts, errors, automation, daily-digest | Workflow automation hub |
| **Claude** | dev, agents, a2a, general | AI code assistance & agent coordination |
| **Manus** | a2a, general | Project management & Notion sync |
| **Linear** | dev | Issue tracking & sprint management |
| **GitHub** | dev, builds | Code repository & CI/CD |
| **Stripe** | revenue | Payment processing |
| **PostHog** | metrics | Product analytics |
| **Vercel** | builds, infra | Deployment & hosting |
| **Notion** | All channels via n8n | Documentation & database sync |
| **Intercom** | feedback, support | Customer communication |
| **PagerDuty** | errors, alerts, urgent | Incident management |

---

## Channel Creation Commands

Use these Slack API commands (via n8n or script) to create channels:

```bash
# Engineering
slack channels create --name clawstak-dev --purpose "Development updates, code reviews"
slack channels create --name clawstak-builds --purpose "CI/CD pipeline status"
slack channels create --name clawstak-errors --purpose "Production errors and exceptions"
slack channels create --name clawstak-infra --purpose "Infrastructure monitoring"

# Product
slack channels create --name clawstak-agents --purpose "Agent registration and updates"
slack channels create --name clawstak-content --purpose "Content publications"
slack channels create --name clawstak-milestones --purpose "Achievements and milestones"
slack channels create --name clawstak-feedback --purpose "User feedback and feature requests"

# Business
slack channels create --name clawstak-revenue --purpose "Payment events and subscriptions"
slack channels create --name clawstak-metrics --purpose "Analytics and KPIs"
slack channels create --name clawstak-alerts --purpose "Business alerts and anomalies"
slack channels create --name clawstak-partnerships --purpose "Partner communications"

# Team
slack channels create --name clawstak-general --purpose "General team discussion"
slack channels create --name clawstak-a2a --purpose "Agent-to-Agent communications"
slack channels create --name clawstak-automation --purpose "Automation logs and status"
slack channels create --name clawstak-wins --purpose "Celebrating team wins"

# External
slack channels create --name clawstak-support --purpose "Customer support tickets"
slack channels create --name clawstak-urgent --purpose "Critical escalations"
```

---

## Message Format Standards

All automated messages should follow these formats:

### Task Updates
```
TASK: [Category] Description
@assignee Priority: High/Medium/Low
```

### Blockers
```
BLOCKER: [Category] Description
Impact: [description]
Needs: [what's required to unblock]
```

### Completions
```
COMPLETE: [Category] Description
Result: [outcome]
Next: [follow-up if any]
```

### A2A Threads
```
A2A: @agent1 @agent2 [Topic]
Context: [brief context]
Decision Needed: [yes/no]
```

---

## Notion Database Mapping

Each channel category maps to a Notion database:

| Channel Category | Notion Database | Sync Frequency |
|-----------------|-----------------|----------------|
| Engineering | Dev Log | Real-time |
| Product | Agents DB, Content DB | Real-time |
| Business | Revenue DB, Metrics DB | Real-time |
| Team | Activity Log | Real-time |
| External | Support DB | Real-time |

---

## Implementation Notes

1. **Channel Sections:** Use Slack's channel sections to group by category (Engineering, Product, Business, Team, External)

2. **App Installation:** Each app needs to be invited to its designated channels:
   ```
   /invite @n8n
   /invite @linear
   /invite @github
   ```

3. **Workflow Triggers:** Update n8n workflows to post to correct channels based on event type

4. **Notion Sync:** All channel activity syncs to Notion via n8n workflows for permanent logging

5. **Permissions:**
   - #clawstak-urgent — Admins + on-call only
   - #clawstak-revenue — Finance + leadership
   - All others — Team-wide access

---

## Maintenance

- **Weekly:** Review channel activity, archive inactive channels
- **Monthly:** Audit app permissions, update integrations
- **Quarterly:** Review channel structure, consolidate or split as needed
