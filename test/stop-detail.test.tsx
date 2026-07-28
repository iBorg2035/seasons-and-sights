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
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByRole("alert").textContent).toMatch(
      /couldn't load the full destination details/i
    );
    expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
    // The detail-dependent skeletons are gone, not spinning forever.
    expect(screen.queryByLabelText("Sights")).toBeNull();
  });

  it("marks loading skeletons with role=status for assistive tech", () => {
    // A fresh, never-rendered region so the module-level detail cache can't
    // short-circuit straight to the resolved state.
    const cusco = getSlimRegion("peru-cusco")!;
    mockFetch(() => new Promise(() => {})); // never resolves — stay pending
    render(<StopDetail region={cusco} />);
    const statuses = screen.getAllByRole("status");
    expect(statuses.length).toBeGreaterThan(0);
  });

  it("renders the fetched detail (sights, festivals, advisory, packing)", async () => {
    mockFetch(async () => new Response(JSON.stringify(okPayload), { status: 200 }));
    render(<StopDetail region={kyoto} stayMonth={4} />);
    await waitFor(() => expect(screen.getByText("Fushimi Inari")).toBeTruthy());
    expect(screen.getByText(/Gion Matsuri/)).toBeTruthy();
    expect(screen.getByText(/Very safe\./)).toBeTruthy();
    // Packing list, tailored to the stay month, built from the fetched sights.
    expect(screen.getByText(/Pack for April/)).toBeTruthy();
    expect(screen.getByText(/Reusable water bottle/)).toBeTruthy();
  });

  it("serves a re-expand from the session cache without refetching", async () => {
    // Warms the cache itself, on a region no other test touches. It used to
    // rely on the previous test having fetched kyoto, which meant it passed
    // only in file order and failed when run alone — the kind of coupling that
    // makes a suite look flaky when it's really just order-dependent.
    const hoian = getSlimRegion("vietnam-hoian")!;
    const detailCalls = (spy: ReturnType<typeof mockFetch>) =>
      spy.mock.calls.filter(([u]) => String(u).includes("/api/region-detail"));

    const first = mockFetch(async () => new Response(JSON.stringify(okPayload), { status: 200 }));
    const view = render(<StopDetail region={hoian} />);
    await waitFor(() => expect(screen.getByText("Fushimi Inari")).toBeTruthy());
    expect(detailCalls(first)).toHaveLength(1);
    view.unmount();

    // Re-expand against a fresh spy, so any refetch is unmistakable.
    const second = mockFetch(async () => new Response(JSON.stringify(okPayload), { status: 200 }));
    render(<StopDetail region={hoian} />);
    await waitFor(() => expect(screen.getByText("Fushimi Inari")).toBeTruthy());
    expect(detailCalls(second)).toHaveLength(0);
  });

  it("highlights a festival that falls during the passed stayMonths", async () => {
    mockFetch(async () => new Response(JSON.stringify(okPayload), { status: 200 }));
    render(<StopDetail region={kyoto} stayMonths={[7]} />);
    await waitFor(() => expect(screen.getByText(/Gion Matsuri/)).toBeTruthy());
    expect(screen.getByText(/During your stay/i)).toBeTruthy();
  });

  it("does not highlight a festival outside the passed stayMonths", async () => {
    mockFetch(async () => new Response(JSON.stringify(okPayload), { status: 200 }));
    render(<StopDetail region={kyoto} stayMonths={[1]} />);
    await waitFor(() => expect(screen.getByText(/Gion Matsuri/)).toBeTruthy());
    expect(screen.queryByText(/During your stay/i)).toBeNull();
  });
});
