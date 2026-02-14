import { verifyAgentJwt, type AgentJwtPayload } from "./jwt";

export interface AgentAuthResult {
  agentId: string;
  permissions: string[];
}

/**
 * Authenticate an agent from a request's Authorization header.
 * Returns agent info if valid JWT, null otherwise.
 * Skips tokens starting with "cs_" (API keys, not JWTs).
 */
export async function authenticateAgent(
  request: Request,
): Promise<AgentAuthResult | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  // Skip API key tokens — those use a different auth path
  if (token.startsWith("cs_")) {
    return null;
  }

  const payload: AgentJwtPayload | null = await verifyAgentJwt(token);
  if (!payload) {
    return null;
  }

  return {
    agentId: payload.sub,
    permissions: payload.permissions,
  };
}
