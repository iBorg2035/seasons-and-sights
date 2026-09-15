// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { formatLegStay, legDays } from "@/lib/season";
import { tripSlimLegs } from "@/lib/trip-plan-slim";
import type { SavedTripLite } from "@/lib/saved-trips";

/**
 * Booked stays used to be labelled by how many calendar months they touch, so
 * every stop that fits inside one month read "1m" — an 11-night stay on Samui,
 * 11 in Chiang Mai and a week in Bangkok all showed as a month each, and the
 * route header claimed "3 months total" for a 29-night trip.
 */

// Leaflet can't run under jsdom, and the map itself isn't what's under test.
vi.mock("@/components/RouteMap", () => ({ RouteMap: () => null }));

const { RouteSection } = await import("@/components/RouteSection");
const { MapSection } = await import("@/components/MapSection");

const thailand: SavedTripLite = {
  id: "thai-oct",
  name: "Thailand, October",
  start: 10,
  stops: [["thailand-kohsamui", 11 / 30], ["thailand-chiangmai", 11 / 30], ["thailand-bangkok", 7 / 30]],
  mode: "booked",
  bookedDates: [
    { start: "2026-10-01", end: "2026-10-12" },
    { start: "2026-10-12", end: "2026-10-23" },
    { start: "2026-10-23", end: "2026-10-30" },
  ],
};

describe("leg length helpers", () => {
  it("labels booked legs by their real nights", () => {
    const legs = tripSlimLegs(thailand);
    expect(legs.map(legDays)).toEqual([11, 11, 7]);
    expect(legs.map(formatLegStay)).toEqual(["11d", "11d", "1w"]);
  });

  it("keeps planning stays labelled the way they were chosen", () => {
    expect(formatLegStay({ durationMonths: 2, months: [10, 11] })).toBe("2m");
    expect(formatLegStay({ durationMonths: 14 / 30, months: [10, 11], days: 14 })).toBe("2w");
    expect(legDays({ durationMonths: 2, months: [10, 11] })).toBe(60);
  });

  it("shows a booked stop with no dates as undated, not as zero", () => {
    const partly: SavedTripLite = { ...thailand, bookedDates: [thailand.bookedDates![0], null, null] };
    const legs = tripSlimLegs(partly);
    expect(formatLegStay(legs[1])).toBe("dates TBD");
    expect(legDays(legs[1])).toBe(0);
  });
});

describe("booked trip sections", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("route chips and total show nights, not months", () => {
    const { container } = render(<RouteSection trip={thailand} />);
    const text = container.textContent ?? "";
    expect(text).toContain("Koh Samui· 11d");
    expect(text).toContain("Chiang Mai· 11d");
    expect(text).toContain("Bangkok· 1w");
    expect(text).toContain("29 days total");
    expect(text).not.toMatch(/· 1m/);
    expect(text).not.toContain("3 months total");
  });

  it("map timeline shows nights and the real start date", () => {
    const { container } = render(<MapSection trip={thailand} />);
    const text = container.textContent ?? "";
    expect(text).toContain("(11d)");
    expect(text).toContain("(1w)");
    expect(text).toContain("29 days · from Oct 1");
    expect(text).not.toContain("(1m)");
  });

  it("sizes the timeline segments by nights", () => {
    const { container } = render(<RouteSection trip={thailand} />);
    const grows = [...container.querySelectorAll<HTMLElement>("div[style]")]
      .map((el) => el.style.flexGrow)
      .filter(Boolean);
    expect(grows).toEqual(["11", "11", "7"]);
  });
});
