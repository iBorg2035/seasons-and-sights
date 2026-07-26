import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  isFlexibleStart,
  resolveStartMonth,
  tripToStops,
  tripLegs,
} from "@/lib/trip-plan";
import { legDateRanges, monthOf } from "@/lib/season";
import { getSlimRegion } from "@/data/regions-slim";

const JUNE = new Date(2026, 5, 15); // 2026-06-15, month 6

describe("resolveStartMonth", () => {
  it("passes through a real month", () => {
    expect(resolveStartMonth(1, JUNE)).toBe(1);
    expect(resolveStartMonth(12, JUNE)).toBe(12);
    expect(resolveStartMonth(3, JUNE)).toBe(3);
  });

  it("falls back to the current month for anything that isn't a month", () => {
    // 0 is the app's "flexible" sentinel; the rest are corruption/absence.
    for (const bad of [0, 13, -1, 1.5, NaN, undefined]) {
      expect(resolveStartMonth(bad, JUNE)).toBe(6);
    }
  });

  it("defaults `now` to the real current month", () => {
    expect(resolveStartMonth(0)).toBe(monthOf());
  });
});

describe("isFlexibleStart", () => {
  it("is true only when start does not name a month", () => {
    expect(isFlexibleStart(0)).toBe(true);
    expect(isFlexibleStart(13)).toBe(true);
    expect(isFlexibleStart(undefined)).toBe(true);
    expect(isFlexibleStart(NaN)).toBe(true);
    expect(isFlexibleStart(6)).toBe(false);
  });
});

describe("tripToStops", () => {
  const lookup = (id: string) => getSlimRegion(id);

  it("resolves ids and preserves order", () => {
    const stops = tripToStops(
      { start: 6, stops: [["thailand-bangkok", 2], ["japan-kyoto", 1]] },
      lookup
    );
    expect(stops.map((s) => s.region.id)).toEqual([
      "thailand-bangkok",
      "japan-kyoto",
    ]);
    expect(stops.map((s) => s.durationMonths)).toEqual([2, 1]);
  });

  it("drops ids the dataset no longer knows", () => {
    const stops = tripToStops(
      { start: 6, stops: [["nope-not-a-region", 2], ["japan-kyoto", 1]] },
      lookup
    );
    expect(stops.map((s) => s.region.id)).toEqual(["japan-kyoto"]);
  });

  it("clamps a corrupt duration instead of planning NaN months", () => {
    const stops = tripToStops(
      {
        start: 6,
        stops: [
          ["thailand-bangkok", 0],
          ["peru-cusco", NaN],
          ["japan-kyoto", -3],
        ],
      },
      lookup
    );
    // A corrupt value becomes a month, not a day — a one-day stay is small
    // enough to be invisible, so a broken row would vanish from the itinerary
    // rather than look obviously wrong.
    expect(stops.map((s) => s.durationMonths)).toEqual([1, 1, 1]);
  });

  it("keeps a fractional duration rather than rounding it to a month", () => {
    // This assertion used to expect 2.4 → 2. Rounding to whole months is
    // exactly what sub-month stays remove: a fortnight would have become a
    // month. Corrupt values are still clamped (above); valid fractions aren't.
    const stops = tripToStops(
      {
        start: 6,
        stops: [
          ["japan-kyoto", 2.4],
          ["peru-cusco", 0.5],
        ],
      },
      lookup
    );
    expect(stops.map((s) => s.durationMonths)).toEqual([2.4, 0.5]);
  });
});

describe("tripLegs", () => {
  const lookup = (id: string) => getSlimRegion(id);

  it("plans from the resolved start month", () => {
    const legs = tripLegs(
      { start: 6, stops: [["peru-cusco", 2]] },
      lookup,
      JUNE
    );
    expect(legs).toHaveLength(1);
    expect(legs[0].months).toEqual([6, 7]);
  });

  it("returns an empty plan when nothing resolves", () => {
    expect(tripLegs({ start: 6, stops: [["nope", 1]] }, lookup, JUNE)).toEqual(
      []
    );
  });
});

/**
 * Regression: the public shared-trip view used to pass `state.start` straight
 * into planItinerary/legDateRanges. A trip shared with a flexible start
 * arrives as `start: 0`, which is not a month — the planner indexed month zero
 * and rendered nonsense dates. Transition-style per docs/QA-JOURNEYS.md:
 * flexible → fixed → back to flexible, asserting each state on its own.
 */
describe("shared trip with a flexible start (regression)", () => {
  const lookup = (id: string) => getSlimRegion(id);
  const stops: [string, number][] = [["peru-cusco", 2]];

  it("anchors a flexible start to the current month, not month zero", () => {
    const legs = tripLegs({ start: 0, stops }, lookup, JUNE);
    const ranges = legDateRanges(resolveStartMonth(0, JUNE), legs, JUNE);

    expect(legs[0].months).toEqual([6, 7]);
    expect(ranges[0].start.getMonth()).toBe(5); // June, 0-based
    expect(ranges[0].start.getFullYear()).toBe(2026);
    // The old bug produced a month-zero anchor, i.e. December of the prior year.
    expect(ranges[0].start.getFullYear()).not.toBe(2025);
  });

  it("honors a real start month", () => {
    const legs = tripLegs({ start: 3, stops }, lookup, JUNE);
    const ranges = legDateRanges(resolveStartMonth(3, JUNE), legs, JUNE);
    expect(legs[0].months).toEqual([3, 4]);
    expect(ranges[0].start.getMonth()).toBe(2); // March
  });

  it("re-derives when it goes back to flexible rather than sticking", () => {
    const legs = tripLegs({ start: 0, stops }, lookup, JUNE);
    expect(legs[0].months).toEqual([6, 7]);
  });
});

/**
 * Bundle hygiene (AGENTS.md): client views must never reach the heavy
 * `@/data/regions` module. trip-plan.ts takes an injected lookup precisely so
 * the slim binding stays clean — assert that statically rather than trusting it.
 */
describe("bundle hygiene", () => {
  it("neither trip-plan module imports the heavy region dataset", () => {
    for (const file of ["src/lib/trip-plan.ts", "src/lib/trip-plan-slim.ts"]) {
      const src = readFileSync(file, "utf8");
      expect(src).not.toMatch(/@\/data\/regions["']/);
      expect(src).not.toMatch(/@\/data\/(sights|toolkits|events)["']/);
    }
  });
});
