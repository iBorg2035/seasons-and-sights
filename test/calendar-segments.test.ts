import { describe, it, expect } from "vitest";
import { trackPos, splitAtYearEnd, segmentRuns } from "@/lib/calendar-track";

/**
 * The calendar strip is twelve equal columns, so a date's x position is
 * `(monthIndex + dayFraction) / 12`. Getting this wrong is invisible in the
 * happy case and badly wrong at the year boundary, which is exactly where a
 * long trip lands.
 */

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const col = (n: number) => n / 12;

describe("trackPos", () => {
  it("puts the first of a month on its column edge", () => {
    expect(trackPos(d(2026, 1, 1))).toBeCloseTo(0, 10);
    expect(trackPos(d(2026, 7, 1))).toBeCloseTo(col(6), 10);
    expect(trackPos(d(2026, 12, 1))).toBeCloseTo(col(11), 10);
  });

  it("places a mid-month day partway across its column", () => {
    // Sep 16 of 30 → halfway through September's column.
    expect(trackPos(d(2026, 9, 16))).toBeCloseTo(col(8) + col(1) / 2, 10);
  });

  it("uses the real length of the month, not an average", () => {
    // Feb 15 in a non-leap year is 14/28 = exactly half of February.
    expect(trackPos(d(2027, 2, 15))).toBeCloseTo(col(1) + col(1) / 2, 10);
    // ...and 14/29 in a leap year, so the same date sits slightly earlier.
    expect(trackPos(d(2028, 2, 15))).toBeLessThan(trackPos(d(2027, 2, 15)));
  });

  it("never leaves the track", () => {
    for (const m of [1, 2, 6, 12]) {
      for (const day of [1, 15, 28]) {
        const p = trackPos(d(2026, m, day));
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThan(1);
      }
    }
  });
});

describe("splitAtYearEnd", () => {
  it("leaves a within-year range as one piece", () => {
    const pieces = splitAtYearEnd(d(2026, 9, 1), d(2026, 9, 15));
    expect(pieces).toHaveLength(1);
    expect(pieces[0].from).toBeCloseTo(col(8), 10);
  });

  it("splits a New Year crossing into two pieces", () => {
    // Without this the bar would run from December back to February —
    // a negative width, drawing nothing.
    const pieces = splitAtYearEnd(d(2026, 12, 20), d(2027, 2, 10));
    expect(pieces).toHaveLength(2);
    expect(pieces[0].to).toBe(1); // December runs to the end of the track
    expect(pieces[1].from).toBeCloseTo(0, 10); // January picks it up
    expect(pieces[1].to).toBeGreaterThan(0);
  });

  it("runs a stay ending exactly at midnight on Jan 1 to the track end", () => {
    // trackPos(Jan 1) is 0, so without the special case this piece would be
    // zero-width and December would vanish.
    const pieces = splitAtYearEnd(d(2026, 12, 1), d(2027, 1, 1));
    expect(pieces).toHaveLength(1);
    expect(pieces[0].from).toBeCloseTo(col(11), 10);
    expect(pieces[0].to).toBe(1);
  });

  it("produces only forward-running pieces", () => {
    const pieces = splitAtYearEnd(d(2026, 11, 15), d(2028, 3, 1));
    expect(pieces.length).toBeGreaterThan(0);
    for (const p of pieces) expect(p.to).toBeGreaterThan(p.from);
  });
});

describe("segmentRuns", () => {
  const seg = (from: number, to: number) =>
    ({ from, to, season: "dry", regionName: "X", festivals: [], label: "" }) as never;

  it("joins stays that share a boundary into one pill", () => {
    const runs = segmentRuns([seg(0.1, 0.2), seg(0.2, 0.3)]);
    expect(runs).toHaveLength(1);
    expect(runs[0].from).toBe(0.1);
    expect(runs[0].to).toBe(0.3);
    expect(runs[0].segments).toHaveLength(2);
  });

  it("joins across floating-point noise on the shared edge", () => {
    // Consecutive stays compute the same boundary by different divisions.
    const runs = segmentRuns([seg(0.1, 0.2), seg(0.2 + 1e-12, 0.3)]);
    expect(runs).toHaveLength(1);
  });

  it("keeps a real gap between stays as two pills", () => {
    const runs = segmentRuns([seg(0.1, 0.2), seg(0.5, 0.6)]);
    expect(runs).toHaveLength(2);
  });

  it("handles nothing to draw", () => {
    expect(segmentRuns([])).toEqual([]);
  });
});
