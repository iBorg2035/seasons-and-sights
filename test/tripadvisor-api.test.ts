import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/tripadvisor spends against a 5k/month free tier and takes a
 * caller-chosen query, so: cache hits must stay free, misses are throttled
 * per IP, and spelling variants of one destination share a cache entry.
 */

function req(q: string, ip = "203.0.113.1") {
  return new Request(
    `http://localhost/api/tripadvisor?q=${encodeURIComponent(q)}`,
    { headers: { "x-forwarded-for": ip } }
  );
}

function json(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

/** Search returns one location; details return a rating. */
function upstream() {
  return vi.fn(async (url: string) =>
    url.includes("/location/search")
      ? json({ data: [{ location_id: "123" }] })
      : json({
          name: "Hoi An",
          rating: "4.5",
          num_reviews: "1200",
          web_url: "https://tripadvisor.example/hoi-an",
          ranking_data: { ranking_string: "#1 of 10" },
        })
  );
}

// Fresh module per test: the cache and limiter are module-level state.
async function loadRoute() {
  vi.resetModules();
  return (await import("@/app/api/tripadvisor/route")).GET;
}

beforeEach(() => vi.stubEnv("TRIPADVISOR_API_KEY", "test-key"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("/api/tripadvisor", () => {
  it("reports itself unconfigured without spending a call", async () => {
    vi.stubEnv("TRIPADVISOR_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const GET = await loadRoute();

    const res = await GET(req("Hoi An"));
    expect(await res.json()).toEqual({ configured: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the found payload shape the client renders", async () => {
    vi.stubGlobal("fetch", upstream());
    const GET = await loadRoute();

    const res = await GET(req("Hoi An"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      found: true,
      name: "Hoi An",
      rating: 4.5,
      reviewCount: 1200,
      webUrl: "https://tripadvisor.example/hoi-an",
      ranking: "#1 of 10",
    });
  });

  it("returns found:false when the search has no match", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ data: [] })));
    const GET = await loadRoute();

    const res = await GET(req("Nowhere"));
    expect(await res.json()).toEqual({ found: false });
  });

  it("shares one cache entry across casing and whitespace variants", async () => {
    const fetchSpy = upstream();
    vi.stubGlobal("fetch", fetchSpy);
    const GET = await loadRoute();

    await GET(req("Hoi An"));
    await GET(req("  hoi   AN "));
    await GET(req("HOI AN"));

    // One search + one details call, total.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("throttles a client looping over distinct queries, with Retry-After", async () => {
    const fetchSpy = upstream();
    vi.stubGlobal("fetch", fetchSpy);
    const GET = await loadRoute();

    const statuses: number[] = [];
    for (let i = 0; i < 35; i++) statuses.push((await GET(req(`place ${i}`))).status);

    expect(statuses.slice(0, 30).every((s) => s === 200)).toBe(true);
    const res = await GET(req("one more"));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    // Throttled requests never reached upstream.
    expect(fetchSpy).toHaveBeenCalledTimes(60);

    // Another IP has its own allowance.
    expect((await GET(req("fresh", "198.51.100.7"))).status).toBe(200);
  });

  it("keeps serving cached answers to a throttled client", async () => {
    vi.stubGlobal("fetch", upstream());
    const GET = await loadRoute();

    await GET(req("Hoi An"));
    for (let i = 0; i < 40; i++) await GET(req(`place ${i}`));
    expect((await GET(req(`place 99`))).status).toBe(429);

    const res = await GET(req("hoi an"));
    expect(res.status).toBe(200);
    expect((await res.json()).found).toBe(true);
  });
});
