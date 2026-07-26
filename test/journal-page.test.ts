// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { saveEntry, listEntries, JOURNAL_ENTITY } from "@/lib/journal";
import { saveExpense, listExpenses, EXPENSE_ENTITY } from "@/lib/expenses";
import { clearRecords, loadRecordsRaw } from "@/lib/trip-records";
import { findActiveLeg, formatDay } from "@/lib/season";
import { tripDateRanges, tripLegs } from "@/lib/trip-plan";
import { getSlimRegion } from "@/data/regions-slim";

/**
 * The page-level behaviours: cross-trip isolation (the checklist bug's shape,
 * on more personal data), the new-entry day default, and the trip-delete
 * cleanup. Deliberately exercised through the same functions the page calls.
 */

const lookup = (id: string) => getSlimRegion(id);
const T0 = 1_700_000_000_000;

/** Mirrors defaultDayFor in TripJournalView. */
function defaultDayFor(
  ranges: ({ start: Date; end: Date } | null)[],
  now: Date
): string {
  if (findActiveLeg(ranges, now)) return formatDay(now);
  const firstDated = ranges.find((r) => r != null);
  return firstDated ? formatDay(firstDated.start) : formatDay(now);
}

const bookedTrip = {
  start: 9,
  stops: [
    ["peru-cusco", 1],
    ["thailand-bangkok", 1],
  ] as [string, number][],
  mode: "booked" as const,
  bookedDates: [
    { start: "2026-09-03", end: "2026-09-12" },
    { start: "2026-10-01", end: "2026-10-08" },
  ],
};

function rangesFor(trip: Parameters<typeof tripLegs>[0], now?: Date) {
  const legs = tripLegs(trip, lookup, now);
  return tripDateRanges(trip, legs, now);
}

beforeEach(() => {
  localStorage.clear();
});

describe("cross-trip isolation", () => {
  it("keeps one trip's journal and expenses off another trip", () => {
    saveEntry("trip-a", { day: "2026-09-05", text: "Cusco was cold" }, T0);
    saveExpense("trip-a", { day: "2026-09-05", amountCents: 1250, category: "food" }, T0);

    // Switch to trip B — it must be empty, not showing A's content.
    expect(listEntries("trip-b")).toEqual([]);
    expect(listExpenses("trip-b")).toEqual([]);

    // Write on B, then switch back — A must still have exactly its own.
    saveEntry("trip-b", { day: "2026-10-01", text: "Bangkok heat" }, T0);
    saveExpense("trip-b", { day: "2026-10-01", amountCents: 500, category: "transport" }, T0);

    expect(listEntries("trip-a").map((e) => e.text)).toEqual(["Cusco was cold"]);
    expect(listExpenses("trip-a")).toHaveLength(1);
    expect(listEntries("trip-b").map((e) => e.text)).toEqual(["Bangkok heat"]);
  });
});

describe("new-entry day default", () => {
  it("uses today while the trip is under way", () => {
    const now = new Date(2026, 8, 6); // Sep 6, inside the Cusco stay
    const ranges = rangesFor(bookedTrip, now);
    expect(defaultDayFor(ranges, now)).toBe("2026-09-06");
  });

  it("uses the trip's first dated day when it isn't under way", () => {
    // Writing up a finished trip should start at its beginning, not at
    // today's unrelated date.
    const now = new Date(2026, 11, 25);
    const ranges = rangesFor(bookedTrip, now);
    expect(defaultDayFor(ranges, now)).toBe("2026-09-03");
  });

  it("skips undated leading stops when picking the first day", () => {
    const partial = { ...bookedTrip, bookedDates: [null, bookedTrip.bookedDates[1]] };
    const now = new Date(2026, 11, 25);
    expect(defaultDayFor(rangesFor(partial, now), now)).toBe("2026-10-01");
  });

  it("falls back to today when the trip has no dates at all", () => {
    const now = new Date(2026, 5, 15);
    const empty = { start: 9, stops: [] as [string, number][] };
    expect(defaultDayFor(rangesFor(empty, now), now)).toBe("2026-06-15");
  });
});

describe("trip deletion cleanup", () => {
  it("takes the trip's journal and expenses with it", () => {
    saveEntry("trip-a", { day: "2026-09-05", text: "something private" }, T0);
    saveExpense("trip-a", { day: "2026-09-05", amountCents: 100, category: "food" }, T0);
    saveEntry("trip-b", { day: "2026-09-05", text: "other trip" }, T0);

    clearRecords(JOURNAL_ENTITY, "trip-a");
    clearRecords(EXPENSE_ENTITY, "trip-a");

    // Gone entirely, not just hidden — a tombstone would keep the row around
    // for a trip that no longer exists.
    expect(loadRecordsRaw(JOURNAL_ENTITY, "trip-a")).toEqual([]);
    expect(loadRecordsRaw(EXPENSE_ENTITY, "trip-a")).toEqual([]);
    expect(localStorage.getItem("seasons-journal:trip-a")).toBeNull();

    // The other trip is untouched.
    expect(listEntries("trip-b")).toHaveLength(1);
  });
});
