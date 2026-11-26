import "server-only"

/**
 * Fixed-window, in-memory rate limiter. It is per server instance, so on serverless hosting it only
 * slows an attacker down rather than giving a hard global cap — still far better than no limit on
 * password guessing. Swap the store for Redis/Upstash when a shared one exists.
 */
interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 50_000

function sweep(now: number) {
  if (buckets.size < MAX_BUCKETS) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
  // Still full of live buckets: drop the oldest insertions rather than grow without bound.
  while (buckets.size >= MAX_BUCKETS) {
    const first = buckets.keys().next().value
    if (first === undefined) break
    buckets.delete(first)
  }
}

export interface RateLimitResult {
  ok: boolean
  retryAfterSeconds: number
}

/** Counts one hit for `key`; `ok` is false once more than `limit` hits land inside `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  sweep(now)
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSeconds: 0 }
  }
  bucket.count += 1
  if (bucket.count > limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  return { ok: true, retryAfterSeconds: 0 }
}

/** Best-effort client IP from the proxy headers Vercel / most reverse proxies set. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}

/** Ready-made 429 JSON response. */
export function tooManyRequests(result: RateLimitResult, message = "Too many attempts. Try again later.") {
  return Response.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  )
}

export function resetRateLimits() {
  buckets.clear()
}
