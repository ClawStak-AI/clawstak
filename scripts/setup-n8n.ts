/**
 * ClawStak n8n Cloud Workflow Bootstrap
 * Run with: npx tsx scripts/setup-n8n.ts
 *
 * Migrated from localhost Docker to n8n Cloud.
 * Uses API key auth (X-N8N-API-KEY header) instead of Basic auth.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const N8N_BASE = process.env.N8N_BASE_URL || "https://clawstak.app.n8n.cloud";
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || N8N_BASE;

if (!N8N_API_KEY) {
  console.error("ERROR: N8N_API_KEY environment variable is required");
  process.exit(1);
}

async function n8nApi(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${N8N_BASE}/api/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": N8N_API_KEY!,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`n8n API error: ${res.status} ${text}`);
  }
  return res.json();
}

// ── Workflow Definitions ──

const workflows = [
  // 1. User Welcome & Onboarding
  {
    name: "1. User Welcome & Onboarding",
    nodes: [
      { parameters: { httpMethod: "POST", path: "user-created", responseMode: "onReceived" }, name: "User Created Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [250, 300] },
      { parameters: { fromEmail: "hello@clawstak.ai", toEmail: "={{ $json.body.user.email }}", subject: "Welcome to ClawStak.ai!", html: "=<h1>Welcome to ClawStak.ai!</h1><p>Hi {{ $json.body.user.name || 'there' }}, your account is ready.</p><p>Start exploring AI agents, discover publications, and connect with the agent ecosystem.</p>" }, name: "Welcome Email", type: "n8n-nodes-base.emailSend", typeVersion: 2.1, position: [500, 300] },
      { parameters: { amount: 24, unit: "hours" }, name: "Wait 24h", type: "n8n-nodes-base.wait", typeVersion: 1.1, position: [750, 300] },
      { parameters: { fromEmail: "hello@clawstak.ai", toEmail: "={{ $json.body.user.email }}", subject: "Get the most out of ClawStak.ai", html: "=<h1>Quick Start Guide</h1><p>Here are 3 things to try today:</p><ul><li>Browse the Intelligence Feed</li><li>Follow your first AI agent</li><li>Register your own agent</li></ul>" }, name: "Onboarding Email", type: "n8n-nodes-base.emailSend", typeVersion: 2.1, position: [1000, 300] },
    ],
    connections: { "User Created Webhook": { main: [[{ node: "Welcome Email", type: "main", index: 0 }]] }, "Welcome Email": { main: [[{ node: "Wait 24h", type: "main", index: 0 }]] }, "Wait 24h": { main: [[{ node: "Onboarding Email", type: "main", index: 0 }]] } },
    settings: { executionOrder: "v1" },
  },

  // 2. Agent Registration & Enrichment
  {
    name: "2. Agent Registration & Enrichment",
    nodes: [
      { parameters: { httpMethod: "POST", path: "agent-registered", responseMode: "onReceived" }, name: "Agent Registered", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [250, 300] },
      { parameters: { model: "gpt-4o-mini", messages: { values: [{ role: "system", content: "Generate a professional bio and methodology summary for an AI agent on ClawStak.ai. Return JSON: {\"bio\": \"...\", \"methodology\": \"...\"}" }, { role: "user", content: "=Agent: {{ $json.body.agent.name }}" }] }, options: { temperature: 0.7 } }, name: "AI Generate Profile", type: "@n8n/n8n-nodes-langchain.openAi", typeVersion: 1, position: [500, 300] },
      { parameters: { channel: "#clawstak-agents", text: "=New agent registered: {{ $json.body.agent.name }} ({{ $json.body.agent.slug }})" }, name: "Slack Alert", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [750, 300] },
    ],
    connections: { "Agent Registered": { main: [[{ node: "AI Generate Profile", type: "main", index: 0 }]] }, "AI Generate Profile": { main: [[{ node: "Slack Alert", type: "main", index: 0 }]] } },
    settings: { executionOrder: "v1" },
  },

  // 3. Content Publishing Pipeline
  {
    name: "3. Content Publishing Pipeline",
    nodes: [
      { parameters: { httpMethod: "POST", path: "publication-created", responseMode: "onReceived" }, name: "Publication Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [250, 300] },
      { parameters: { model: "gpt-4o-mini", messages: { values: [{ role: "system", content: "You are a content moderator. Analyze for: spam, harmful content, quality. Return JSON: {\"approved\": true/false, \"reason\": \"...\", \"quality_score\": 0-100}" }, { role: "user", content: "=Title: {{ $json.body.publication.title }}\nContent: {{ $json.body.publication.contentMd?.substring(0, 2000) || '' }}" }] }, options: { temperature: 0.1 } }, name: "AI Moderation", type: "@n8n/n8n-nodes-langchain.openAi", typeVersion: 1, position: [500, 300] },
      { parameters: { model: "gpt-4o-mini", messages: { values: [{ role: "system", content: "Generate SEO metadata. Return JSON: {\"metaTitle\": \"...\", \"metaDescription\": \"...\", \"keywords\": [...]}" }, { role: "user", content: "=Title: {{ $json.body.publication.title }}" }] } }, name: "AI SEO", type: "@n8n/n8n-nodes-langchain.openAi", typeVersion: 1, position: [750, 300] },
      { parameters: { channel: "#clawstak-content", text: "=New publication: {{ $json.body.publication.title }} by {{ $json.body.publication.agentName || 'unknown' }}" }, name: "Slack Alert", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [1000, 300] },
    ],
    connections: { "Publication Webhook": { main: [[{ node: "AI Moderation", type: "main", index: 0 }]] }, "AI Moderation": { main: [[{ node: "AI SEO", type: "main", index: 0 }]] }, "AI SEO": { main: [[{ node: "Slack Alert", type: "main", index: 0 }]] } },
    settings: { executionOrder: "v1" },
  },

  // 4. Weekly Analytics Digest
  {
    name: "4. Weekly Analytics Digest",
    nodes: [
      { parameters: { rule: { interval: [{ field: "weeks", triggerAtDay: 1, triggerAtHour: 9 }] } }, name: "Monday 9am", type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.2, position: [250, 300] },
      { parameters: { operation: "executeQuery", query: "SELECT (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days') as new_users, (SELECT count(*) FROM agents WHERE created_at > now() - interval '7 days') as new_agents, (SELECT count(*) FROM publications WHERE published_at > now() - interval '7 days') as new_publications, (SELECT count(*) FROM users) as total_users, (SELECT count(*) FROM agents) as total_agents, (SELECT count(*) FROM publications) as total_publications" }, name: "Query Neon", type: "n8n-nodes-base.postgres", typeVersion: 2.5, position: [500, 300] },
      { parameters: { model: "gpt-4o-mini", messages: { values: [{ role: "system", content: "Generate a brief weekly executive summary for ClawStak.ai. Be concise. Include emoji for visual appeal." }, { role: "user", content: "=This week's metrics:\n{{ JSON.stringify($json) }}" }] } }, name: "AI Summary", type: "@n8n/n8n-nodes-langchain.openAi", typeVersion: 1, position: [750, 300] },
      { parameters: { channel: "#clawstak-metrics", text: "={{ $json.message?.content || $json.text }}" }, name: "Post to Slack", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [1000, 300] },
      { parameters: { fromEmail: "analytics@clawstak.ai", toEmail: "founder@clawstak.ai", subject: "=ClawStak Weekly Digest — {{ new Date().toLocaleDateString() }}", html: "={{ $json.message?.content || $json.text }}" }, name: "Email Founder", type: "n8n-nodes-base.emailSend", typeVersion: 2.1, position: [1000, 500] },
    ],
    connections: { "Monday 9am": { main: [[{ node: "Query Neon", type: "main", index: 0 }]] }, "Query Neon": { main: [[{ node: "AI Summary", type: "main", index: 0 }]] }, "AI Summary": { main: [[{ node: "Post to Slack", type: "main", index: 0 }, { node: "Email Founder", type: "main", index: 0 }]] } },
    settings: { executionOrder: "v1" },
  },

  // 5. Daily Analytics Snapshot
  {
    name: "5. Daily Analytics Snapshot",
    nodes: [
      { parameters: { rule: { interval: [{ field: "days", triggerAtHour: 8 }] } }, name: "Daily 8am", type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.2, position: [250, 300] },
      { parameters: { operation: "executeQuery", query: "SELECT (SELECT count(*) FROM users WHERE created_at > now() - interval '1 day') as new_users_today, (SELECT count(*) FROM users WHERE created_at > now() - interval '2 days' AND created_at <= now() - interval '1 day') as new_users_yesterday, (SELECT count(*) FROM publications WHERE published_at > now() - interval '1 day') as new_pubs_today" }, name: "Query Metrics", type: "n8n-nodes-base.postgres", typeVersion: 2.5, position: [500, 300] },
      { parameters: { jsCode: `const data = $input.first().json;\nconst today = data.new_users_today || 0;\nconst yesterday = data.new_users_yesterday || 0;\nconst dropPct = yesterday > 0 ? ((yesterday - today) / yesterday) * 100 : 0;\nconst isAnomaly = dropPct > 50;\nreturn [{json: { ...data, dropPct: Math.round(dropPct), isAnomaly }}];` }, name: "Anomaly Check", type: "n8n-nodes-base.code", typeVersion: 2, position: [750, 300] },
      { parameters: { conditions: { conditions: [{ leftValue: "={{ $json.isAnomaly }}", rightValue: "true", operator: { type: "string", operation: "equals" } }] } }, name: "Is Anomaly?", type: "n8n-nodes-base.if", typeVersion: 2, position: [1000, 300] },
      { parameters: { channel: "#clawstak-alerts", text: "=ANOMALY: User signups dropped {{ $json.dropPct }}% vs yesterday!" }, name: "Alert Slack", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [1250, 200] },
    ],
    connections: { "Daily 8am": { main: [[{ node: "Query Metrics", type: "main", index: 0 }]] }, "Query Metrics": { main: [[{ node: "Anomaly Check", type: "main", index: 0 }]] }, "Anomaly Check": { main: [[{ node: "Is Anomaly?", type: "main", index: 0 }]] }, "Is Anomaly?": { main: [[{ node: "Alert Slack", type: "main", index: 0 }], []] } },
    settings: { executionOrder: "v1" },
  },

  // 6. Stripe Payment Processing
  {
    name: "6. Stripe Payment Processing",
    nodes: [
      { parameters: { httpMethod: "POST", path: "stripe-event", responseMode: "onReceived" }, name: "Stripe Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [250, 300] },
      { parameters: { rules: { rules: [{ outputIndex: 0, conditions: { conditions: [{ leftValue: "={{ $json.body.event.type }}", rightValue: "checkout.session.completed", operator: { type: "string", operation: "equals" } }] } }, { outputIndex: 1, conditions: { conditions: [{ leftValue: "={{ $json.body.event.type }}", rightValue: "customer.subscription.deleted", operator: { type: "string", operation: "equals" } }] } }, { outputIndex: 2 }] } }, name: "Route Event", type: "n8n-nodes-base.switch", typeVersion: 3, position: [500, 300] },
      { parameters: { channel: "#clawstak-revenue", text: "=New subscription! Event: {{ $json.body.event.type }}" }, name: "Notify Checkout", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [750, 200] },
      { parameters: { channel: "#clawstak-revenue", text: "=Subscription cancelled. Event: {{ $json.body.event.id }}" }, name: "Notify Cancel", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [750, 400] },
    ],
    connections: { "Stripe Webhook": { main: [[{ node: "Route Event", type: "main", index: 0 }]] }, "Route Event": { main: [[{ node: "Notify Checkout", type: "main", index: 0 }], [{ node: "Notify Cancel", type: "main", index: 0 }], []] } },
    settings: { executionOrder: "v1" },
  },

  // 7. Email Triage Bot
  {
    name: "7. Email Triage Bot",
    nodes: [
      { parameters: { pollTimes: { item: [{ mode: "everyMinute", minute: 5 }] }, filters: { readStatus: "unread" } }, name: "Check Outlook", type: "n8n-nodes-base.microsoftOutlookTrigger", typeVersion: 1, position: [250, 300] },
      { parameters: { model: "gpt-4o-mini", messages: { values: [{ role: "system", content: `You are an email triage assistant for a startup founder building ClawStak.ai. Classify with ONLY valid JSON: {"category":"URGENT"|"IMPORTANT"|"ROUTINE"|"NEWSLETTER"|"NOISE","reason":"one sentence","summary":"one sentence","needs_reply":true/false,"confidence":0.0-1.0}` }, { role: "user", content: "=From: {{ $json.from.emailAddress.name }} <{{ $json.from.emailAddress.address }}>\nSubject: {{ $json.subject }}\nBody:\n{{ $json.bodyPreview }}" }] }, options: { temperature: 0.1, maxTokens: 500 } }, name: "AI Classify", type: "@n8n/n8n-nodes-langchain.openAi", typeVersion: 1, position: [500, 300] },
      { parameters: { jsCode: `const input = $input.first().json;\nlet parsed;\ntry {\n  const text = input.message?.content || input.text || JSON.stringify(input);\n  const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);\n  parsed = JSON.parse(jsonMatch[0]);\n} catch(e) {\n  parsed = { category: 'IMPORTANT', reason: 'Parse failed', summary: 'Review manually', needs_reply: false, confidence: 0 };\n}\nconst email = $('Check Outlook').first().json;\nreturn [{json: { ...parsed, email_id: email.id, email_from: email.from?.emailAddress?.address, email_from_name: email.from?.emailAddress?.name, email_subject: email.subject, email_preview: email.bodyPreview?.substring(0,200) }}];` }, name: "Parse", type: "n8n-nodes-base.code", typeVersion: 2, position: [750, 300] },
      { parameters: { rules: { rules: [{ outputIndex: 0, conditions: { conditions: [{ leftValue: "={{ $json.category }}", rightValue: "URGENT", operator: { type: "string", operation: "equals" } }] } }, { outputIndex: 1, conditions: { conditions: [{ leftValue: "={{ $json.category }}", rightValue: "IMPORTANT", operator: { type: "string", operation: "equals" } }] } }, { outputIndex: 2 }] } }, name: "Route", type: "n8n-nodes-base.switch", typeVersion: 3, position: [1000, 300] },
      { parameters: { channel: "#urgent", text: "=URGENT: {{ $json.email_from_name }}\nSubject: {{ $json.email_subject }}\n{{ $json.summary }}" }, name: "Slack Urgent", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [1300, 100] },
      { parameters: { channel: "#daily-digest", text: "={{ $json.email_from_name }} - {{ $json.email_subject }}\n{{ $json.summary }}" }, name: "Slack Important", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [1300, 300] },
      { parameters: { messageId: "={{ $json.email_id }}", additionalFields: { isRead: true } }, name: "Auto-Read Rest", type: "n8n-nodes-base.microsoftOutlook", typeVersion: 1, position: [1300, 500] },
    ],
    connections: { "Check Outlook": { main: [[{ node: "AI Classify", type: "main", index: 0 }]] }, "AI Classify": { main: [[{ node: "Parse", type: "main", index: 0 }]] }, Parse: { main: [[{ node: "Route", type: "main", index: 0 }]] }, Route: { main: [[{ node: "Slack Urgent", type: "main", index: 0 }], [{ node: "Slack Important", type: "main", index: 0 }], [{ node: "Auto-Read Rest", type: "main", index: 0 }]] } },
    settings: { executionOrder: "v1" },
  },

  // 8. Build Pipeline (Linear)
  {
    name: "8. Build Pipeline (Linear)",
    nodes: [
      { parameters: { httpMethod: "POST", path: "linear-update", responseMode: "onReceived" }, name: "Linear Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [250, 300] },
      { parameters: { conditions: { conditions: [{ leftValue: "={{ $json.body?.data?.state?.name || '' }}", rightValue: "In Progress", operator: { type: "string", operation: "equals" } }] } }, name: "Only In Progress", type: "n8n-nodes-base.if", typeVersion: 2, position: [500, 300] },
      { parameters: { channel: "#clawstak-dev", text: "=Agent picking up: {{ $json.body.data.identifier }} - {{ $json.body.data.title }}" }, name: "Notify Start", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [750, 200] },
    ],
    connections: { "Linear Webhook": { main: [[{ node: "Only In Progress", type: "main", index: 0 }]] }, "Only In Progress": { main: [[{ node: "Notify Start", type: "main", index: 0 }], []] } },
    settings: { executionOrder: "v1" },
  },

  // 9. Global Error Handler
  {
    name: "9. Global Error Handler",
    nodes: [
      { parameters: {}, name: "Error Trigger", type: "n8n-nodes-base.errorTrigger", typeVersion: 1, position: [250, 300] },
      { parameters: { channel: "#clawstak-errors", text: "=Workflow Failed: {{ $json.workflow.name }}\nError: {{ $json.execution.error.message }}\nExecution: {{ $json.execution.id }}" }, name: "Alert Slack", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [500, 300] },
      { parameters: { jsCode: `const error = $input.first().json;\nconst isCritical = ['Stripe', 'User Welcome', 'Agent Registration'].some(w => error.workflow?.name?.includes(w));\nreturn [{json: { ...error, isCritical }}];` }, name: "Check Critical", type: "n8n-nodes-base.code", typeVersion: 2, position: [500, 500] },
      { parameters: { conditions: { conditions: [{ leftValue: "={{ $json.isCritical }}", rightValue: "true", operator: { type: "string", operation: "equals" } }] } }, name: "Is Critical?", type: "n8n-nodes-base.if", typeVersion: 2, position: [750, 500] },
      { parameters: { fromEmail: "alerts@clawstak.ai", toEmail: "founder@clawstak.ai", subject: "=CRITICAL: Workflow {{ $json.workflow.name }} failed", html: "=<h2>Critical Workflow Failure</h2><p>{{ $json.execution.error.message }}</p>" }, name: "Email Founder", type: "n8n-nodes-base.emailSend", typeVersion: 2.1, position: [1000, 400] },
    ],
    connections: { "Error Trigger": { main: [[{ node: "Alert Slack", type: "main", index: 0 }, { node: "Check Critical", type: "main", index: 0 }]] }, "Check Critical": { main: [[{ node: "Is Critical?", type: "main", index: 0 }]] }, "Is Critical?": { main: [[{ node: "Email Founder", type: "main", index: 0 }], []] } },
    settings: { executionOrder: "v1" },
  },

  // 10. Agent Collaboration Notifications
  {
    name: "10. Agent Collaboration Notifications",
    nodes: [
      { parameters: { httpMethod: "POST", path: "collaboration-event", responseMode: "onReceived" }, name: "Collab Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [250, 300] },
      { parameters: { operation: "executeQuery", query: "=UPDATE agents SET updated_at = now() WHERE id = '{{ $json.body.requestingAgentId }}' OR id = '{{ $json.body.providingAgentId }}'" }, name: "Update Metrics", type: "n8n-nodes-base.postgres", typeVersion: 2.5, position: [500, 300] },
      { parameters: { channel: "#clawstak-agents", text: "=Collaboration event: {{ $json.body.status }} between agents" }, name: "Slack Alert", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [750, 300] },
    ],
    connections: { "Collab Webhook": { main: [[{ node: "Update Metrics", type: "main", index: 0 }]] }, "Update Metrics": { main: [[{ node: "Slack Alert", type: "main", index: 0 }]] } },
    settings: { executionOrder: "v1" },
  },

  // 11. Content Recommendation Engine
  {
    name: "11. Content Recommendation Engine",
    nodes: [
      { parameters: { rule: { interval: [{ field: "days", triggerAtHour: 2 }] } }, name: "Daily 2am", type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.2, position: [250, 300] },
      { parameters: { operation: "executeQuery", query: "INSERT INTO feed_recommendations (publication_id, score, reason, is_trending, computed_at) SELECT p.id, (p.view_count * 0.3 + p.like_count * 0.5 + CASE WHEN p.published_at > now() - interval '3 days' THEN 20 ELSE 0 END) as score, 'auto-scored', (p.view_count * 0.3 + p.like_count * 0.5) > 50 as is_trending, now() FROM publications p WHERE p.visibility = 'public' AND p.published_at IS NOT NULL ON CONFLICT DO NOTHING" }, name: "Score Publications", type: "n8n-nodes-base.postgres", typeVersion: 2.5, position: [500, 300] },
    ],
    connections: { "Daily 2am": { main: [[{ node: "Score Publications", type: "main", index: 0 }]] } },
    settings: { executionOrder: "v1" },
  },

  // 12. Milestone Alerts
  {
    name: "12. Milestone Alerts",
    nodes: [
      { parameters: { rule: { interval: [{ field: "hours", hoursInterval: 6 }] } }, name: "Every 6h", type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.2, position: [250, 300] },
      { parameters: { operation: "executeQuery", query: "SELECT a.id, a.name, a.follower_count, a.slug FROM agents a WHERE a.follower_count IN (10, 50, 100, 500, 1000) AND NOT EXISTS (SELECT 1 FROM milestones m WHERE m.entity_id = a.id AND m.value = a.follower_count)" }, name: "Check Milestones", type: "n8n-nodes-base.postgres", typeVersion: 2.5, position: [500, 300] },
      { parameters: { channel: "#clawstak-milestones", text: "=Milestone: {{ $json.name }} reached {{ $json.follower_count }} followers!" }, name: "Slack Celebrate", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [750, 300] },
      { parameters: { operation: "executeQuery", query: "=INSERT INTO milestones (entity_type, entity_id, milestone, value, notified_at) VALUES ('agent', '{{ $json.id }}', 'followers', {{ $json.follower_count }}, now())" }, name: "Record Milestone", type: "n8n-nodes-base.postgres", typeVersion: 2.5, position: [1000, 300] },
    ],
    connections: { "Every 6h": { main: [[{ node: "Check Milestones", type: "main", index: 0 }]] }, "Check Milestones": { main: [[{ node: "Slack Celebrate", type: "main", index: 0 }]] }, "Slack Celebrate": { main: [[{ node: "Record Milestone", type: "main", index: 0 }]] } },
    settings: { executionOrder: "v1" },
  },

  // 13. Uptime & Health Monitoring
  {
    name: "13. Uptime & Health Monitoring",
    nodes: [
      { parameters: { rule: { interval: [{ field: "minutes", minutesInterval: 5 }] } }, name: "Every 5min", type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.2, position: [250, 300] },
      { parameters: { url: "https://clawstak.ai", options: { timeout: 10000 } }, name: "Check Homepage", type: "n8n-nodes-base.httpRequest", typeVersion: 4.2, position: [500, 200] },
      { parameters: { url: "https://clawstak.ai/api/health", options: { timeout: 10000 } }, name: "Check API", type: "n8n-nodes-base.httpRequest", typeVersion: 4.2, position: [500, 400] },
      { parameters: { jsCode: `const homepage = $('Check Homepage').first();\nconst api = $('Check API').first();\nconst issues = [];\nif (!homepage || homepage.json?.statusCode >= 400) issues.push('Homepage down');\nif (!api || api.json?.statusCode >= 400) issues.push('API down');\nreturn [{json: { healthy: issues.length === 0, issues }}];` }, name: "Evaluate", type: "n8n-nodes-base.code", typeVersion: 2, position: [750, 300] },
      { parameters: { conditions: { conditions: [{ leftValue: "={{ $json.healthy }}", rightValue: "false", operator: { type: "string", operation: "equals" } }] } }, name: "Is Down?", type: "n8n-nodes-base.if", typeVersion: 2, position: [1000, 300] },
      { parameters: { channel: "#clawstak-alerts", text: "=DOWNTIME ALERT: {{ $json.issues.join(', ') }}" }, name: "Alert Slack", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [1250, 200] },
    ],
    connections: { "Every 5min": { main: [[{ node: "Check Homepage", type: "main", index: 0 }, { node: "Check API", type: "main", index: 0 }]] }, "Check Homepage": { main: [[{ node: "Evaluate", type: "main", index: 0 }]] }, "Check API": { main: [[{ node: "Evaluate", type: "main", index: 0 }]] }, Evaluate: { main: [[{ node: "Is Down?", type: "main", index: 0 }]] }, "Is Down?": { main: [[{ node: "Alert Slack", type: "main", index: 0 }], []] } },
    settings: { executionOrder: "v1" },
  },

  // 14. Agent Profile Enrichment
  {
    name: "14. Agent Profile Enrichment",
    nodes: [
      { parameters: { rule: { interval: [{ field: "weeks", triggerAtDay: 0, triggerAtHour: 3 }] } }, name: "Sunday 3am", type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.2, position: [250, 300] },
      { parameters: { operation: "executeQuery", query: "SELECT a.id, a.name, a.slug, ap.bio, ap.specialization FROM agents a LEFT JOIN agent_profiles ap ON ap.agent_id = a.id WHERE ap.bio IS NULL OR length(ap.bio) < 50 LIMIT 10" }, name: "Find Incomplete", type: "n8n-nodes-base.postgres", typeVersion: 2.5, position: [500, 300] },
      { parameters: { model: "gpt-4o-mini", messages: { values: [{ role: "system", content: "Improve the agent profile. Return JSON: {\"bio\": \"2-3 sentences\", \"specialization\": \"one line\"}" }, { role: "user", content: "=Agent: {{ $json.name }}, Current bio: {{ $json.bio || 'none' }}" }] } }, name: "AI Enrich", type: "@n8n/n8n-nodes-langchain.openAi", typeVersion: 1, position: [750, 300] },
    ],
    connections: { "Sunday 3am": { main: [[{ node: "Find Incomplete", type: "main", index: 0 }]] }, "Find Incomplete": { main: [[{ node: "AI Enrich", type: "main", index: 0 }]] } },
    settings: { executionOrder: "v1" },
  },

  // 15. PostHog Analytics Sync
  {
    name: "15. PostHog Analytics Sync",
    nodes: [
      { parameters: { rule: { interval: [{ field: "days", triggerAtHour: 0 }] } }, name: "Daily Midnight", type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.2, position: [250, 300] },
      { parameters: { url: "=https://app.posthog.com/api/projects/@current/insights/trend/?events=[{\"id\":\"$pageview\"}]&date_from=-1d", method: "GET", authentication: "genericCredentialType", genericAuthType: "httpHeaderAuth" }, name: "Fetch PostHog", type: "n8n-nodes-base.httpRequest", typeVersion: 4.2, position: [500, 300] },
      { parameters: { jsCode: `const data = $input.first().json;\nconst dau = data?.result?.[0]?.count || 0;\nreturn [{json: { period: 'daily', dau, mau: 0, computed_at: new Date().toISOString() }}];` }, name: "Aggregate", type: "n8n-nodes-base.code", typeVersion: 2, position: [750, 300] },
      { parameters: { operation: "executeQuery", query: "=INSERT INTO platform_metrics (period, period_start, dau, mau, created_at) VALUES ('daily', now()::date, {{ $json.dau }}, {{ $json.mau }}, now())" }, name: "Store Metrics", type: "n8n-nodes-base.postgres", typeVersion: 2.5, position: [1000, 300] },
    ],
    connections: { "Daily Midnight": { main: [[{ node: "Fetch PostHog", type: "main", index: 0 }]] }, "Fetch PostHog": { main: [[{ node: "Aggregate", type: "main", index: 0 }]] }, Aggregate: { main: [[{ node: "Store Metrics", type: "main", index: 0 }]] } },
    settings: { executionOrder: "v1" },
  },

  // ═══════════════════════════════════════════════════════════════
  // SLACK → NOTION SYNC WORKFLOWS (D022)
  // ═══════════════════════════════════════════════════════════════

  // 16. Slack Message Logger → Notion
  {
    name: "16. Slack Message Logger → Notion",
    nodes: [
      { parameters: { httpMethod: "POST", path: "slack-message-log", responseMode: "onReceived" }, name: "Slack Event Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [250, 300] },
      { parameters: { jsCode: `const event = $input.first().json.body?.event || $input.first().json;\nconst text = event.text || '';\nlet type = 'STATUS';\nif (text.includes('TASK:') || text.includes('TODO:')) type = 'TASK';\nelse if (text.includes('BLOCKER:') || text.includes('BLOCKED:')) type = 'BLOCKER';\nelse if (text.includes('COMPLETE:') || text.includes('DONE:')) type = 'COMPLETE';\nelse if (text.includes('DECISION:')) type = 'DECISION';\nelse if (text.includes('IDEA:')) type = 'IDEA';\nelse if (text.includes('A2A:')) type = 'A2A';\nreturn [{json: { type, text, user: event.user, channel: event.channel, ts: event.ts, timestamp: new Date().toISOString() }}];` }, name: "Parse Message Type", type: "n8n-nodes-base.code", typeVersion: 2, position: [500, 300] },
      { parameters: { resource: "databasePage", databaseId: "={{ $env.NOTION_PROJECT_LOG_DB }}", title: "={{ $json.type }}: {{ $json.text.substring(0, 100) }}", propertiesUi: { propertyValues: [{ key: "Type", type: "select", selectValue: "={{ $json.type }}" }, { key: "Content", type: "richText", textContent: "={{ $json.text }}" }, { key: "Source", type: "select", selectValue: "Slack" }, { key: "Timestamp", type: "date", date: "={{ $json.timestamp }}" }, { key: "Status", type: "select", selectValue: "={{ $json.type === 'TASK' ? 'Open' : 'Logged' }}" }] } }, name: "Create Notion Entry", type: "n8n-nodes-base.notion", typeVersion: 2.2, position: [750, 300] },
    ],
    connections: { "Slack Event Webhook": { main: [[{ node: "Parse Message Type", type: "main", index: 0 }]] }, "Parse Message Type": { main: [[{ node: "Create Notion Entry", type: "main", index: 0 }]] } },
    settings: { executionOrder: "v1" },
  },

  // 17. Slack Task Tracker → Notion Tasks
  {
    name: "17. Slack Task Tracker → Notion",
    nodes: [
      { parameters: { httpMethod: "POST", path: "slack-task-tracker", responseMode: "onReceived" }, name: "Task Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [250, 300] },
      { parameters: { jsCode: `const event = $input.first().json.body?.event || $input.first().json;\nconst text = event.text || '';\nconst taskMatch = text.match(/(?:TASK:|TODO:)\\s*(.+)/i);\nif (!taskMatch) return [];\nconst taskDescription = taskMatch[1].trim();\nconst priorityMatch = text.match(/P[0-3]|HIGH|MEDIUM|LOW/i);\nconst priority = priorityMatch ? priorityMatch[0].toUpperCase() : 'MEDIUM';\nconst assigneeMatch = text.match(/@(\\w+)/g);\nconst assignees = assigneeMatch ? assigneeMatch.map(a => a.replace('@', '')) : [];\nreturn [{json: { task: taskDescription, priority, assignees: assignees.join(', '), user: event.user, channel: event.channel, ts: event.ts, timestamp: new Date().toISOString() }}];` }, name: "Parse Task", type: "n8n-nodes-base.code", typeVersion: 2, position: [500, 300] },
      { parameters: { resource: "databasePage", databaseId: "={{ $env.NOTION_TASKS_DB }}", title: "={{ $json.task }}", propertiesUi: { propertyValues: [{ key: "Status", type: "select", selectValue: "Open" }, { key: "Priority", type: "select", selectValue: "={{ $json.priority }}" }, { key: "Assignees", type: "richText", textContent: "={{ $json.assignees }}" }, { key: "Source", type: "select", selectValue: "Slack" }, { key: "Created", type: "date", date: "={{ $json.timestamp }}" }] } }, name: "Create Notion Task", type: "n8n-nodes-base.notion", typeVersion: 2.2, position: [750, 300] },
      { parameters: { channel: "={{ $json.channel }}", text: "=Task logged to Notion: {{ $json.task }}" }, name: "Confirm in Slack", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [1000, 300] },
    ],
    connections: { "Task Webhook": { main: [[{ node: "Parse Task", type: "main", index: 0 }]] }, "Parse Task": { main: [[{ node: "Create Notion Task", type: "main", index: 0 }]] }, "Create Notion Task": { main: [[{ node: "Confirm in Slack", type: "main", index: 0 }]] } },
    settings: { executionOrder: "v1" },
  },

  // 18. Slack Blocker Alert → Notion + Founder Alert
  {
    name: "18. Slack Blocker Alert → Notion",
    nodes: [
      { parameters: { httpMethod: "POST", path: "slack-blocker-alert", responseMode: "onReceived" }, name: "Blocker Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [250, 300] },
      { parameters: { jsCode: `const event = $input.first().json.body?.event || $input.first().json;\nconst text = event.text || '';\nconst blockerMatch = text.match(/(?:BLOCKER:|BLOCKED:)\\s*(.+)/i);\nif (!blockerMatch) return [];\nconst description = blockerMatch[1].trim();\nconst featureMatch = text.match(/\\[([^\\]]+)\\]/); // e.g., [Auth], [n8n]\nconst feature = featureMatch ? featureMatch[1] : 'General';\nreturn [{json: { blocker: description, feature, user: event.user, channel: event.channel, ts: event.ts, timestamp: new Date().toISOString() }}];` }, name: "Parse Blocker", type: "n8n-nodes-base.code", typeVersion: 2, position: [500, 300] },
      { parameters: { resource: "databasePage", databaseId: "={{ $env.NOTION_BLOCKERS_DB }}", title: "=BLOCKER: {{ $json.blocker.substring(0, 100) }}", propertiesUi: { propertyValues: [{ key: "Status", type: "select", selectValue: "Active" }, { key: "Feature", type: "select", selectValue: "={{ $json.feature }}" }, { key: "Description", type: "richText", textContent: "={{ $json.blocker }}" }, { key: "Reported", type: "date", date: "={{ $json.timestamp }}" }, { key: "Priority", type: "select", selectValue: "High" }] } }, name: "Create Notion Blocker", type: "n8n-nodes-base.notion", typeVersion: 2.2, position: [750, 300] },
      { parameters: { channel: "#clawstak-alerts", text: "=BLOCKER reported: {{ $json.blocker }}\nFeature: {{ $json.feature }}\nReported by: <@{{ $json.user }}>" }, name: "Alert Founder", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [1000, 200] },
      { parameters: { fromEmail: "alerts@clawstak.ai", toEmail: "founder@clawstak.ai", subject: "=BLOCKER: {{ $json.feature }} - {{ $json.blocker.substring(0, 50) }}", html: "=<h2>Blocker Reported</h2><p><strong>Feature:</strong> {{ $json.feature }}</p><p><strong>Description:</strong> {{ $json.blocker }}</p><p><strong>Reported:</strong> {{ $json.timestamp }}</p>" }, name: "Email Founder", type: "n8n-nodes-base.emailSend", typeVersion: 2.1, position: [1000, 400] },
    ],
    connections: { "Blocker Webhook": { main: [[{ node: "Parse Blocker", type: "main", index: 0 }]] }, "Parse Blocker": { main: [[{ node: "Create Notion Blocker", type: "main", index: 0 }]] }, "Create Notion Blocker": { main: [[{ node: "Alert Founder", type: "main", index: 0 }, { node: "Email Founder", type: "main", index: 0 }]] } },
    settings: { executionOrder: "v1" },
  },

  // 19. Slack Completion Logger → Update Notion
  {
    name: "19. Slack Completion Logger → Notion",
    nodes: [
      { parameters: { httpMethod: "POST", path: "slack-completion-log", responseMode: "onReceived" }, name: "Completion Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [250, 300] },
      { parameters: { jsCode: `const event = $input.first().json.body?.event || $input.first().json;\nconst text = event.text || '';\nconst completeMatch = text.match(/(?:COMPLETE:|DONE:)\\s*(.+)/i);\nif (!completeMatch) return [];\nconst description = completeMatch[1].trim();\nreturn [{json: { completion: description, user: event.user, channel: event.channel, ts: event.ts, timestamp: new Date().toISOString() }}];` }, name: "Parse Completion", type: "n8n-nodes-base.code", typeVersion: 2, position: [500, 300] },
      { parameters: { resource: "databasePage", databaseId: "={{ $env.NOTION_CHANGELOG_DB }}", title: "=DONE: {{ $json.completion.substring(0, 100) }}", propertiesUi: { propertyValues: [{ key: "Type", type: "select", selectValue: "Completion" }, { key: "Description", type: "richText", textContent: "={{ $json.completion }}" }, { key: "Completed By", type: "richText", textContent: "={{ $json.user }}" }, { key: "Completed At", type: "date", date: "={{ $json.timestamp }}" }] } }, name: "Log to Changelog", type: "n8n-nodes-base.notion", typeVersion: 2.2, position: [750, 300] },
      { parameters: { channel: "#clawstak-wins", text: "={{ $json.completion }}" }, name: "Celebrate in Slack", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [1000, 300] },
    ],
    connections: { "Completion Webhook": { main: [[{ node: "Parse Completion", type: "main", index: 0 }]] }, "Parse Completion": { main: [[{ node: "Log to Changelog", type: "main", index: 0 }]] }, "Log to Changelog": { main: [[{ node: "Celebrate in Slack", type: "main", index: 0 }]] } },
    settings: { executionOrder: "v1" },
  },

  // 20. A2A Conversation Tracker → Notion Summary
  {
    name: "20. A2A Conversation Tracker → Notion",
    nodes: [
      { parameters: { httpMethod: "POST", path: "slack-a2a-tracker", responseMode: "onReceived" }, name: "A2A Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [250, 300] },
      { parameters: { jsCode: `const event = $input.first().json.body?.event || $input.first().json;\nconst text = event.text || '';\nconst threadTs = event.thread_ts || event.ts;\nconst channel = event.channel;\nconst isA2A = text.includes('A2A:') || (event.bot_id && event.thread_ts);\nif (!isA2A) return [];\nreturn [{json: { text, threadTs, channel, user: event.user || event.bot_id, isBot: !!event.bot_id, timestamp: new Date().toISOString() }}];` }, name: "Parse A2A Message", type: "n8n-nodes-base.code", typeVersion: 2, position: [500, 300] },
      { parameters: { model: "gpt-4o-mini", messages: { values: [{ role: "system", content: "Summarize this agent-to-agent conversation. Extract: key decisions, action items, insights. Return JSON: {\"summary\": \"2-3 sentences\", \"decisions\": [\"...\"], \"actions\": [\"...\"], \"participants\": [\"...\"]}" }, { role: "user", content: "=A2A Message: {{ $json.text }}" }] }, options: { temperature: 0.3 } }, name: "AI Summarize", type: "@n8n/n8n-nodes-langchain.openAi", typeVersion: 1, position: [750, 300] },
      { parameters: { resource: "databasePage", databaseId: "={{ $env.NOTION_A2A_DB }}", title: "=A2A: {{ $json.timestamp }}", propertiesUi: { propertyValues: [{ key: "Thread ID", type: "richText", textContent: "={{ $('Parse A2A Message').first().json.threadTs }}" }, { key: "Channel", type: "richText", textContent: "={{ $('Parse A2A Message').first().json.channel }}" }, { key: "Summary", type: "richText", textContent: "={{ $json.message?.content || $json.text }}" }, { key: "Timestamp", type: "date", date: "={{ $('Parse A2A Message').first().json.timestamp }}" }] } }, name: "Log to Notion", type: "n8n-nodes-base.notion", typeVersion: 2.2, position: [1000, 300] },
    ],
    connections: { "A2A Webhook": { main: [[{ node: "Parse A2A Message", type: "main", index: 0 }]] }, "Parse A2A Message": { main: [[{ node: "AI Summarize", type: "main", index: 0 }]] }, "AI Summarize": { main: [[{ node: "Log to Notion", type: "main", index: 0 }]] } },
    settings: { executionOrder: "v1" },
  },
];

// ── Main ──

async function main() {
  console.log("Setting up n8n cloud workflows for ClawStak...\n");
  console.log(`  Target: ${N8N_BASE}`);
  console.log(`  Webhook URL: ${N8N_WEBHOOK_URL}\n`);

  let created = 0;
  let failed = 0;

  for (const wf of workflows) {
    try {
      const result = await n8nApi("/workflows", "POST", wf);
      console.log(`  [OK] Created: ${wf.name} (ID: ${result.id})`);

      try {
        await n8nApi(`/workflows/${result.id}/activate`, "POST");
        console.log(`       Activated: ${wf.name}`);
      } catch (activateErr: any) {
        console.log(`       Warning: Could not activate ${wf.name} — ${activateErr.message}`);
      }

      created++;
    } catch (e: any) {
      console.log(`  [FAIL] ${wf.name} — ${e.message}`);
      failed++;
    }
  }

  console.log(`\nn8n setup complete! Created: ${created}, Failed: ${failed}`);
  console.log("\nWebhook URLs:");
  console.log(`  User Created:     ${N8N_WEBHOOK_URL}/webhook/user-created`);
  console.log(`  Agent Registered: ${N8N_WEBHOOK_URL}/webhook/agent-registered`);
  console.log(`  Publication:      ${N8N_WEBHOOK_URL}/webhook/publication-created`);
  console.log(`  Stripe:           ${N8N_WEBHOOK_URL}/webhook/stripe-event`);
  console.log(`  Linear:           ${N8N_WEBHOOK_URL}/webhook/linear-update`);
  console.log(`  Collaboration:    ${N8N_WEBHOOK_URL}/webhook/collaboration-event`);
  console.log("\n  === Slack → Notion Sync ===");
  console.log(`  Slack Message Log:   ${N8N_WEBHOOK_URL}/webhook/slack-message-log`);
  console.log(`  Slack Task Tracker:  ${N8N_WEBHOOK_URL}/webhook/slack-task-tracker`);
  console.log(`  Slack Blocker Alert: ${N8N_WEBHOOK_URL}/webhook/slack-blocker-alert`);
  console.log(`  Slack Completion:    ${N8N_WEBHOOK_URL}/webhook/slack-completion-log`);
  console.log(`  Slack A2A Tracker:   ${N8N_WEBHOOK_URL}/webhook/slack-a2a-tracker`);
}

main().catch(console.error);
