export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the caller may retry. `0` when `ok`. */
  retryAfter: number;
  /** Requests still available in the current window. */
  remaining: number;
}

/**
 * A sliding-window rate limiter held in process memory.
 *
 * Deliberately not a distributed limiter. On Vercel each serverless instance
 * gets its own map, so N instances allow up to N× the limit, and a cold start
 * resets the window. That makes this a spend *dampener*, not a hard global
 * cap — it stops one user hammering a warm instance, which is the realistic
 * abuse shape here. If the assistant is ever opened past the allowlist, this
 * needs to move to a shared store (Upstash/Redis) to become a real bound.
 */
export function createRateLimiter({
  limit,
  windowMs,
}: {
  limit: number;
  windowMs: number;
}) {
  const hits = new Map<string, number[]>();

  /**
   * Drop keys whose entire window has elapsed. Without this the map grows
   * once per distinct user for the life of the instance.
   */
  function sweep(now: number) {
    for (const [key, times] of hits) {
      if (times.length === 0 || times[times.length - 1] <= now - windowMs) {
        hits.delete(key);
      }
    }
  }

  function check(key: string, now: number = Date.now()): RateLimitResult {
    if (hits.size > 1000) sweep(now);

    const cutoff = now - windowMs;
    const times = (hits.get(key) ?? []).filter((t) => t > cutoff);

    if (times.length >= limit) {
      hits.set(key, times);
      // The window frees up when the oldest hit in it expires.
      const retryAfter = Math.max(1, Math.ceil((times[0] - cutoff) / 1000));
      return { ok: false, retryAfter, remaining: 0 };
    }

    times.push(now);
    hits.set(key, times);
    return { ok: true, retryAfter: 0, remaining: limit - times.length };
  }

  /** Tracked-key count. Exposed so the sweep is observable in tests. */
  check.size = () => hits.size;

  return check;
}
