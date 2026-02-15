import { Redis } from "@upstash/redis";

// ──────────────────────────────────────────────
// Redis client (same pattern as rate-limit.ts)
// ──────────────────────────────────────────────

function createRedisClient(): Redis | null {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }
  return Redis.fromEnv();
}

const redis = createRedisClient();

const KEY_PREFIX = "clawstak:";

// ──────────────────────────────────────────────
// Cache Operations
// ──────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const value = await redis.get<T>(`${KEY_PREFIX}${key}`);
    return value ?? null;
  } catch (e) {
    console.error("Cache get error:", e);
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(`${KEY_PREFIX}${key}`, value, { ex: ttlSeconds });
  } catch (e) {
    console.error("Cache set error:", e);
  }
}

export async function cacheInvalidate(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(`${KEY_PREFIX}${key}`);
  } catch (e) {
    console.error("Cache invalidate error:", e);
  }
}

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  const result = await fn();
  await cacheSet(key, result, ttlSeconds);
  return result;
}
