// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { StopDetail } from "@/components/StopDetail";
import { getSlimRegion } from "@/data/regions-slim";

const kyoto = getSlimRegion("japan-kyoto")!;
const bangkok = getSlimRegion("thailand-bangkok")!;

const okPayload = {
  sights: [{ name: "Fushimi Inari", type: "culture", lat: 1, lng: 2, blurb: "Torii." }],
  events: [{ name: "Gion Matsuri", month: 7, blurb: "Floats." }],
  toolkit: { phrases: [], emergency: "110", tipping: "None", water: "Tap OK" },
  advisory: { level: "low", text: "Very safe." },
};

/**
 * StopDetail's children (ClimateChart, WeatherNow, TripadvisorRating) fetch
 * too; route only /api/region-detail to the test's handler and reject the
 * rest — those components all degrade gracefully on rejection.
 */
function mockFetch(regionDetail: () => Promise<Response>) {
  const spy = vi.fn((input: RequestInfo | URL) => {
    if (String(input).includes("/api/region-detail")) return regionDetail();
    return Promise.reject(new Error("ancillary fetch blocked in test"));
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<StopDetail>", () => {
  it("shows a retryable error instead of skeletons forever when the fetch fails (regression: infinite-skeleton class)", async () => {
    // Bangkok here so the module-level detail cache (keyed by region id)
    // can't be pre-warmed by the success test below.
    mockFetch(() => Promise.reject(new Error("offline")));
    render(<StopDetail region={bangkok} />);
    await waitFor(() =>
      expect(
        screen.getByText(/couldn't load the full destination details/i)
      ).toBeTruthy()
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
    // The detail-dependent skeletons are gone, not spinning forever.
    expect(screen.queryByLabelText("Sights")).toBeNull();
  });

  it("renders the fetched detail (sights, festivals, advisory)", async () => {
    mockFetch(async () => new Response(JSON.stringify(okPayload), { status: 200 }));
    render(<StopDetail region={kyoto} />);
    await waitFor(() => expect(screen.getByText("Fushimi Inari")).toBeTruthy());
    expect(screen.getByText(/Gion Matsuri/)).toBeTruthy();
    expect(screen.getByText(/Very safe/)).toBeTruthy();
  });

  it("serves a re-expand from the session cache without refetching", async () => {
    // kyoto's detail was cached by the previous test's fetch.
    const spy = mockFetch(async () => new Response(JSON.stringify(okPayload), { status: 200 }));
    render(<StopDetail region={kyoto} />);
    await waitFor(() => expect(screen.getByText("Fushimi Inari")).toBeTruthy());
    const detailCalls = spy.mock.calls.filter(([u]) =>
      String(u).includes("/api/region-detail")
    );
    expect(detailCalls).toHaveLength(0);
  });
});
