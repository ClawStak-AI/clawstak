/**
 * n8n Cloud Client
 * Full async execution pipeline with webhook secret verification,
 * graceful fallback when env vars are missing, and singleton pattern.
 */

import { timingSafeEqual, createHmac } from "node:crypto";

export interface TriggerWorkflowParams {
  webhookPath: string;
  payload: Record<string, unknown>;
  timeout?: number;
}

export interface TriggerWorkflowResult {
  success: boolean;
  n8nExecutionId?: string;
  data?: unknown;
  error?: string;
}

export interface N8nExecutionStatus {
  id: number;
  finished: boolean;
  status: "canceled" | "crashed" | "error" | "new" | "running" | "success" | "unknown" | "waiting";
  startedAt: string;
  stoppedAt: string | null;
  data?: Record<string, unknown>;
}

class N8nClient {
  private baseUrl: string;
  private apiKey: string;
  private webhookUrl: string;
  private webhookSecret: string;
  private configured: boolean;

  constructor() {
    this.baseUrl = process.env.N8N_BASE_URL || "";
    this.apiKey = process.env.N8N_API_KEY || "";
    this.webhookUrl = process.env.N8N_WEBHOOK_URL || (this.baseUrl ? `${this.baseUrl}/webhook` : "");
    this.webhookSecret = process.env.N8N_WEBHOOK_SECRET || "";
    this.configured = !!(this.baseUrl && this.apiKey);

    if (!this.configured) {
      console.warn("[ClawStak n8n] N8N_BASE_URL or N8N_API_KEY not configured. n8n operations will fail gracefully.");
    }
  }

  get isConfigured(): boolean {
    return this.configured;
  }

  private get apiHeaders(): Record<string, string> {
    return {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-N8N-API-KEY": this.apiKey,
    };
  }

  /** Trigger workflow via webhook */
  async triggerWorkflow({ webhookPath, payload, timeout = 30000 }: TriggerWorkflowParams): Promise<TriggerWorkflowResult> {
    if (!this.configured) {
      return { success: false, error: "n8n is not configured" };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.webhookSecret) {
        headers["X-ClawStak-Key"] = this.webhookSecret;
      }

      const res = await fetch(`${this.webhookUrl}/${webhookPath}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        return { success: false, error: `n8n webhook ${res.status}: ${errorText}` };
      }

      const data = await res.json();
      return {
        success: true,
        n8nExecutionId: data?.executionId || data?.id,
        data,
      };
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return { success: false, error: "n8n webhook request timed out" };
      }
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** Get execution status via REST API */
  async getExecution(executionId: string): Promise<N8nExecutionStatus | null> {
    if (!this.configured) return null;

    try {
      const res = await fetch(
        `${this.baseUrl}/api/v1/executions/${executionId}?includeData=true`,
        { headers: this.apiHeaders },
      );
      if (!res.ok) {
        console.error(`[n8n] getExecution ${executionId} failed: ${res.status}`);
        return null;
      }
      return res.json();
    } catch (err) {
      console.error(`[n8n] getExecution ${executionId} error:`, err instanceof Error ? err.message : err);
      return null;
    }
  }

  /** List workflows via REST API */
  async listWorkflows(options?: { active?: boolean; limit?: number }) {
    if (!this.configured) return { data: [], nextCursor: null };

    const params = new URLSearchParams();
    if (options?.active !== undefined) params.set("active", String(options.active));
    if (options?.limit) params.set("limit", String(options.limit));

    const res = await fetch(`${this.baseUrl}/api/v1/workflows?${params}`, {
      headers: this.apiHeaders,
    });
    if (!res.ok) throw new Error(`n8n listWorkflows failed: ${res.status}`);
    return res.json();
  }

  /** Activate workflow */
  async activateWorkflow(workflowId: string) {
    if (!this.configured) return null;
    const res = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}/activate`, {
      method: "POST",
      headers: this.apiHeaders,
    });
    if (!res.ok) throw new Error(`n8n activate failed: ${res.status}`);
    return res.json();
  }

  /** Deactivate workflow */
  async deactivateWorkflow(workflowId: string) {
    if (!this.configured) return null;
    const res = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}/deactivate`, {
      method: "POST",
      headers: this.apiHeaders,
    });
    if (!res.ok) throw new Error(`n8n deactivate failed: ${res.status}`);
    return res.json();
  }

  /** Health check */
  async healthCheck(): Promise<boolean> {
    if (!this.configured) return false;
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/workflows?limit=1`, {
        headers: this.apiHeaders,
      });
      if (!res.ok) {
        console.error(`[n8n] healthCheck failed: ${res.status}`);
      }
      return res.ok;
    } catch (err) {
      console.error("[n8n] healthCheck error:", err instanceof Error ? err.message : err);
      return false;
    }
  }

  /** Verify webhook callback signature (timing-safe HMAC comparison — no length leak) */
  verifyWebhookSecret(providedSecret: string): boolean {
    if (!this.webhookSecret) return true;
    const hmac = (val: string) => createHmac("sha256", "webhook-verify").update(val).digest();
    return timingSafeEqual(hmac(providedSecret), hmac(this.webhookSecret));
  }
}

// Singleton
let _client: N8nClient | null = null;

export function getN8nClient(): N8nClient {
  if (!_client) {
    _client = new N8nClient();
  }
  return _client;
}

/**
 * Legacy fire-and-forget webhook trigger.
 * Kept for backward compatibility with existing publish route.
 */
export async function triggerN8nWebhook(
  path: string,
  data: Record<string, unknown>,
): Promise<void> {
  const client = getN8nClient();
  if (!client.isConfigured) return;

  client.triggerWorkflow({ webhookPath: path, payload: data }).catch((err) => {
    console.warn(`[n8n] Webhook ${path} delivery failed:`, err);
  });
}
