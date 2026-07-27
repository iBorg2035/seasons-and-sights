import { describe, it, expect } from "vitest";
import {
  formatStay,
  WEEK_MONTHS,
  planItinerary,
  legDateRanges,
  estimateTripCost,
  estimateLegCost,
  type PlannerStop,
} from "@/lib/season";
import { getSlimRegion } from "@/data/regions-slim";

/**
 * The planner now walks dates rather than month numbers, so stays can be
 * shorter than a month. The load-bearing property is that this changed
 * NOTHING for whole-month trips — those are what every existing trip is made
 * of, and a silent shift would re-season people's saved itineraries.
 */

const cusco = getSlimRegion("peru-cusco")!;
const kyoto = getSlimRegion("japan-kyoto")!;
const bangkok = getSlimRegion("thailand-bangkok")!;

const stop = (region: typeof cusco, durationMonths: number): PlannerStop<typeof cusco> => ({
  region,
  durationMonths,
});

const FROM = new Date(2026, 5, 15); // mid-June
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("whole-month itineraries are unchanged", () => {
  it("keeps months, order and cost for a 1/2/3-month trip", () => {
    const legs = planItinerary(
      [stop(cusco, 1), stop(kyoto, 2), stop(bangkok, 3)],
      9
    );

    // Six months of stays, each occupying whole calendar months back to back.
    expect(legs.reduce((n, l) => n + l.months.length, 0)).toBe(6);
    expect(legs.every((l) => Number.isInteger(l.durationMonths!))).toBe(true);
    // Whole-month legs still carry no explicit day count, so estimateLegCost
    // keeps using months.length × 30 exactly as it always did.
    expect(legs.every((l) => l.days === undefined)).toBe(true);
    expect(estimateTripCost(legs)).toBe(
      legs.reduce(
        (sum, l) =>
          sum +
          l.months.length *
            30 *
            ((l.region as { dailyBudget?: number }).dailyBudget ?? 0),
        0
      )
    );
  });

  it("advances whole months by calendar, not by 30 days", () => {
    // The trap in walking dates: Jan 1 + 30 days is Jan 31, not Feb 1. A
    // one-month January stay has to end on Feb 1.
    const legs = planItinerary([stop(cusco, 1), stop(kyoto, 1)], 1);
    const ranges = legDateRanges(1, legs, FROM);

    expect(iso(ranges[0].start)).toBe("2027-01-01");
    expect(iso(ranges[0].end)).toBe("2027-02-01");
    expect(iso(ranges[1].end)).toBe("2027-03-01");
  });

  it("wraps the year without losing a month", () => {
    const legs = planItinerary([stop(cusco, 3)], 11);
    expect(legs[0].months).toEqual([11, 12, 1]);
  });
});

describe("sub-month stays", () => {
  it("plans a fortnight as half a month, not a whole one", () => {
    const legs = planItinerary([stop(cusco, 0.5)], 9);
    const ranges = legDateRanges(9, legs, FROM);

    expect(iso(ranges[0].start)).toBe("2026-09-01");
    expect(iso(ranges[0].end)).toBe("2026-09-16"); // +15 days
    expect(legs[0].months).toEqual([9]);
  });

  it("advances a week by seven days", () => {
    const week = 7 / 30;
    const legs = planItinerary([stop(cusco, week), stop(kyoto, week)], 9);
    const ranges = legDateRanges(9, legs, FROM);

    expect(iso(ranges[0].start)).toBe("2026-09-01");
    expect(iso(ranges[0].end)).toBe("2026-09-08");
    expect(iso(ranges[1].end)).toBe("2026-09-15");
  });

  it("chains sub-month stays onto whole ones correctly", () => {
    // 2w + 2w should land the third stop exactly where a 1-month stop would.
    const split = planItinerary(
      [stop(cusco, 0.5), stop(cusco, 0.5), stop(kyoto, 1)],
      9
    );
    const whole = planItinerary([stop(cusco, 1), stop(kyoto, 1)], 9);

    const splitRanges = legDateRanges(9, split, FROM);
    const wholeRanges = legDateRanges(9, whole, FROM);

    // Sep 1 + 15 + 15 = Oct 1, the same day the single month ends.
    expect(iso(splitRanges[2].start)).toBe(iso(wholeRanges[1].start));
  });

  it("counts a stay that straddles a month boundary as touching both", () => {
    const legs = planItinerary([stop(cusco, 1), stop(kyoto, 0.5)], 9);
    // Cusco Sep 1 → Oct 1, then Kyoto Oct 1 → Oct 16: one month each.
    expect(legs[0].months).toEqual([9]);
    expect(legs[1].months).toEqual([10]);
  });

  it("costs a fortnight as half a month", () => {
    const [leg] = planItinerary([stop(cusco, 0.5)], 9);
    expect(leg.days).toBe(15);
    expect(estimateLegCost(leg)).toBe(15 * 50);
    // Without the explicit day count this would fall back to months.length ×
    // 30 and charge a full month for a two-week stay.
    expect(estimateLegCost(leg)).toBeLessThan(leg.months.length * 30 * 50);
  });
});

describe("formatStay", () => {
  it("renders whole months as months", () => {
    expect(formatStay(1)).toBe("1m");
    expect(formatStay(3)).toBe("3m");
  });

  it("renders the week options as weeks", () => {
    // The values the stay picker actually offers. Without this, a fortnight
    // renders as "0.4666666666666667m".
    expect(formatStay(WEEK_MONTHS)).toBe("1w");
    expect(formatStay(WEEK_MONTHS * 2)).toBe("2w");
  });

  it("falls back to days for a length that is neither", () => {
    expect(formatStay(0.5)).toBe("15d");
  });

  it("never leaks a raw fraction", () => {
    for (const m of [WEEK_MONTHS, WEEK_MONTHS * 2, 0.5, 1, 2, 2.4, 3]) {
      expect(formatStay(m)).not.toMatch(/\./);
    }
  });
});

describe("fractional cursors don't corrupt integer-month assumptions", () => {
  it("clamps a whole-month advance instead of overflowing into the next month", () => {
    // Two fortnights from Jan 1 leave the cursor on Jan 29. `setMonth(+1)`
    // then overflows to Mar 1, because Feb 29 doesn't exist in 2027 — turning
    // a one-month stay into 31 days and handing it an extra month of fit.
    const legs = planItinerary(
      [stop(cusco, WEEK_MONTHS * 2), stop(cusco, WEEK_MONTHS * 2), stop(kyoto, 1)],
      1
    );
    const ranges = legDateRanges(1, legs, FROM);

    expect(iso(ranges[2].start)).toBe("2027-01-29");
    expect(iso(ranges[2].end)).toBe("2027-02-28");
    expect(legs[2].months).toEqual([1, 2]);
  });

  it("still advances a mid-month cursor normally when no overflow occurs", () => {
    const legs = planItinerary([stop(cusco, WEEK_MONTHS * 2), stop(kyoto, 1)], 9);
    const ranges = legDateRanges(9, legs, FROM);

    expect(iso(ranges[1].start)).toBe("2026-09-15");
    expect(iso(ranges[1].end)).toBe("2026-10-15");
  });
});
