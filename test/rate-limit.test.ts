import { describe, it, expect } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

const T0 = 1_700_000_000_000;

describe("createRateLimiter", () => {
  it("allows up to the limit, then refuses", () => {
    const check = createRateLimiter({ limit: 3, windowMs: 60_000 });

    expect(check("a", T0).ok).toBe(true);
    expect(check("a", T0).ok).toBe(true);
    const last = check("a", T0);
    expect(last.ok).toBe(true);
    expect(last.remaining).toBe(0);

    expect(check("a", T0).ok).toBe(false);
  });

  it("counts each key separately", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 60_000 });

    expect(check("a", T0).ok).toBe(true);
    expect(check("a", T0).ok).toBe(false);
    // One user being throttled must not throttle anyone else.
    expect(check("b", T0).ok).toBe(true);
  });

  it("slides: capacity returns as old hits age out, not all at once", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 60_000 });

    check("a", T0);
    check("a", T0 + 30_000);
    expect(check("a", T0 + 31_000).ok).toBe(false);

    // The first hit expires at T0+60s, freeing exactly one slot...
    expect(check("a", T0 + 60_001).ok).toBe(true);
    expect(check("a", T0 + 60_002).ok).toBe(false);
    // ...and the second at T0+90s.
    expect(check("a", T0 + 90_001).ok).toBe(true);
  });

  it("reports a retryAfter that actually clears the throttle", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 60_000 });

    check("a", T0);
    const denied = check("a", T0 + 10_000);
    expect(denied.ok).toBe(false);
    expect(denied.retryAfter).toBeGreaterThan(0);

    // Waiting exactly as long as told must be enough.
    expect(check("a", T0 + 10_000 + denied.retryAfter * 1000).ok).toBe(true);
  });

  it("does not consume capacity on a denied request", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 60_000 });

    check("a", T0);
    // Hammering while throttled must not keep pushing the window forward,
    // or a retry loop would lock the user out indefinitely.
    for (let i = 0; i < 10; i++) check("a", T0 + 1_000 * i);
    expect(check("a", T0 + 60_001).ok).toBe(true);
  });

  it("drops stale keys instead of growing forever", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 1_000 });
    for (let i = 0; i < 1_100; i++) check(`user-${i}`, T0);
    expect(check.size()).toBeGreaterThan(1_000);

    // The sweep runs on the next call past the threshold. Every key above is
    // stale by then, so only the new one survives.
    check("fresh", T0 + 5_000);
    expect(check.size()).toBe(1);
  });

  it("keeps keys that are still inside their window", () => {
    const check = createRateLimiter({ limit: 5, windowMs: 60_000 });
    for (let i = 0; i < 1_100; i++) check(`user-${i}`, T0);

    // Sweeping must not evict live entries — that would reset their counts
    // and hand a burst back its full allowance.
    check("user-0", T0 + 1_000);
    expect(check.size()).toBeGreaterThan(1_000);
    expect(check("user-0", T0 + 1_001).remaining).toBe(2);
  });
});
