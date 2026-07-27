// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { climateForMonth, wrapMonth, WEEK_MONTHS } from "@/lib/season";
import { getSlimRegion } from "@/data/regions-slim";

/**
 * TripCard walks stops with a running month cursor to colour its timeline.
 * That cursor is a plain number, so a sub-month stay makes it fractional —
 * and `region.months[9.47]` is undefined, which silently turns every stop
 * after the first week-long one into "shoulder".
 */

const cusco = getSlimRegion("peru-cusco")!;

/** Mirrors TripCard's cursor walk. */
function seasonsAlong(stops: [string, number][], startMonth: number): string[] {
  let cursor = startMonth;
  return stops.map(([id, duration]) => {
    const region = getSlimRegion(id);
    const season = region
      ? climateForMonth(region, wrapMonth(Math.round(cursor))).season
      : "shoulder";
    cursor += duration;
    return season;
  });
}

describe("trip card season walk", () => {
  it("keeps reading real seasons after a sub-month stay", () => {
    const seasons = seasonsAlong(
      [
        ["peru-cusco", WEEK_MONTHS * 2],
        ["peru-cusco", 1],
      ],
      6 // June: Cusco is dry
    );

    expect(seasons[0]).toBe(climateForMonth(cusco, 6).season);
    // The bug: a fractional cursor made this "shoulder" regardless of truth.
    expect(seasons[1]).toBe(climateForMonth(cusco, 6).season);
    expect(seasons[1]).not.toBe("shoulder");
  });

  it("never looks a region up by a fractional month", () => {
    let cursor = 6;
    for (const d of [WEEK_MONTHS, WEEK_MONTHS * 2, 1, 2]) {
      const month = wrapMonth(Math.round(cursor));
      expect(Number.isInteger(month)).toBe(true);
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
      cursor += d;
    }
  });
});
