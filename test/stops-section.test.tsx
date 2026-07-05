// @vitest-environment jsdom
import { useState } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { StopsSection } from "@/components/StopsSection";
import { getTrip, SAVED_TRIPS_KEY, type SavedTripLite } from "@/lib/saved-trips";

function mockFetch() {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("blocked in test"))));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const TRIP_ID = "trip-1";

function seedTrip(): SavedTripLite {
  const trip: SavedTripLite = {
    id: TRIP_ID,
    name: "Test trip",
    start: 6,
    stops: [
      ["japan-kyoto", 2],
      ["thailand-bangkok", 2],
      ["peru-cusco", 2],
    ],
  };
  localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify([trip]));
  return trip;
}

function Wrapper({ initial }: { initial: SavedTripLite }) {
  const [trip, setTrip] = useState(initial);
  return (
    <StopsSection trip={trip} onChange={() => setTrip(getTrip(trip.id) ?? trip)} />
  );
}

// The row's first <button> is always the collapse/expand toggle — a stable
// anchor that doesn't collide with GettingThere's cross-references to other
// stops' names elsewhere on the page (e.g. "from Bangkok", "from Cusco...").
function toggleFor(removeLabel: RegExp): HTMLElement {
  const removeButton = screen.getByRole("button", { name: removeLabel });
  return removeButton.closest("li")!.querySelector("button")!;
}

describe("<StopsSection> collapse state", () => {
  it("keeps a manually-collapsed stop collapsed by identity, not array position, after it's reordered (regression: position-keyed collapse state)", () => {
    mockFetch();
    const trip = seedTrip();
    render(<Wrapper initial={trip} />);

    expect(toggleFor(/Remove.*Cusco/).getAttribute("aria-expanded")).toBe("true");
    expect(toggleFor(/Remove.*Bangkok/).getAttribute("aria-expanded")).toBe("true");

    // Manually collapse Cusco — currently the 3rd (last) stop.
    fireEvent.click(toggleFor(/Remove.*Cusco/));
    expect(toggleFor(/Remove.*Cusco/).getAttribute("aria-expanded")).toBe("false");

    // Move Cusco up a position (3rd -> 2nd, swapping with Bangkok).
    const moveUpButtons = screen.getAllByRole("button", { name: /Move up/i });
    fireEvent.click(moveUpButtons[2]);

    // Cusco (now 2nd) should still be the one collapsed; Bangkok (now 3rd,
    // never touched by the user) should still be expanded.
    expect(toggleFor(/Remove.*Cusco/).getAttribute("aria-expanded")).toBe("false");
    expect(toggleFor(/Remove.*Bangkok/).getAttribute("aria-expanded")).toBe("true");
  });
});
