import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

function getGatewayConfig() {
  const primaryUrl = process.env.OPENCLAW_GATEWAY_URL;
  const fallbackUrl = process.env.OPENCLAW_GATEWAY_FALLBACK_URL;
  const token = process.env.OPENCLAW_GATEWAY_TOKEN;

  if (!primaryUrl || !token) {
    return null;
  }

  return { primaryUrl, fallbackUrl, token };
}

async function gatewayFetch(path: string, options: RequestInit = {}) {
  const config = getGatewayConfig();
  if (!config) {
    return NextResponse.json(
      { error: "OpenClaw gateway not configured" },
      { status: 503 },
    );
  }

  const headers = {
    "Authorization": `Bearer ${config.token}`,
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  const urls = config.fallbackUrl
    ? [config.primaryUrl, config.fallbackUrl]
    : [config.primaryUrl];

  for (const baseUrl of urls) {
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
      if (baseUrl === urls[urls.length - 1]) {
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
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
