// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  createTrip,
  getTrip,
  updateTrip,
  moveStop,
  removeStopAt,
  isBooked,
  type BookedRange,
} from "@/lib/saved-trips";

/**
 * `bookedDates` is index-aligned with `stops`, which is the fragile part: any
 * reorder or removal that touches one array and not the other silently moves
 * every date onto the wrong destination. These are transition tests per
 * docs/QA-JOURNEYS.md — do X, then assert the date is still on the stop that
 * owns it, rather than just asserting a shape.
 */

const BKK: BookedRange = { start: "2026-07-03", end: "2026-07-17" };
const KYO: BookedRange = { start: "2026-07-17", end: "2026-08-01" };

function bookedTrip() {
  const t = createTrip("Booked", {
    stops: [
      ["thailand-bangkok", 1],
      ["japan-kyoto", 1],
      ["peru-cusco", 1],
    ],
    mode: "booked",
    bookedDates: [BKK, KYO, null],
  })!;
  return t.id;
}

beforeEach(() => localStorage.clear());

describe("booked-date storage", () => {
  it("defaults to planning mode, with no mode or dates on a plain trip", () => {
    const t = createTrip("Plain")!;
    expect(t.mode).toBeUndefined();
    expect(t.bookedDates).toBeUndefined();
    expect(isBooked(t)).toBe(false);
  });

  it("round-trips mode and dates through storage", () => {
    const id = bookedTrip();
    const t = getTrip(id)!;
    expect(isBooked(t)).toBe(true);
    expect(t.bookedDates).toEqual([BKK, KYO, null]);
  });

  it("leaves a legacy trip (no mode, no dates) untouched on read/write", () => {
    const t = createTrip("Legacy", { stops: [["japan-kyoto", 2]] })!;
    updateTrip(t.id, (x) => {
      x.name = "Renamed";
    });
    const after = getTrip(t.id)!;
    expect(after.name).toBe("Renamed");
    expect(after).not.toHaveProperty("mode");
    expect(after).not.toHaveProperty("bookedDates");
  });
});

describe("dates follow their stop", () => {
  it("keeps each date with its own stop when reordering", () => {
    const id = bookedTrip();
    // Move Bangkok (index 0, dated) to the end.
    updateTrip(id, (t) => moveStop(t, 0, 2));

    const t = getTrip(id)!;
    expect(t.stops.map(([s]) => s)).toEqual([
      "japan-kyoto",
      "peru-cusco",
      "thailand-bangkok",
    ]);
    // Bangkok's dates moved with it; Kyoto kept its own; Cusco stayed undated.
    expect(t.bookedDates).toEqual([KYO, null, BKK]);
  });

  it("drops the right date when removing a stop from the middle", () => {
    const id = bookedTrip();
    updateTrip(id, (t) => removeStopAt(t, 1)); // remove Kyoto

    const t = getTrip(id)!;
    expect(t.stops.map(([s]) => s)).toEqual([
      "thailand-bangkok",
      "peru-cusco",
    ]);
    expect(t.bookedDates).toEqual([BKK, null]);
  });

  it("pads with null when a stop is appended, so lengths never desync", () => {
    const id = bookedTrip();
    updateTrip(id, (t) => {
      t.stops.push(["indonesia-bali", 1]);
    });

    const t = getTrip(id)!;
    expect(t.stops).toHaveLength(4);
    expect(t.bookedDates).toHaveLength(4);
    expect(t.bookedDates?.[3]).toBeNull();
  });

  it("re-aligns even when a caller splices stops directly and forgets the dates", () => {
    const id = bookedTrip();
    // Deliberately the wrong way round — the safety net in updateTrip should
    // still leave the arrays the same length rather than silently desynced.
    updateTrip(id, (t) => {
      t.stops.splice(2, 1);
    });

    const t = getTrip(id)!;
    expect(t.bookedDates).toHaveLength(t.stops.length);
  });

  it("drops the array once the last date is cleared", () => {
    const id = bookedTrip();
    updateTrip(id, (t) => {
      t.bookedDates = [null, null, null];
    });
    expect(getTrip(id)!.bookedDates).toBeUndefined();
  });
});

describe("cross-trip isolation", () => {
  it("dating one trip leaves another trip's dates alone", () => {
    const a = bookedTrip();
    const b = createTrip("Other", { stops: [["japan-kyoto", 1]] })!.id;

    // B is a fresh planning trip — it must not have picked anything up from A.
    expect(getTrip(b)!.bookedDates).toBeUndefined();
    expect(isBooked(getTrip(b)!)).toBe(false);

    updateTrip(b, (t) => {
      t.mode = "booked";
      t.bookedDates = [{ start: "2026-09-01", end: "2026-09-10" }];
    });

    // Back to A: untouched.
    const backToA = getTrip(a)!;
    expect(backToA.bookedDates).toEqual([BKK, KYO, null]);
    expect(getTrip(b)!.bookedDates).toEqual([
      { start: "2026-09-01", end: "2026-09-10" },
    ]);
  });
});
