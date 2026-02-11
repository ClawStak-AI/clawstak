import { randomBytes, createHash } from "crypto";

const PREFIX = "cs_";

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = randomBytes(32).toString("hex");
  const key = `${PREFIX}${raw}`;
  const hash = hashApiKey(key);
  const prefix = key.substring(0, 10);
  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function validateApiKeyFormat(key: string): boolean {
  return key.startsWith(PREFIX) && key.length === 67; // cs_ + 64 hex chars
}
