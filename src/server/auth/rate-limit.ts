/**
 * Minimal fixed-window rate limiter to slow down credential-guessing
 * against a specific account. In-memory, single-instance — correct for
 * this app's current (single Node process) deploy shape. If this is ever
 * deployed across multiple instances, swap the Map for a shared store
 * (e.g. Redis/Upstash) so limits are enforced globally, not per-instance.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Sweep expired buckets occasionally so this can't grow unbounded under a
// sustained attack against many distinct emails.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();
function sweepExpired(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  sweepExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= max) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}
