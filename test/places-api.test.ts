import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/places/route";

function req(path: string, ip = "203.0.113.1") {
  return new Request(`http://localhost${path}`, {
    headers: { "x-forwarded-for": ip },
  });
}

function googleResponse(places: unknown[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ places }),
    text: async () => "",
  } as Response;
}

const CAFE = {
  id: "place-1",
  displayName: { text: "43 Factory Coffee Roaster" },
  rating: 4.7,
  userRatingCount: 2100,
  location: { latitude: 16.0405, lng: undefined, longitude: 108.2445 },
  shortFormattedAddress: "422 Ngo Thi Sy, Da Nang",
  currentOpeningHours: { openNow: true },
  googleMapsUri: "https://maps.google.com/?cid=1",
  priceLevel: "PRICE_LEVEL_MODERATE",
};

// The route caches per rounded coordinate for the life of the module, so each
// case searches from its own point rather than sharing a warm entry.
let lat = 16.0;
function freshPoint() {
  lat += 0.01;
  return `lat=${lat.toFixed(3)}&lng=108.22`;
}

describe("/api/places", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "test-key");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reports itself unconfigured instead of erroring when there is no key", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(req(`/api/places?${freshPoint()}`));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      configured: false,
      places: [],
    });
    // Crucially, it must not have spent a call to find that out.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects out-of-range coordinates", async () => {
    const res = await GET(req("/api/places?lat=91&lng=0"));
    expect(res.status).toBe(400);
  });

  it("rejects non-finite coordinates", async () => {
    const res = await GET(req("/api/places?lat=NaN&lng=0"));
    expect(res.status).toBe(400);
  });

  it("rejects an unknown category rather than searching for it", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const res = await GET(req(`/api/places?${freshPoint()}&category=bitcoin`));
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns ranked, normalised places", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => googleResponse([CAFE])));

    const res = await GET(req(`/api/places?${freshPoint()}&category=coffee`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.configured).toBe(true);
    expect(body.places).toHaveLength(1);
    expect(body.places[0]).toMatchObject({
      name: "43 Factory Coffee Roaster",
      rating: 4.7,
      reviewCount: 2100,
      openNow: true,
    });
    expect(body.places[0].distanceKm).toBeGreaterThanOrEqual(0);
  });

  it("drops results with no id, name or position instead of rendering blanks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        googleResponse([
          CAFE,
          { id: "no-name", location: { latitude: 16, longitude: 108 } },
          { displayName: { text: "no id" }, location: { latitude: 16, longitude: 108 } },
          { id: "no-loc", displayName: { text: "nowhere" } },
        ])
      )
    );
    const res = await GET(req(`/api/places?${freshPoint()}&category=coffee`));
    const body = await res.json();
    expect(body.places).toHaveLength(1);
    expect(body.places[0].id).toBe("place-1");
  });

  it("serves a repeat search from cache without paying for it twice", async () => {
    const fetchSpy = vi.fn(async () => googleResponse([CAFE]));
    vi.stubGlobal("fetch", fetchSpy);
    const point = freshPoint();

    const first = await GET(req(`/api/places?${point}&category=coffee`));
    await expect(first.json()).resolves.toMatchObject({ cached: false });

    const second = await GET(req(`/api/places?${point}&category=coffee`));
    await expect(second.json()).resolves.toMatchObject({ cached: true });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("treats a jittered GPS fix as the same point", async () => {
    const fetchSpy = vi.fn(async () => googleResponse([CAFE]));
    vi.stubGlobal("fetch", fetchSpy);
    lat += 0.01;
    const base = lat.toFixed(3);

    await GET(req(`/api/places?lat=${base}&lng=108.220000&category=coffee`));
    // ~1m of drift — below the rounding precision, so it must not re-bill.
    await GET(req(`/api/places?lat=${base}1&lng=108.2200004&category=coffee`));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("clamps an absurd radius rather than passing it upstream", async () => {
    const sentBodies: string[] = [];
    const fetchSpy = vi.fn(async (_url: string, init: RequestInit) => {
      sentBodies.push(String(init.body));
      return googleResponse([]);
    });
    vi.stubGlobal("fetch", fetchSpy);

    const res = await GET(req(`/api/places?${freshPoint()}&radius=999999`));
    const body = await res.json();
    expect(body.radiusM).toBe(20000);

    const sent = JSON.parse(sentBodies[0]);
    expect(sent.locationRestriction.circle.radius).toBe(20000);
  });

  it("surfaces an upstream failure as a 502, not a fake empty list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        text: async () => "boom",
        json: async () => ({}),
      }))
    );
    const res = await GET(req(`/api/places?${freshPoint()}&category=coffee`));
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toHaveProperty("error");
  });

  it("does not echo Google's error body back to the client", async () => {
    // A misconfigured key makes Google describe the account's billing and
    // project state. That belongs in the server log, not in a page.
    const upstream =
      '{"error":{"message":"API key not valid","status":"INVALID_ARGUMENT"}}';
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 400,
        text: async () => upstream,
        json: async () => ({}),
      }))
    );
    const res = await GET(req(`/api/places?${freshPoint()}&category=coffee`));
    const text = await res.text();
    expect(text).not.toContain("API key not valid");
    expect(text).not.toContain("INVALID_ARGUMENT");
    expect(text).toContain("unavailable");
  });

  it("never puts the API key in the response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => googleResponse([CAFE])));
    const res = await GET(req(`/api/places?${freshPoint()}&category=coffee`));
    expect(await res.text()).not.toContain("test-key");
  });

  it("throttles one client hammering fresh points", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => googleResponse([])));
    const ip = "198.51.100.7";
    let last: Response | undefined;
    for (let i = 0; i < 32; i++) {
      last = await GET(req(`/api/places?${freshPoint()}`, ip));
    }
    expect(last!.status).toBe(429);
    expect(last!.headers.get("Retry-After")).toBeTruthy();
  });
});
