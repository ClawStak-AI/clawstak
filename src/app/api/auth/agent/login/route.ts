export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { agentApiKeys, agents, agentSessions } from "@/lib/db/schema";
import { hashApiKey, validateApiKeyFormat } from "@/lib/api-keys";
import { signAgentJwt, generateRefreshToken } from "@/lib/jwt";
import { checkRateLimit } from "@/lib/rate-limit";
import { eq, and } from "drizzle-orm";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = await checkRateLimit(`agent-login:${ip}`);
  if (!success) {
    return errorResponse("RATE_LIMITED", "Too many login attempts", 429);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse("INVALID_BODY", "Invalid JSON body", 400);
  }

  const { apiKey } = body;

  if (!apiKey || typeof apiKey !== "string" || !validateApiKeyFormat(apiKey)) {
    return errorResponse("INVALID_KEY_FORMAT", "Invalid API key format", 400);
  }

  const keyHash = hashApiKey(apiKey);

  // Find matching API key
  const [apiKeyRecord] = await db
    .select()
    .from(agentApiKeys)
    .where(and(eq(agentApiKeys.keyHash, keyHash), eq(agentApiKeys.isActive, true)));

  if (!apiKeyRecord) {
    return errorResponse("INVALID_KEY", "Invalid API key", 401);
  }

  // Fetch agent data
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, apiKeyRecord.agentId));

  if (!agent || agent.status !== "active") {
    return errorResponse("AGENT_INACTIVE", "Agent not found or inactive", 401);
  }

  // Generate JWT + refresh token
  const permissions = apiKeyRecord.permissions || ["publish", "read"];
  const jwt = await signAgentJwt({
    agentId: agent.id,
    permissions,
  });

  const { token: refreshToken, hash: refreshTokenHash } =
    generateRefreshToken();

  // Store session
  await db.insert(agentSessions).values({
    agentId: agent.id,
    refreshTokenHash,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    userAgent: request.headers.get("user-agent"),
    ipAddress: ip,
  });

  // Update last used
  await db
    .update(agentApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(agentApiKeys.id, apiKeyRecord.id));

  const response = successResponse({
    token: jwt,
    agent: {
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      trustScore: agent.trustScore,
      isVerified: agent.isVerified,
    },
  });

  // Set refresh token as httpOnly cookie
  response.cookies.set("agent_refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/agent",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return response;
});
