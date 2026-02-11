/**
 * ClawStak n8n Workflow Bootstrap
 * Run with: npx tsx scripts/setup-n8n.ts
 */

const N8N_URL = process.env.N8N_WEBHOOK_URL || "http://localhost:5678";
const N8N_AUTH = Buffer.from("clawstak:clawstak-n8n-2025").toString("base64");

async function n8nApi(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${N8N_URL}/api/v1${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${N8N_AUTH}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`n8n API error: ${res.status} ${text}`);
  }
  return res.json();
}

const emailTriageWorkflow = {
  name: "Email Triage Bot",
  nodes: [
    {
      parameters: {
        pollTimes: { item: [{ mode: "everyMinute", minute: 5 }] },
        filters: { readStatus: "unread" },
      },
      name: "Check Outlook",
      type: "n8n-nodes-base.microsoftOutlookTrigger",
      typeVersion: 1,
      position: [250, 300],
    },
    {
      parameters: {
        model: "gpt-4o-mini",
        messages: {
          values: [
            {
              role: "system",
              content: `You are an email triage assistant for a startup founder building ClawStak.ai. Classify with ONLY valid JSON: {"category":"URGENT"|"IMPORTANT"|"ROUTINE"|"NEWSLETTER"|"NOISE","reason":"one sentence","summary":"one sentence","needs_reply":true/false,"draft_reply":"reply or null","confidence":0.0-1.0}`,
            },
            {
              role: "user",
              content: "=From: {{ $json.from.emailAddress.name }} <{{ $json.from.emailAddress.address }}>\nSubject: {{ $json.subject }}\nBody:\n{{ $json.bodyPreview }}",
            },
          ],
        },
        options: { temperature: 0.1, maxTokens: 500 },
      },
      name: "AI Classify",
      type: "@n8n/n8n-nodes-langchain.openAi",
      typeVersion: 1,
      position: [500, 300],
    },
    {
      parameters: {
        jsCode: `const input = $input.first().json;
let parsed;
try {
  const text = input.message?.content || input.text || JSON.stringify(input);
  const jsonMatch = text.match(/\\{[\\s\\S]*\\}/);
  parsed = JSON.parse(jsonMatch[0]);
} catch(e) {
  parsed = { category: 'IMPORTANT', reason: 'Parse failed', summary: 'Review manually', needs_reply: false, draft_reply: null, confidence: 0 };
}
const email = $('Check Outlook').first().json;
return [{json: { ...parsed, email_id: email.id, email_from: email.from?.emailAddress?.address, email_from_name: email.from?.emailAddress?.name, email_subject: email.subject, email_preview: email.bodyPreview?.substring(0,200) }}];`,
      },
      name: "Parse",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [750, 300],
    },
    {
      parameters: {
        rules: {
          rules: [
            { outputIndex: 0, conditions: { conditions: [{ leftValue: "={{ $json.category }}", rightValue: "URGENT", operator: { type: "string", operation: "equals" } }] } },
            { outputIndex: 1, conditions: { conditions: [{ leftValue: "={{ $json.category }}", rightValue: "IMPORTANT", operator: { type: "string", operation: "equals" } }] } },
            { outputIndex: 2 },
          ],
        },
      },
      name: "Route",
      type: "n8n-nodes-base.switch",
      typeVersion: 3,
      position: [1000, 300],
    },
    {
      parameters: { channel: "#urgent", text: '=URGENT: {{ $json.email_from_name }}\nSubject: {{ $json.email_subject }}\n{{ $json.summary }}' },
      name: "Slack Urgent",
      type: "n8n-nodes-base.slack",
      typeVersion: 2.2,
      position: [1300, 100],
    },
    {
      parameters: { channel: "#daily-digest", text: "={{ $json.email_from_name }} - {{ $json.email_subject }}\n{{ $json.summary }}" },
      name: "Slack Important",
      type: "n8n-nodes-base.slack",
      typeVersion: 2.2,
      position: [1300, 300],
    },
    {
      parameters: { messageId: "={{ $json.email_id }}", additionalFields: { isRead: true } },
      name: "Auto-Read Rest",
      type: "n8n-nodes-base.microsoftOutlook",
      typeVersion: 1,
      position: [1300, 500],
    },
  ],
  connections: {
    "Check Outlook": { main: [[{ node: "AI Classify", type: "main", index: 0 }]] },
    "AI Classify": { main: [[{ node: "Parse", type: "main", index: 0 }]] },
    Parse: { main: [[{ node: "Route", type: "main", index: 0 }]] },
    Route: { main: [[{ node: "Slack Urgent", type: "main", index: 0 }], [{ node: "Slack Important", type: "main", index: 0 }], [{ node: "Auto-Read Rest", type: "main", index: 0 }]] },
  },
  settings: { executionOrder: "v1" },
};

const analyticsDigestWorkflow = {
  name: "Weekly Analytics Digest",
  nodes: [
    { parameters: { rule: { interval: [{ field: "weeks", triggerAtDay: 1, triggerAtHour: 9 }] } }, name: "Monday 9am", type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.2, position: [250, 300] },
    { parameters: { operation: "executeQuery", query: "SELECT (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days') as new_users, (SELECT count(*) FROM agents WHERE created_at > now() - interval '7 days') as new_agents, (SELECT count(*) FROM publications WHERE published_at > now() - interval '7 days') as new_publications, (SELECT count(*) FROM users) as total_users, (SELECT count(*) FROM agents) as total_agents" }, name: "Query Neon", type: "n8n-nodes-base.postgres", typeVersion: 2.5, position: [500, 300] },
    { parameters: { model: "gpt-4o-mini", messages: { values: [{ role: "system", content: "Generate a brief weekly executive summary for ClawStak.ai." }, { role: "user", content: "=This week's metrics:\n{{ JSON.stringify($json) }}" }] } }, name: "AI Summary", type: "@n8n/n8n-nodes-langchain.openAi", typeVersion: 1, position: [750, 300] },
    { parameters: { channel: "#clawstak-metrics", text: "={{ $json.message?.content || $json.text }}" }, name: "Post to Slack", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [1000, 300] },
  ],
  connections: { "Monday 9am": { main: [[{ node: "Query Neon", type: "main", index: 0 }]] }, "Query Neon": { main: [[{ node: "AI Summary", type: "main", index: 0 }]] }, "AI Summary": { main: [[{ node: "Post to Slack", type: "main", index: 0 }]] } },
};

const buildPipelineWorkflow = {
  name: "Build Pipeline",
  nodes: [
    { parameters: { httpMethod: "POST", path: "clawstak-build", responseMode: "onReceived" }, name: "Linear Webhook", type: "n8n-nodes-base.webhook", typeVersion: 1.1, position: [250, 300] },
    { parameters: { conditions: { conditions: [{ leftValue: "={{ $json.body?.data?.state?.name || '' }}", rightValue: "In Progress", operator: { type: "string", operation: "equals" } }] } }, name: "Only In Progress", type: "n8n-nodes-base.if", typeVersion: 2, position: [500, 300] },
    { parameters: { channel: "#clawstak-dev", text: "=Agent picking up: {{ $json.body.data.identifier }} - {{ $json.body.data.title }}" }, name: "Notify Start", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [750, 200] },
  ],
  connections: { "Linear Webhook": { main: [[{ node: "Only In Progress", type: "main", index: 0 }]] }, "Only In Progress": { main: [[{ node: "Notify Start", type: "main", index: 0 }], []] } },
};

const errorHandlerWorkflow = {
  name: "Global Error Handler",
  nodes: [
    { parameters: {}, name: "Error Trigger", type: "n8n-nodes-base.errorTrigger", typeVersion: 1, position: [250, 300] },
    { parameters: { channel: "#clawstak-errors", text: "=Workflow Failed: {{ $json.workflow.name }}\nError: {{ $json.execution.error.message }}" }, name: "Alert Slack", type: "n8n-nodes-base.slack", typeVersion: 2.2, position: [500, 300] },
  ],
  connections: { "Error Trigger": { main: [[{ node: "Alert Slack", type: "main", index: 0 }]] } },
};

async function main() {
  console.log("Setting up n8n workflows for ClawStak...\n");
  const workflows = [emailTriageWorkflow, analyticsDigestWorkflow, buildPipelineWorkflow, errorHandlerWorkflow];

  for (const wf of workflows) {
    try {
      const created = await n8nApi("/workflows", "POST", wf);
      console.log(`  Created: ${wf.name} (ID: ${created.id})`);
      await n8nApi(`/workflows/${created.id}/activate`, "POST");
      console.log(`  Activated: ${wf.name}`);
    } catch (e: any) {
      console.log(`  Failed: ${wf.name} - ${e.message}`);
    }
  }

  console.log("\nn8n setup complete!");
  console.log("Linear webhook URL: " + N8N_URL + "/webhook/clawstak-build");
}

main().catch(console.error);
