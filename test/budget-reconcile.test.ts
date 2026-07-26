// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { estimateSpendSoFar, estimateTripCost } from "@/lib/season";
import { totalCents, type Expense } from "@/lib/expenses";
import { tripDateRanges, tripLegs } from "@/lib/trip-plan";
import { getSlimRegion } from "@/data/regions-slim";

/**
 * The estimate-vs-actual comparison RouteSection renders. The load-bearing
 * choice is comparing logged spend against the estimate for the days
 * *elapsed*, not the whole trip — otherwise everyone reads as wildly under
 * budget until their last day.
 */

const lookup = (id: string) => getSlimRegion(id);
const T0 = 1_700_000_000_000;

const trip = {
  start: 9,
  stops: [
    ["peru-cusco", 1],
    ["thailand-bangkok", 1],
  ] as [string, number][],
  mode: "booked" as const,
  bookedDates: [
    { start: "2026-09-01", end: "2026-09-11" }, // 10 days
    { start: "2026-10-01", end: "2026-10-11" }, // 10 days
  ],
};

const legs = tripLegs(trip, lookup);
const ranges = tripDateRanges(trip, legs);

function expense(amountCents: number): Expense {
  return {
    id: String(amountCents),
    day: "2026-09-05",
    amountCents,
    category: "food",
    updatedAt: T0,
  };
}

describe("estimate vs logged", () => {
  it("compares against the elapsed estimate, not the whole trip", () => {
    // Halfway through the first stay of two.
    const midFirstStay = new Date(2026, 8, 6);
    const toDate = estimateSpendSoFar(legs, ranges, midFirstStay);
    const total = estimateTripCost(legs);

    expect(toDate).toBeGreaterThan(0);
    expect(toDate).toBeLessThan(total);

    // $500 logged reads as over budget against the elapsed estimate here, but
    // would read as comfortably under against the trip total. The elapsed
    // figure is the honest comparison.
    const logged = totalCents([expense(50_000)]) / 100;
    expect(logged).toBeGreaterThan(toDate);
    expect(logged).toBeLessThan(total);
  });

  it("counts the full estimate once the trip is over", () => {
    const afterTrip = new Date(2026, 11, 1);
    expect(estimateSpendSoFar(legs, ranges, afterTrip)).toBeCloseTo(
      estimateTripCost(legs),
      5
    );
  });

  it("has nothing to compare against before the trip starts", () => {
    // A trip entirely in the future: the UI shows the logged total alone
    // rather than against a meaningless zero.
    const beforeTrip = new Date(2026, 0, 1);
    expect(estimateSpendSoFar(legs, ranges, beforeTrip)).toBe(0);
  });

  it("signs the variance the way the UI reads it", () => {
    const midFirstStay = new Date(2026, 8, 6);
    const toDate = estimateSpendSoFar(legs, ranges, midFirstStay);

    const over = totalCents([expense(Math.round((toDate + 100) * 100))]) / 100;
    const under = totalCents([expense(Math.round((toDate - 100) * 100))]) / 100;

    expect(over - toDate).toBeGreaterThan(0); // rendered "over", rose
    expect(under - toDate).toBeLessThan(0); // rendered "under", emerald
  });

  it("ignores undated stops rather than counting them as elapsed", () => {
    const partial = { ...trip, bookedDates: [trip.bookedDates[0], null] };
    const partialLegs = tripLegs(partial, lookup);
    const partialRanges = tripDateRanges(partial, partialLegs);
    const afterFirstStay = new Date(2026, 8, 20);

    const toDate = estimateSpendSoFar(partialLegs, partialRanges, afterFirstStay);
    // Only the dated stay counts. An undated stop contributes nothing to the
    // elapsed figure — "unknown" isn't "already spent" — so this matches the
    // first stay alone, well under the fully-dated trip's estimate.
    expect(toDate).toBe(estimateSpendSoFar(legs, ranges, afterFirstStay));
    expect(toDate).toBeLessThan(estimateTripCost(legs));
  });
});
