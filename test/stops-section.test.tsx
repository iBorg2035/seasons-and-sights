// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { StopsSection } from "@/components/StopsSection";
import { createTrip, getTrip, type SavedTripLite } from "@/lib/saved-trips";
import { useState } from "react";

const okPayload = {
  sights: [],
  events: [],
  toolkit: { phrases: [], emergency: "110", tipping: "None", water: "Tap OK" },
  advisory: { level: "low", text: "Safe." },
};

function mockFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes("/api/region-detail")) {
        return Promise.resolve(
          new Response(JSON.stringify(okPayload), { status: 200 })
        );
      }
      return Promise.reject(new Error("ancillary fetch blocked in test"));
    })
  );
}

/** Mirrors how TripView really drives StopsSection: holds the trip, re-reads
 *  it after each mutation via onChange. */
function Harness({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<SavedTripLite>(() => getTrip(tripId)!);
  return (
    <StopsSection
      trip={trip}
      onChange={() => setTrip(getTrip(tripId)!)}
    />
  );
}

beforeEach(() => {
  localStorage.clear();
  mockFetch();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("<StopsSection> collapse state (regression: reorder used to collapse the wrong stop)", () => {
  it("keeps a manually collapsed stop collapsed by identity after reordering", async () => {
    const trip = createTrip("T", {
      stops: [
        ["thailand-bangkok", 2],
        ["japan-kyoto", 2],
      ],
    })!;

    render(<Harness tripId={trip.id} />);

    // The header toggle button is the only button carrying aria-expanded —
    // the "Remove X" button also matches on region name, so filter on that.
    const headerFor = (name: string) =>
      screen
        .getAllByRole("button")
        .find(
          (b) => b.hasAttribute("aria-expanded") && b.textContent!.includes(name)
        )!;

    expect(headerFor("Bangkok").getAttribute("aria-expanded")).toBe("true");
    expect(headerFor("Kyoto").getAttribute("aria-expanded")).toBe("true");

    // Manually collapse Bangkok (first stop, index 0).
    fireEvent.click(headerFor("Bangkok"));
    expect(headerFor("Bangkok").getAttribute("aria-expanded")).toBe("false");

    // Move Bangkok down, swapping it with Kyoto — Kyoto is now index 0,
    // Bangkok is now index 1. (With only 2 stops, Kyoto's "Move down" is
    // disabled as the last stop, so exactly one enabled match exists.)
    fireEvent.click(
      screen
        .getAllByRole("button", { name: "Move down" })
        .find((b) => !b.hasAttribute("disabled"))!
    );

    // The collapse state must follow Bangkok, not "whatever is at index 0".
    expect(headerFor("Bangkok").getAttribute("aria-expanded")).toBe("false");
    expect(headerFor("Kyoto").getAttribute("aria-expanded")).toBe("true");
  });
});
