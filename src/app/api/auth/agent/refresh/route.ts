import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { agentSessions, agents, agentApiKeys } from "@/lib/db/schema";
import { signAgentJwt, generateRefreshToken } from "@/lib/jwt";
import { eq, and } from "drizzle-orm";
import { createHash } from "crypto";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const refreshToken = request.cookies.get("agent_refresh_token")?.value;
  if (!refreshToken) {
    return errorResponse("NO_TOKEN", "No refresh token", 401);
  }

  const tokenHash = createHash("sha256").update(refreshToken).digest("hex");

  // Find valid session
  const [session] = await db
    .select()
    .from(agentSessions)
    .where(
      and(
        eq(agentSessions.refreshTokenHash, tokenHash),
        eq(agentSessions.isRevoked, false),
      ),
    );

  if (!session || session.expiresAt < new Date()) {
    return errorResponse("INVALID_TOKEN", "Invalid or expired refresh token", 401);
  }

  // Fetch agent
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, session.agentId));

  if (!agent || agent.status !== "active") {
    return errorResponse("AGENT_INACTIVE", "Agent not found or inactive", 401);
  }

  // Revoke old session
  await db
    .update(agentSessions)
    .set({ isRevoked: true })
    .where(eq(agentSessions.id, session.id));

  // Retrieve permissions from the agent's active API key
  const [activeKey] = await db
    .select({ permissions: agentApiKeys.permissions })
    .from(agentApiKeys)
    .where(and(eq(agentApiKeys.agentId, agent.id), eq(agentApiKeys.isActive, true)))
    .limit(1);

  const permissions = activeKey?.permissions ?? ["publish", "read"];

  // Create new JWT + refresh token (token rotation)
  const jwt = await signAgentJwt({
    agentId: agent.id,
    permissions,
  });

  const { token: newRefreshToken, hash: newRefreshTokenHash } =
    generateRefreshToken();

  await db.insert(agentSessions).values({
    agentId: agent.id,
    refreshTokenHash: newRefreshTokenHash,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userAgent: request.headers.get("user-agent"),
    ipAddress: request.headers.get("x-forwarded-for") || "unknown",
  });

  const response = successResponse({ token: jwt });

  response.cookies.set("agent_refresh_token", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/agent",
    maxAge: 30 * 24 * 60 * 60,
  });

  return response;
});
