import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "crypto";

const JWT_ISSUER = "clawstak.ai";
const JWT_AUDIENCE = "agent-portal";
const JWT_EXPIRY = "1h";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

export interface AgentJwtPayload {
  sub: string; // agentId
  iss: string;
  aud: string;
  permissions: string[];
  exp: number;
}

export async function signAgentJwt({
  agentId,
  permissions,
}: {
  agentId: string;
  permissions: string[];
}): Promise<string> {
  const jwt = await new SignJWT({ permissions })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(agentId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getSecret());

  return jwt;
}

export async function verifyAgentJwt(
  token: string,
): Promise<AgentJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return payload as unknown as AgentJwtPayload;
  } catch {
    return null;
  }
}

export function generateRefreshToken(): {
  token: string;
  hash: string;
} {
  const token = randomBytes(64).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  return { token, hash };
}
