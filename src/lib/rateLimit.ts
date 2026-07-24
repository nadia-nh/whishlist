// In-memory, single-process rate limiter. Fine for dev / a single long-running server,
// but resets per deploy and won't be shared across serverless instances — see
// FUTURE_ROADMAP.md Phase 6 for a distributed (e.g. Upstash/Redis) replacement.

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart > windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}
