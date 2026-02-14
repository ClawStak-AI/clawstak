/**
 * ClawStak Slack Channel Setup Script
 * Run with: npx tsx scripts/setup-slack-channels.ts
 *
 * Creates the organized channel structure for ClawStak with proper
 * delineations and app assignments.
 *
 * Requires: SLACK_BOT_TOKEN environment variable
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

if (!SLACK_BOT_TOKEN) {
  console.error("ERROR: SLACK_BOT_TOKEN environment variable is required");
  console.error("Get it from: https://api.slack.com/apps -> Your App -> OAuth & Permissions");
  process.exit(1);
}

// ── Channel Configuration ──

interface ChannelConfig {
  name: string;
  purpose: string;
  topic: string;
  category: "engineering" | "product" | "business" | "team" | "external";
  apps: string[];
  isPrivate?: boolean;
}

const CHANNELS: ChannelConfig[] = [
  // ═══════════════════════════════════════
  // ENGINEERING Category
  // ═══════════════════════════════════════
  {
    name: "clawstak-dev",
    purpose: "Development updates, code reviews, feature discussions",
    topic: "Engineering | Apps: Linear, GitHub, Claude",
    category: "engineering",
    apps: ["Linear", "GitHub", "Claude"],
  },
  {
    name: "clawstak-builds",
    purpose: "CI/CD pipeline status, deployment notifications",
    topic: "Engineering | Apps: GitHub Actions, Vercel",
    category: "engineering",
    apps: ["GitHub Actions", "Vercel"],
  },
  {
    name: "clawstak-errors",
    purpose: "Production errors, exceptions, critical alerts",
    topic: "Engineering | Apps: n8n, Sentry, PagerDuty",
    category: "engineering",
    apps: ["n8n", "Sentry", "PagerDuty"],
  },
  {
    name: "clawstak-infra",
    purpose: "Infrastructure monitoring, database alerts, service health",
    topic: "Engineering | Apps: Vercel, Neon, Upstash",
    category: "engineering",
    apps: ["Vercel", "Neon", "Upstash"],
  },

  // ═══════════════════════════════════════
  // PRODUCT Category
  // ═══════════════════════════════════════
  {
    name: "clawstak-agents",
    purpose: "Agent registration, updates, collaboration events",
    topic: "Product | Apps: n8n, Claude, Notion",
    category: "product",
    apps: ["n8n", "Claude", "Notion"],
  },
  {
    name: "clawstak-content",
    purpose: "Content publications, articles, agent outputs",
    topic: "Product | Apps: n8n, Notion",
    category: "product",
    apps: ["n8n", "Notion"],
  },
  {
    name: "clawstak-milestones",
    purpose: "Agent achievements, user milestones, celebrations",
    topic: "Product | Apps: n8n, Notion",
    category: "product",
    apps: ["n8n", "Notion"],
  },
  {
    name: "clawstak-feedback",
    purpose: "User feedback, feature requests, NPS responses",
    topic: "Product | Apps: Intercom, Notion",
    category: "product",
    apps: ["Intercom", "Notion"],
  },

  // ═══════════════════════════════════════
  // BUSINESS Category
  // ═══════════════════════════════════════
  {
    name: "clawstak-revenue",
    purpose: "Payment events, subscription changes, MRR updates",
    topic: "Business | Apps: Stripe, n8n, Notion",
    category: "business",
    apps: ["Stripe", "n8n", "Notion"],
    isPrivate: true,
  },
  {
    name: "clawstak-metrics",
    purpose: "Analytics dashboards, KPI updates, weekly digests",
    topic: "Business | Apps: PostHog, n8n, Notion",
    category: "business",
    apps: ["PostHog", "n8n", "Notion"],
  },
  {
    name: "clawstak-alerts",
    purpose: "Business alerts, anomaly detection, operational warnings",
    topic: "Business | Apps: n8n, PagerDuty",
    category: "business",
    apps: ["n8n", "PagerDuty"],
  },
  {
    name: "clawstak-partnerships",
    purpose: "Partner communications, BD updates, integration requests",
    topic: "Business | Apps: HubSpot, Notion",
    category: "business",
    apps: ["HubSpot", "Notion"],
  },

  // ═══════════════════════════════════════
  // TEAM Category
  // ═══════════════════════════════════════
  {
    name: "clawstak-general",
    purpose: "General team discussion, announcements, async standups",
    topic: "Team | All Apps Welcome",
    category: "team",
    apps: ["All"],
  },
  {
    name: "clawstak-a2a",
    purpose: "Agent-to-Agent communications, AI collaboration",
    topic: "Team | Apps: Claude, Manus, Notion | All A2A convos logged to Notion",
    category: "team",
    apps: ["Claude", "Manus", "Notion"],
  },
  {
    name: "clawstak-automation",
    purpose: "Automation logs, workflow status, n8n updates",
    topic: "Team | Apps: n8n, Zapier, Notion",
    category: "team",
    apps: ["n8n", "Zapier", "Notion"],
  },
  {
    name: "clawstak-wins",
    purpose: "Celebrating wins, achievements, positive updates",
    topic: "Team | Celebrate! All Apps Welcome",
    category: "team",
    apps: ["All"],
  },

  // ═══════════════════════════════════════
  // EXTERNAL Category
  // ═══════════════════════════════════════
  {
    name: "clawstak-support",
    purpose: "Customer support tickets, help requests",
    topic: "External | Apps: Intercom, Zendesk, Notion",
    category: "external",
    apps: ["Intercom", "Zendesk", "Notion"],
  },
  {
    name: "clawstak-urgent",
    purpose: "Critical escalations, emergency responses",
    topic: "External | Apps: PagerDuty, All AI Agents | High Priority Only",
    category: "external",
    apps: ["PagerDuty", "Claude", "Manus"],
    isPrivate: true,
  },
  {
    name: "daily-digest",
    purpose: "Daily email summaries, important updates",
    topic: "External | Apps: n8n, Outlook",
    category: "external",
    apps: ["n8n", "Outlook"],
  },
];

// ── Slack API Functions ──

async function slackApi(
  method: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; channel?: { id: string; name: string }; error?: string }> {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return data;
}

async function createChannel(channel: ChannelConfig): Promise<{ success: boolean; id?: string; error?: string }> {
  // Use conversations.create for both public and private channels
  const result = await slackApi("conversations.create", {
    name: channel.name,
    is_private: channel.isPrivate || false,
  });

  if (!result.ok) {
    // Channel might already exist
    if (result.error === "name_taken") {
      // Try to find the existing channel
      const listResult = await slackApi("conversations.list", {
        types: channel.isPrivate ? "private_channel" : "public_channel",
        limit: 1000,
      });

      if (listResult.ok && Array.isArray((listResult as any).channels)) {
        const existing = (listResult as any).channels.find(
          (c: { name: string }) => c.name === channel.name
        );
        if (existing) {
          return { success: true, id: existing.id, error: "already_exists" };
        }
      }
    }
    return { success: false, error: result.error };
  }

  const channelId = result.channel?.id;
  if (!channelId) {
    return { success: false, error: "no_channel_id" };
  }

  // Set purpose
  await slackApi("conversations.setPurpose", {
    channel: channelId,
    purpose: channel.purpose,
  });

  // Set topic with app assignments
  await slackApi("conversations.setTopic", {
    channel: channelId,
    topic: channel.topic,
  });

  return { success: true, id: channelId };
}

// ── Channel Section Bookmarks ──

async function createBookmark(
  channelId: string,
  title: string,
  link: string
): Promise<boolean> {
  const result = await slackApi("bookmarks.add", {
    channel_id: channelId,
    title,
    type: "link",
    link,
  });
  return result.ok;
}

// ── Main ──

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║        ClawStak Slack Channel Setup                       ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  // Verify token works
  const authTest = await slackApi("auth.test", {});
  if (!authTest.ok) {
    console.error("ERROR: Invalid Slack token");
    console.error("Error:", (authTest as any).error);
    process.exit(1);
  }
  console.log(`Authenticated as: ${(authTest as any).user} in ${(authTest as any).team}\n`);

  const categories = ["engineering", "product", "business", "team", "external"];
  const results: { created: number; existing: number; failed: number } = {
    created: 0,
    existing: 0,
    failed: 0,
  };

  for (const category of categories) {
    console.log(`\n━━━ ${category.toUpperCase()} ━━━`);
    const categoryChannels = CHANNELS.filter((c) => c.category === category);

    for (const channel of categoryChannels) {
      process.stdout.write(`  #${channel.name}... `);

      const result = await createChannel(channel);

      if (result.success) {
        if (result.error === "already_exists") {
          console.log(`EXISTS (ID: ${result.id})`);
          results.existing++;
        } else {
          console.log(`CREATED (ID: ${result.id})`);
          results.created++;
        }

        // Add bookmarks for documentation
        if (result.id) {
          await createBookmark(
            result.id,
            "Channel Guide",
            "https://github.com/ClawStak-AI/clawstak/blob/main/SLACK-CHANNELS.md"
          );
        }
      } else {
        console.log(`FAILED: ${result.error}`);
        results.failed++;
      }
    }
  }

  console.log("\n╔═══════════════════════════════════════════════════════════╗");
  console.log("║                     SUMMARY                               ║");
  console.log("╠═══════════════════════════════════════════════════════════╣");
  console.log(`║  Created:  ${results.created.toString().padStart(3)}                                          ║`);
  console.log(`║  Existing: ${results.existing.toString().padStart(3)}                                          ║`);
  console.log(`║  Failed:   ${results.failed.toString().padStart(3)}                                          ║`);
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  console.log("Next Steps:");
  console.log("1. Invite apps to their designated channels:");
  console.log("   /invite @n8n @linear @github @stripe etc.");
  console.log("");
  console.log("2. Set up Slack channel sections in workspace settings:");
  console.log("   - Engineering (dev, builds, errors, infra)");
  console.log("   - Product (agents, content, milestones, feedback)");
  console.log("   - Business (revenue, metrics, alerts, partnerships)");
  console.log("   - Team (general, a2a, automation, wins)");
  console.log("   - External (support, urgent, daily-digest)");
  console.log("");
  console.log("3. Run n8n workflow setup: npx tsx scripts/setup-n8n.ts");
  console.log("");
  console.log("See SLACK-CHANNELS.md for complete documentation.");
}

main().catch(console.error);
