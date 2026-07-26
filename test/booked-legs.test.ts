import { describe, it, expect } from "vitest";
import {
  bookedLegs,
  parseDay,
  planItinerary,
  estimateLegCost,
  estimateTripCost,
  estimateSpendSoFar,
  findActiveLeg,
  type DateRange,
} from "@/lib/season";
import { tripDateRanges, bookingIssues, tripLegs } from "@/lib/trip-plan";
import { getSlimRegion } from "@/data/regions-slim";

const lookup = (id: string) => getSlimRegion(id);
const kyoto = getSlimRegion("japan-kyoto")!;
const bangkok = getSlimRegion("thailand-bangkok")!;
const cusco = getSlimRegion("peru-cusco")!;

const range = (a: string, b: string): DateRange => ({
  start: parseDay(a),
  end: parseDay(b),
});

describe("parseDay", () => {
  it("parses as LOCAL midnight, not UTC (regression: dates shifting a day west of GMT)", () => {
    const d = parseDay("2026-07-03");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6); // July, 0-based
    expect(d.getDate()).toBe(3);
    expect(d.getHours()).toBe(0);
    // new Date("2026-07-03") is UTC midnight, which is the 2nd in the Americas.
    // Whatever the runner's zone, ours must agree with the literal written.
  });
});

describe("bookedLegs", () => {
  it("derives months and real day count from a committed range", () => {
    const legs = bookedLegs(
      [{ region: kyoto, durationMonths: 1 }],
      [range("2026-07-03", "2026-07-17")]
    );
    expect(legs[0].months).toEqual([7]);
    expect(legs[0].days).toBe(14);
  });

  it("spans months when the stay crosses a boundary", () => {
    const legs = bookedLegs(
      [{ region: kyoto, durationMonths: 1 }],
      [range("2026-07-20", "2026-08-05")]
    );
    expect(legs[0].months).toEqual([7, 8]);
    expect(legs[0].days).toBe(16);
  });

  it("treats an end on the 1st as exclusive — you didn't occupy that month", () => {
    const legs = bookedLegs(
      [{ region: kyoto, durationMonths: 1 }],
      [range("2026-07-01", "2026-08-01")]
    );
    expect(legs[0].months).toEqual([7]);
    expect(legs[0].days).toBe(31);
  });

  it("handles a stay crossing the year boundary", () => {
    const legs = bookedLegs(
      [{ region: kyoto, durationMonths: 1 }],
      [range("2026-12-20", "2027-01-05")]
    );
    expect(legs[0].months).toEqual([12, 1]);
    expect(legs[0].days).toBe(16);
  });

  it("keeps an undated stop as an empty leg so indices still line up", () => {
    const legs = bookedLegs(
      [
        { region: kyoto, durationMonths: 1 },
        { region: bangkok, durationMonths: 1 },
      ],
      [range("2026-07-03", "2026-07-17"), null]
    );
    expect(legs).toHaveLength(2);
    expect(legs[1].region.id).toBe("thailand-bangkok");
    expect(legs[1].months).toEqual([]);
    expect(legs[1].days).toBe(0);
  });

  it("NEVER reorders, even when another order would score better", () => {
    // Bangkok in Sep is wet; Cusco in Sep is dry. planItinerary would happily
    // swap them for fit — bookedLegs must not, because these dates are booked.
    const stops = [
      { region: bangkok, durationMonths: 1 },
      { region: cusco, durationMonths: 1 },
    ];
    const ranges = [
      range("2026-09-01", "2026-10-01"),
      range("2026-10-01", "2026-11-01"),
    ];

    const booked = bookedLegs(stops, ranges);
    expect(booked.map((l) => l.region.id)).toEqual([
      "thailand-bangkok",
      "peru-cusco",
    ]);
    expect(booked.map((l) => l.position)).toEqual([0, 1]);

    // Sanity: the planner really does consider reordering these.
    const planned = planItinerary(stops, 9);
    expect(planned.map((l) => l.region.id).sort()).toEqual(
      ["peru-cusco", "thailand-bangkok"].sort()
    );
  });
});

describe("estimateLegCost with real days", () => {
  it("uses the real day count for a booked leg", () => {
    const [leg] = bookedLegs(
      [{ region: cusco, durationMonths: 1 }],
      [range("2026-06-01", "2026-06-15")]
    );
    // Cusco's dailyBudget is 50 → 14 days × 50.
    expect(leg.days).toBe(14);
    expect(estimateLegCost(leg)).toBe(700);
  });

  it("leaves planning-mode cost on the nominal 30-day month (regression)", () => {
    const legs = planItinerary([{ region: cusco, durationMonths: 2 }], 6);
    expect(legs[0].days).toBeUndefined();
    expect(estimateTripCost(legs)).toBe(3000); // 50 × 2 × 30, unchanged
  });

  it("costs an undated booked stop as zero rather than guessing", () => {
    const [leg] = bookedLegs([{ region: cusco, durationMonths: 1 }], [null]);
    expect(estimateLegCost(leg)).toBe(0);
  });
});

describe("tripDateRanges", () => {
  const stops: [string, number][] = [["peru-cusco", 2]];

  it("matches legDateRanges exactly in planning mode", () => {
    const trip = { start: 6, stops };
    const now = new Date(2026, 5, 15);
    const legs = tripLegs(trip, lookup, now);
    const ranges = tripDateRanges(trip, legs, now);
    expect(ranges[0]).not.toBeNull();
    expect(ranges[0]!.start.getMonth()).toBe(5); // June
  });

  it("returns the committed ranges in booked mode", () => {
    const trip = {
      start: 0,
      stops,
      mode: "booked" as const,
      bookedDates: [{ start: "2026-09-04", end: "2026-09-19" }],
    };
    const legs = tripLegs(trip, lookup);
    const ranges = tripDateRanges(trip, legs);
    expect(ranges[0]!.start.getDate()).toBe(4);
    expect(ranges[0]!.start.getMonth()).toBe(8); // September
  });

  it("passes nulls through for undated stops", () => {
    const trip = {
      start: 0,
      stops: [["peru-cusco", 1], ["japan-kyoto", 1]] as [string, number][],
      mode: "booked" as const,
      bookedDates: [{ start: "2026-09-04", end: "2026-09-19" }, null],
    };
    const ranges = tripDateRanges(trip, tripLegs(trip, lookup));
    expect(ranges[1]).toBeNull();
  });
});

describe("null tolerance in the in-trip helpers", () => {
  it("findActiveLeg skips undated stops and gaps", () => {
    const ranges = [null, range("2026-07-01", "2026-07-10")];
    expect(findActiveLeg(ranges, new Date(2026, 6, 5))).toMatchObject({
      index: 1,
    });
    // A day inside the gap before the dated stay: not travelling.
    expect(findActiveLeg(ranges, new Date(2026, 5, 20))).toBeNull();
  });

  it("estimateSpendSoFar counts an undated leg as zero, not as spent", () => {
    const legs = bookedLegs(
      [
        { region: cusco, durationMonths: 1 },
        { region: cusco, durationMonths: 1 },
      ],
      [range("2026-01-01", "2026-01-11"), null]
    );
    const ranges = [range("2026-01-01", "2026-01-11"), null];
    // First leg fully past → 100% of its cost (50 × 10 days), second unknown → 0.
    expect(estimateSpendSoFar(legs, ranges, new Date(2026, 5, 1))).toBe(500);
  });
});

describe("bookingIssues", () => {
  const stops: [string, number][] = [
    ["peru-cusco", 1],
    ["japan-kyoto", 1],
  ];

  it("reports nothing for back-to-back stays", () => {
    expect(
      bookingIssues({
        start: 0,
        stops,
        mode: "booked",
        bookedDates: [
          { start: "2026-07-01", end: "2026-07-15" },
          { start: "2026-07-15", end: "2026-08-01" },
        ],
      })
    ).toEqual([]);
  });

  it("flags a gap and an overlap without blocking either", () => {
    const gap = bookingIssues({
      start: 0,
      stops,
      mode: "booked",
      bookedDates: [
        { start: "2026-07-01", end: "2026-07-15" },
        { start: "2026-07-20", end: "2026-08-01" },
      ],
    });
    expect(gap).toEqual([{ index: 1, kind: "gap" }]);

    const overlap = bookingIssues({
      start: 0,
      stops,
      mode: "booked",
      bookedDates: [
        { start: "2026-07-01", end: "2026-07-20" },
        { start: "2026-07-15", end: "2026-08-01" },
      ],
    });
    expect(overlap).toEqual([{ index: 1, kind: "overlap" }]);
  });

  it("flags a stay that ends before it starts", () => {
    const issues = bookingIssues({
      start: 0,
      stops: [["peru-cusco", 1]],
      mode: "booked",
      bookedDates: [{ start: "2026-07-20", end: "2026-07-10" }],
    });
    expect(issues).toContainEqual({ index: 0, kind: "inverted" });
  });

  it("doesn't invent a gap across an undated stop in the middle", () => {
    const issues = bookingIssues({
      start: 0,
      stops: [
        ["peru-cusco", 1],
        ["japan-kyoto", 1],
        ["thailand-bangkok", 1],
      ],
      mode: "booked",
      bookedDates: [
        { start: "2026-07-01", end: "2026-07-15" },
        null,
        { start: "2026-07-15", end: "2026-08-01" },
      ],
    });
    expect(issues).toEqual([]);
  });

  it("is silent for a planning-mode trip", () => {
    expect(bookingIssues({ start: 6, stops })).toEqual([]);
  });
});
