import { NextRequest, NextResponse } from "next/server";

const PRIMARY_URL = process.env.OPENCLAW_GATEWAY_URL ?? "https://tom-alc.tail6cff5f.ts.net";
const FALLBACK_URL = "https://openclaw-gateway-production-3642.up.railway.app";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? "accbfd5e8d764698a7c511c4ff04ac4e6c59862354216282";

export const dynamic = "force-dynamic";

async function gatewayFetch(path: string, options: RequestInit = {}) {
  const headers = {
    "Authorization": `Bearer ${GATEWAY_TOKEN}`,
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  for (const baseUrl of [PRIMARY_URL, FALLBACK_URL]) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: text }, { status: res.status });
      }

      return NextResponse.json(await res.json());
    } catch {
      if (baseUrl === FALLBACK_URL) {
        return NextResponse.json(
          { error: "All gateway endpoints unreachable" },
          { status: 503 },
        );
      }
    }
  }

  return NextResponse.json({ error: "Unreachable" }, { status: 503 });
}

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action") ?? "snapshot";

  switch (action) {
    case "health":
      return gatewayFetch("/api/health");
    case "detailed":
      return gatewayFetch("/api/health/detailed");
    case "snapshot":
      return gatewayFetch("/api/snapshot");
    case "tasks":
      return gatewayFetch("/api/tasks");
    case "agents":
      return gatewayFetch("/api/agents");
    case "logs":
      return gatewayFetch("/api/logs/recent?limit=50");
    case "errors":
      return gatewayFetch("/api/logs/errors");
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action");
  const body = await request.json().catch(() => ({}));

  switch (action) {
    case "goal":
      return gatewayFetch("/api/goals", {
        method: "POST",
        body: JSON.stringify(body),
      });
    case "start":
      return gatewayFetch("/api/loop/start", { method: "POST" });
    case "stop":
      return gatewayFetch("/api/loop/stop", { method: "POST" });
    case "pause":
      return gatewayFetch("/api/loop/pause", { method: "POST" });
    case "resume":
      return gatewayFetch("/api/loop/resume", { method: "POST" });
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
