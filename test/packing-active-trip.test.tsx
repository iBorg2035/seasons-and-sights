// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { PackingList } from "@/components/PackingList";
import { createTrip } from "@/lib/saved-trips";
import { setActiveTripId } from "@/lib/active-trip";
import { loadPacked, packingKey } from "@/lib/packing-progress";
import { getRegion } from "@/data/regions";

/**
 * The region page has no trip of its own. Rather than leave its checkboxes
 * read-only, the list falls back to the active trip — but silently writing
 * into a trip the reader isn't looking at would be its own bug, so it has to
 * say where the ticks went.
 */

const region = getRegion("peru-cusco")!;

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("with no explicit trip", () => {
  it("stays read-only when nothing is saved yet", () => {
    render(<PackingList region={region} month={8} />);

    // No trip to attribute ticks to, so no checkbox that would forget them.
    expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
    expect(screen.queryByText(/Saving to/)).toBeNull();
  });

  it("saves to the active trip and says so", () => {
    const trip = createTrip("Peru in August", {
      start: 8,
      stops: [["peru-cusco", 1]],
    })!;
    setActiveTripId(trip.id);

    render(<PackingList region={region} month={8} />);

    expect(screen.getByText(/Saving to/)).toBeTruthy();
    // Named and linked, so it's obvious where to go and check.
    const link = screen.getByRole("link", { name: "Peru in August" });
    expect(link.getAttribute("href")).toBe(`/trips/${trip.id}`);
  });

  it("a tick lands on that trip", () => {
    const trip = createTrip("Peru", { start: 8, stops: [["peru-cusco", 1]] })!;
    setActiveTripId(trip.id);

    render(<PackingList region={region} month={8} />);
    const box = document.querySelector<HTMLInputElement>(
      'input[type="checkbox"]'
    )!;
    const item = box.closest("label")!.textContent!.trim();
    fireEvent.click(box);

    expect(loadPacked(trip.id).has(packingKey(region.id, item))).toBe(true);
  });
});

describe("with an explicit trip", () => {
  it("uses it and does not mention the active trip", () => {
    const explicit = createTrip("Explicit", {
      start: 8,
      stops: [["peru-cusco", 1]],
    })!;
    const other = createTrip("Active", {
      start: 8,
      stops: [["peru-cusco", 1]],
    })!;
    setActiveTripId(other.id);

    render(<PackingList region={region} month={8} tripId={explicit.id} />);

    // On the trip page you already know which trip you're in; the attribution
    // line is only for the case where it isn't obvious.
    expect(screen.queryByText(/Saving to/)).toBeNull();

    const box = document.querySelector<HTMLInputElement>(
      'input[type="checkbox"]'
    )!;
    const item = box.closest("label")!.textContent!.trim();
    fireEvent.click(box);

    expect(loadPacked(explicit.id).size).toBe(1);
    expect(loadPacked(other.id).size).toBe(0);
  });
});
