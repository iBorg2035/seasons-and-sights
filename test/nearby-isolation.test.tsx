// @vitest-environment jsdom
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NearbySection } from "@/components/NearbySection";
import { nearbyCacheKey, readNearbyCache } from "@/lib/nearby-cache";
import type { SavedTripLite } from "@/lib/saved-trips";

/**
 * The isolation half of the QA norms, applied to Nearby.
 *
 * Two things could leak here and both would be invisible in a screenshot: the
 * localStorage cache is keyed by coordinates rather than by trip id, so two
 * destinations sharing a key would show each other's cafes; and Next reuses
 * the component across /trips/[id] navigations, so a trip switch could leave
 * the previous city's results on screen looking current.
 */

function trip(id: string, regionId: string): SavedTripLite {
  return { id, name: id, start: 9, stops: [[regionId, 1]] };
}

/** Named so a failure says which city's data showed up where. */
const PLACES: Record<string, string> = {
  "vietnam-hoian": "43 Factory Coffee Roaster",
  "thailand-bangkok": "Roots Coffee Bangkok",
};

let served: string[];

function mockFetchFor(regionOrder: string[]) {
  served = [];
  return vi.fn(async (url: string) => {
    // Which region a call is for is inferred from call order; each render in
    // these tests issues exactly one lookup.
    const region = regionOrder[served.length] ?? regionOrder[0];
    served.push(String(url));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        configured: true,
        cached: false,
        places: [
          {
            id: `${region}-1`,
            name: PLACES[region],
            rating: 4.7,
            reviewCount: 900,
            lat: 16,
            lng: 108,
            address: null,
            openNow: true,
            mapsUrl: null,
            priceLevel: null,
            distanceKm: 0.3,
          },
        ],
      }),
    } as unknown as Response;
  });
}

describe("Nearby isolation across trips", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not show one trip's places on another trip", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchFor(["vietnam-hoian", "thailand-bangkok"])
    );

    const a = render(<NearbySection trip={trip("trip-a", "vietnam-hoian")} />);
    await screen.findByText(PLACES["vietnam-hoian"]);

    // Switch to a trip in a different country.
    a.unmount();
    render(<NearbySection trip={trip("trip-b", "thailand-bangkok")} />);

    await screen.findByText(PLACES["thailand-bangkok"]);
    expect(screen.queryByText(PLACES["vietnam-hoian"])).toBeNull();

    // ...and back again: the first trip still has its own results.
    cleanup();
    vi.stubGlobal("fetch", mockFetchFor(["vietnam-hoian"]));
    render(<NearbySection trip={trip("trip-a", "vietnam-hoian")} />);
    await screen.findByText(PLACES["vietnam-hoian"]);
    expect(screen.queryByText(PLACES["thailand-bangkok"])).toBeNull();
  });

  it("caches the two destinations under different keys", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchFor(["vietnam-hoian", "thailand-bangkok"])
    );

    render(<NearbySection trip={trip("trip-a", "vietnam-hoian")} />);
    await screen.findByText(PLACES["vietnam-hoian"]);
    cleanup();
    render(<NearbySection trip={trip("trip-b", "thailand-bangkok")} />);
    await screen.findByText(PLACES["thailand-bangkok"]);

    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith("seasons-nearby:")
    );
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(2);
  });

  it("re-serves a known spot from storage without a second network call", async () => {
    const fetchSpy = mockFetchFor(["vietnam-hoian", "vietnam-hoian"]);
    vi.stubGlobal("fetch", fetchSpy);

    render(<NearbySection trip={trip("trip-a", "vietnam-hoian")} />);
    await screen.findByText(PLACES["vietnam-hoian"]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    cleanup();
    render(<NearbySection trip={trip("trip-a", "vietnam-hoian")} />);
    await screen.findByText(PLACES["vietnam-hoian"]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back to the last saved results for that spot when offline", async () => {
    vi.stubGlobal("fetch", mockFetchFor(["vietnam-hoian"]));
    render(<NearbySection trip={trip("trip-a", "vietnam-hoian")} />);
    await screen.findByText(PLACES["vietnam-hoian"]);

    // Age the cache past the fresh window so the next mount tries the network.
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith("seasons-nearby:")
    )!;
    const cached = readNearbyCache(key)!;
    localStorage.setItem(
      key,
      JSON.stringify({ ...cached, ts: Date.now() - 48 * 60 * 60 * 1000 })
    );

    cleanup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    );
    render(<NearbySection trip={trip("trip-a", "vietnam-hoian")} />);

    await screen.findByText(PLACES["vietnam-hoian"]);
    // Stale results shown as if current would be worse than none — the label
    // is the whole point of the fallback.
    await screen.findByText(/Offline/i);
  });
});

describe("nearbyCacheKey", () => {
  it("separates categories and radii at the same point", () => {
    const a = nearbyCacheKey(16.06, 108.22, "coffee", 1500);
    const b = nearbyCacheKey(16.06, 108.22, "food", 1500);
    const c = nearbyCacheKey(16.06, 108.22, "coffee", 5000);
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it("rounds to the same precision the server caches on", () => {
    expect(nearbyCacheKey(16.060001, 108.220004, "coffee", 1500)).toBe(
      nearbyCacheKey(16.06, 108.22, "coffee", 1500)
    );
  });
});
