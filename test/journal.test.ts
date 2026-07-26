// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  listEntries,
  saveEntry,
  removeEntry,
  groupByDay,
  MAX_ENTRY_CHARS,
} from "@/lib/journal";
import { loadRecordsRaw } from "@/lib/trip-records";
import { stopOnDay, tripDateRanges, tripLegs } from "@/lib/trip-plan";
import { getSlimRegion } from "@/data/regions-slim";

const T0 = 1_700_000_000_000;

beforeEach(() => {
  localStorage.clear();
});

describe("saveEntry", () => {
  it("creates an entry and reads it back", () => {
    const saved = saveEntry("t", { day: "2026-09-05", text: "Machu Picchu" }, T0);

    expect(saved).not.toBeNull();
    expect(saved!.id).toBeTruthy();
    expect(listEntries("t")).toHaveLength(1);
    expect(listEntries("t")[0].text).toBe("Machu Picchu");
  });

  it("edits in place when given an existing id", () => {
    const first = saveEntry("t", { day: "2026-09-05", text: "draft" }, T0)!;
    saveEntry(
      "t",
      { id: first.id, day: "2026-09-05", text: "final" },
      T0 + 1000
    );

    const entries = listEntries("t");
    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe("final");
    expect(entries[0].updatedAt).toBe(T0 + 1000);
  });

  it("refuses blank text rather than storing an empty entry", () => {
    expect(saveEntry("t", { day: "2026-09-05", text: "   " }, T0)).toBeNull();
    expect(listEntries("t")).toEqual([]);
  });

  it("trims surrounding whitespace", () => {
    const saved = saveEntry("t", { day: "2026-09-05", text: "  hi  " }, T0)!;
    expect(saved.text).toBe("hi");
  });

  it("refuses an over-long entry instead of truncating it", () => {
    const tooLong = "x".repeat(MAX_ENTRY_CHARS + 1);
    expect(saveEntry("t", { day: "2026-09-05", text: tooLong }, T0)).toBeNull();
    // Silently dropping the tail of what someone wrote would be worse than
    // refusing, so nothing is stored at all.
    expect(listEntries("t")).toEqual([]);

    const atLimit = "x".repeat(MAX_ENTRY_CHARS);
    expect(saveEntry("t", { day: "2026-09-05", text: atLimit }, T0)).not.toBeNull();
  });

  it("keeps entries on separate trips apart", () => {
    saveEntry("trip-a", { day: "2026-09-05", text: "a" }, T0);
    expect(listEntries("trip-b")).toEqual([]);
    expect(listEntries("trip-a")).toHaveLength(1);
  });
});

describe("listEntries", () => {
  it("returns newest day first", () => {
    saveEntry("t", { day: "2026-09-01", text: "first" }, T0);
    saveEntry("t", { day: "2026-09-10", text: "later" }, T0 + 1);
    saveEntry("t", { day: "2026-09-05", text: "middle" }, T0 + 2);

    expect(listEntries("t").map((e) => e.day)).toEqual([
      "2026-09-10",
      "2026-09-05",
      "2026-09-01",
    ]);
  });

  it("breaks same-day ties by most recently edited", () => {
    saveEntry("t", { day: "2026-09-05", text: "older" }, T0);
    saveEntry("t", { day: "2026-09-05", text: "newer" }, T0 + 1000);

    expect(listEntries("t").map((e) => e.text)).toEqual(["newer", "older"]);
  });
});

describe("removeEntry", () => {
  it("hides the entry and leaves a tombstone so it can't resurrect", () => {
    const saved = saveEntry("t", { day: "2026-09-05", text: "oops" }, T0)!;
    removeEntry("t", saved.id);

    expect(listEntries("t")).toEqual([]);
    const raw = loadRecordsRaw("journal", "t");
    expect(raw).toHaveLength(1);
    expect(raw[0].deletedAt).toBeTruthy();
  });

  it("does not leave the deleted text behind in storage", () => {
    const saved = saveEntry("t", { day: "2026-09-05", text: "private thing" }, T0)!;
    removeEntry("t", saved.id);
    expect(localStorage.getItem("seasons-journal:t")).not.toContain("private thing");
  });
});

describe("groupByDay", () => {
  it("buckets by day, newest first, preserving within-day order", () => {
    saveEntry("t", { day: "2026-09-05", text: "b" }, T0);
    saveEntry("t", { day: "2026-09-05", text: "a" }, T0 + 1000);
    saveEntry("t", { day: "2026-09-01", text: "c" }, T0 + 2000);

    const groups = groupByDay(listEntries("t"));

    expect(groups.map((g) => g.day)).toEqual(["2026-09-05", "2026-09-01"]);
    expect(groups[0].entries.map((e) => e.text)).toEqual(["a", "b"]);
    expect(groups[1].entries).toHaveLength(1);
  });

  it("returns nothing for an empty journal", () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe("stopOnDay", () => {
  const lookup = (id: string) => getSlimRegion(id);
  const trip = {
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
  const legs = tripLegs(trip, lookup);
  const ranges = tripDateRanges(trip, legs);

  it("names the destination you were in that day", () => {
    expect(stopOnDay(legs, ranges, "2026-09-05")?.id).toBe("peru-cusco");
    expect(stopOnDay(legs, ranges, "2026-10-02")?.id).toBe("thailand-bangkok");
  });

  it("treats ranges as half-open, so a travel day belongs to one stop only", () => {
    // Sep 3 is the arrival day (inclusive); Sep 12 is the exclusive end, so it
    // is NOT part of the Cusco stay — same rule as legDateRanges and buildIcs.
    expect(stopOnDay(legs, ranges, "2026-09-03")?.id).toBe("peru-cusco");
    expect(stopOnDay(legs, ranges, "2026-09-11")?.id).toBe("peru-cusco");
    expect(stopOnDay(legs, ranges, "2026-09-12")).toBeNull();
  });

  it("returns null in the gap between stays and outside the trip", () => {
    expect(stopOnDay(legs, ranges, "2026-09-20")).toBeNull();
    expect(stopOnDay(legs, ranges, "2026-01-01")).toBeNull();
    expect(stopOnDay(legs, ranges, "2027-01-01")).toBeNull();
  });

  it("skips undated stops rather than mis-attributing a day to them", () => {
    const partial = { ...trip, bookedDates: [null, trip.bookedDates[1]] };
    const partialLegs = tripLegs(partial, lookup);
    const partialRanges = tripDateRanges(partial, partialLegs);

    expect(stopOnDay(partialLegs, partialRanges, "2026-09-05")).toBeNull();
    expect(stopOnDay(partialLegs, partialRanges, "2026-10-02")?.id).toBe(
      "thailand-bangkok"
    );
  });

  it("works for a planning trip, using its derived ranges", () => {
    const planned = { start: 9, stops: trip.stops };
    const now = new Date(2026, 5, 15);
    const plannedLegs = tripLegs(planned, lookup, now);
    const plannedRanges = tripDateRanges(planned, plannedLegs, now);

    // Derived ranges are contiguous whole months from September.
    expect(stopOnDay(plannedLegs, plannedRanges, "2026-09-15")).not.toBeNull();
  });
});
