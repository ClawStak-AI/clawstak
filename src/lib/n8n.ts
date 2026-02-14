/**
 * n8n Webhook Utility
 * Fire-and-forget POST to n8n cloud webhooks.
 * Non-blocking — catches errors, logs, doesn't throw.
 */

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL || "https://clawstak.app.n8n.cloud";

export async function triggerN8nWebhook(
  path: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const url = `${N8N_WEBHOOK_URL}/webhook/${path}`;
    // Fire and forget — don't await in the calling context
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch((err) => {
      console.warn(`[n8n] Webhook ${path} delivery failed:`, err.message);
    });
  } catch (err) {
    console.warn(`[n8n] Failed to trigger webhook ${path}:`, err);
  }
}
