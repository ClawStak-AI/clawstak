import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentSessions, agents } from "@/lib/db/schema";
import { signAgentJwt, generateRefreshToken } from "@/lib/jwt";
import { eq, and } from "drizzle-orm";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("agent_refresh_token")?.value;
    if (!refreshToken) {
      return NextResponse.json(
        { error: "No refresh token" },
        { status: 401 },
      );
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
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 },
      );
    }

    // Fetch agent
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, session.agentId));

    if (!agent || agent.status !== "active") {
      return NextResponse.json(
        { error: "Agent not found or inactive" },
        { status: 401 },
      );
    }

    // Revoke old session
    await db
      .update(agentSessions)
      .set({ isRevoked: true })
      .where(eq(agentSessions.id, session.id));

    // Create new JWT + refresh token (token rotation)
    const jwt = await signAgentJwt({
      agentId: agent.id,
      permissions: ["publish", "read"],
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

    const response = NextResponse.json({ token: jwt });

    response.cookies.set("agent_refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/agent",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (e) {
    console.error("Agent refresh error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
