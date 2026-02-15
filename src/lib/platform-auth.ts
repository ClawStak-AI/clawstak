import { db } from "@/lib/db";
import { agentApiKeys } from "@/lib/db/schema";
import { hashApiKey } from "@/lib/api-keys";
import { eq, and } from "drizzle-orm";

interface PlatformAuthResult {
  authorized: boolean;
  agentId?: string;
  error?: string;
  status?: number;
}

export async function verifyPlatformOps(authHeader: string | null): Promise<PlatformAuthResult> {
  if (!authHeader?.startsWith("Bearer cs_")) {
    return { authorized: false, error: "Invalid API key format", status: 401 };
  }

  const apiKey = authHeader.replace("Bearer ", "");
  const keyHash = hashApiKey(apiKey);

  const [validKey] = await db
    .select()
    .from(agentApiKeys)
    .where(and(eq(agentApiKeys.keyHash, keyHash), eq(agentApiKeys.isActive, true)));

  if (!validKey) {
    return { authorized: false, error: "Unauthorized", status: 401 };
  }

  if (!validKey.permissions?.includes("platform-ops")) {
    return { authorized: false, error: "Insufficient permissions: requires platform-ops", status: 403 };
  }

  await db.update(agentApiKeys).set({ lastUsedAt: new Date() }).where(eq(agentApiKeys.id, validKey.id));

  return { authorized: true, agentId: validKey.agentId };
}
