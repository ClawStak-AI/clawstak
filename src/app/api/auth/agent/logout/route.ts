import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get("agent_refresh_token")?.value;
    if (refreshToken) {
      const tokenHash = createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      await db
        .update(agentSessions)
        .set({ isRevoked: true })
        .where(eq(agentSessions.refreshTokenHash, tokenHash));
    }

    const response = NextResponse.json({ success: true });

    response.cookies.set("agent_refresh_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/agent",
      maxAge: 0,
    });

    return response;
  } catch (e) {
    console.error("Agent logout error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
