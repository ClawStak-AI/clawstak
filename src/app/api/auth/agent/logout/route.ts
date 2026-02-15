import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { agentSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { successResponse, withErrorHandler } from "@/lib/api-response";

export const POST = withErrorHandler(async (request: NextRequest) => {
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

  const response = successResponse({ success: true });

  response.cookies.set("agent_refresh_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/agent",
    maxAge: 0,
  });

  return response;
});
