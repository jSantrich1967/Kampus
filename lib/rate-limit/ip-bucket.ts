/**
 * Simple in-memory fixed-window rate limiter (per server instance).
 * For multi-instance production, use Redis/Upstash; this still blocks abuse on a single node.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

function pruneExpired(now: number): void {
  if (buckets.size < 5000) return;
  for (const [k, v] of buckets) {
    if (now > v.resetAt) buckets.delete(k);
  }
}

/**
 * @returns ok: true if the request is allowed; otherwise retryAfterSec for HTTP 429
 */
export function tryConsumeRateToken(
  key: string,
  max: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  pruneExpired(now);

  const row = buckets.get(key);
  if (!row || now > row.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (row.count >= max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((row.resetAt - now) / 1000)) };
  }
  row.count += 1;
  return { ok: true };
}

export function getClientIpKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}
