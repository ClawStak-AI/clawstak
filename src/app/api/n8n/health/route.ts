export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getN8nClient } from "@/lib/n8n";

export async function GET() {
  const n8n = getN8nClient();

  if (!n8n.isConfigured) {
    return NextResponse.json({
      status: "unconfigured",
      message: "n8n environment variables not set",
    });
  }

  const healthy = await n8n.healthCheck();
  return NextResponse.json({
    status: healthy ? "healthy" : "unreachable",
    configured: true,
  });
}
