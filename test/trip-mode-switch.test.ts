import { describe, it, expect } from "vitest";
import {
  seedBookedDates,
  wouldReorder,
  tripDateRanges,
  tripLegs,
  resolveStartMonth,
} from "@/lib/trip-plan";
import { legDateRanges, planItinerary, formatDay, parseDay } from "@/lib/season";
import { getSlimRegion } from "@/data/regions-slim";

const lookup = (id: string) => getSlimRegion(id);
const NOW = new Date(2026, 5, 15); // 2026-06-15

/** Mirrors what TripView's toggle does, so the round-trip is tested as a unit. */
function lockIn(trip: {
  start: number;
  stops: [string, number][];
  mode?: "planning" | "booked";
  bookedDates?: ({ start: string; end: string } | null)[];
}) {
  const next = { ...trip, mode: "booked" as const };
  if (next.bookedDates?.some((d) => d != null)) return next; // keep edits
  const legs = tripLegs(trip, lookup, NOW);
  const ranges = legDateRanges(resolveStartMonth(trip.start, NOW), legs, NOW);
  const seeded = seedBookedDates(trip.stops, legs, ranges);
  return { ...next, stops: seeded.stops, bookedDates: seeded.bookedDates };
}

function backToPlanning<T extends object>(trip: T) {
  // Deliberately keeps bookedDates — that's what makes the switch reversible.
  return { ...trip, mode: "planning" as const };
}

describe("locking in a plan", () => {
  it("attaches each date to the RIGHT stop even though the planner reorders", () => {
    // Starting in September the planner genuinely swaps these two (Bangkok is
    // wet in Sep, Cusco still dry) — verified by the precondition below.
    // Without a real reorder this test would pass vacuously against the naive
    // "seed against stops order" bug, so the precondition is load-bearing.
    const trip = {
      start: 9,
      stops: [
        ["thailand-bangkok", 1],
        ["peru-cusco", 1],
      ] as [string, number][],
    };

    const legs = tripLegs(trip, lookup, NOW);
    const ranges = legDateRanges(9, legs, NOW);

    // PRECONDITION: the planner really does reorder this input.
    expect(legs[0].region.id).toBe("peru-cusco");
    expect(trip.stops[0][0]).toBe("thailand-bangkok");

    const seeded = seedBookedDates(trip.stops, legs, ranges);

    // Stops adopt the planner's order...
    expect(seeded.stops.map(([id]) => id)).toEqual([
      "peru-cusco",
      "thailand-bangkok",
    ]);
    // ...and Cusco — which the planner put FIRST — owns the FIRST range, even
    // though the user had listed Bangkok first.
    expect(seeded.bookedDates[0]).toEqual({
      start: formatDay(ranges[0].start),
      end: formatDay(ranges[0].end),
    });
    expect(seeded.bookedDates[1]).toEqual({
      start: formatDay(ranges[1].start),
      end: formatDay(ranges[1].end),
    });
    // Cusco's stay must start before Bangkok's — the whole point of the swap.
    expect(seeded.bookedDates[0].start < seeded.bookedDates[1].start).toBe(
      true
    );
  });

  it("preserves each stop's duration so switching back restores the plan", () => {
    const trip = {
      start: 6,
      stops: [
        ["peru-cusco", 3],
        ["japan-kyoto", 2],
      ] as [string, number][],
    };
    const legs = tripLegs(trip, lookup, NOW);
    const ranges = legDateRanges(6, legs, NOW);
    const { stops } = seedBookedDates(trip.stops, legs, ranges);

    expect(new Map(stops).get("peru-cusco")).toBe(3);
    expect(new Map(stops).get("japan-kyoto")).toBe(2);
  });

  it("wouldReorder only reports true when the order actually changes", () => {
    const trip = {
      start: 6,
      stops: [
        ["thailand-bangkok", 1],
        ["peru-cusco", 1],
      ] as [string, number][],
    };
    const legs = tripLegs(trip, lookup, NOW);
    const changed = legs.some((l, i) => l.region.id !== trip.stops[i][0]);
    expect(wouldReorder(trip.stops, legs)).toBe(changed);

    // A trip already in planner order reports no reorder.
    const inOrder = {
      start: 6,
      stops: legs.map((l) => [l.region.id, 1] as [string, number]),
    };
    expect(wouldReorder(inOrder.stops, tripLegs(inOrder, lookup, NOW))).toBe(
      false
    );
  });
});

describe("the planning ⇄ booked round trip", () => {
  const base = {
    start: 6,
    stops: [
      ["peru-cusco", 2],
      ["japan-kyoto", 1],
    ] as [string, number][],
  };

  it("returns bit-identical planning output after locking in and switching back", () => {
    const before = tripDateRanges(base, tripLegs(base, lookup, NOW), NOW);

    const booked = lockIn(base);
    const planningAgain = backToPlanning(booked);
    const after = tripDateRanges(
      planningAgain,
      tripLegs(planningAgain, lookup, NOW),
      NOW
    );

    expect(after.map((r) => r && formatDay(r.start))).toEqual(
      before.map((r) => r && formatDay(r.start))
    );
    expect(after.map((r) => r && formatDay(r.end))).toEqual(
      before.map((r) => r && formatDay(r.end))
    );
  });

  it("keeps a hand-edited date through planning and back — no regeneration", () => {
    const booked = lockIn(base);
    // User edits the first stay.
    const edited = {
      ...booked,
      bookedDates: booked.bookedDates!.map((d, i) =>
        i === 0 ? { start: "2026-08-04", end: "2026-08-20" } : d
      ),
    };

    const planning = backToPlanning(edited);
    const relocked = lockIn(planning);

    expect(relocked.bookedDates![0]).toEqual({
      start: "2026-08-04",
      end: "2026-08-20",
    });
  });

  it("seeded dates round-trip through parseDay/formatDay unchanged", () => {
    const booked = lockIn(base);
    for (const d of booked.bookedDates!) {
      expect(formatDay(parseDay(d!.start))).toBe(d!.start);
      expect(formatDay(parseDay(d!.end))).toBe(d!.end);
    }
  });

  it("booked mode does not re-plan: legs stay in stops order", () => {
    const booked = lockIn(base);
    const legs = tripLegs(booked, lookup, NOW);
    expect(legs.map((l) => l.region.id)).toEqual(
      booked.stops.map(([id]) => id)
    );
  });

  it("seeded stays are contiguous, so a fresh lock-in raises no warnings", async () => {
    const { bookingIssues } = await import("@/lib/trip-plan");
    expect(bookingIssues(lockIn(base))).toEqual([]);
  });
});

/**
 * Regression: the first cut of TripView's toggle set `mode = "booked"` and
 * THEN computed the plan. Because tripLegs dispatches on mode, it planned the
 * trip from its own (still empty) bookedDates — producing zero-length stays
 * (Sep 1 → Sep 1 for every stop) and no reorder, while the confirm had just
 * promised one. Isolated seedBookedDates tests couldn't see it; only the real
 * mutation ORDER exposes it.
 */
describe("lock-in mutation order", () => {
  const trip = {
    start: 9,
    stops: [
      ["thailand-bangkok", 1],
      ["peru-cusco", 1],
    ] as [string, number][],
  };

  it("plans before flipping the mode, yielding real non-empty stays", () => {
    const t: {
      start: number;
      stops: [string, number][];
      mode?: "planning" | "booked";
      bookedDates?: ({ start: string; end: string } | null)[];
    } = { ...trip, stops: [...trip.stops] };

    // Exactly what TripView does, in order.
    const legs = tripLegs(t, lookup, NOW);
    const ranges = legDateRanges(resolveStartMonth(t.start, NOW), legs, NOW);
    const seeded = seedBookedDates(t.stops, legs, ranges);
    t.stops = seeded.stops;
    t.bookedDates = seeded.bookedDates;
    t.mode = "booked";

    // Every stay must span real time, not collapse to a single day.
    for (const d of t.bookedDates!) {
      expect(d!.start).not.toBe(d!.end);
      expect(parseDay(d!.end).getTime()).toBeGreaterThan(
        parseDay(d!.start).getTime()
      );
    }
    // And the promised reorder actually happened.
    expect(t.stops.map(([id]) => id)).toEqual([
      "peru-cusco",
      "thailand-bangkok",
    ]);
  });

  it("collapses to zero-length stays if the mode is flipped first (the bug)", () => {
    const t: {
      start: number;
      stops: [string, number][];
      mode?: "planning" | "booked";
      bookedDates?: ({ start: string; end: string } | null)[];
    } = { ...trip, stops: [...trip.stops], mode: "booked" };

    // Planning a trip already marked booked reads its empty dates instead.
    const legs = tripLegs(t, lookup, NOW);
    expect(legs.every((l) => l.months.length === 0)).toBe(true);

    const ranges = legDateRanges(resolveStartMonth(t.start, NOW), legs, NOW);
    const seeded = seedBookedDates(t.stops, legs, ranges);
    // This is what the user saw: every stay Sep 1 → Sep 1.
    expect(seeded.bookedDates[0].start).toBe(seeded.bookedDates[0].end);
  });
});

describe("planItinerary is still the planning-mode engine", () => {
  it("keeps reordering while planning (the behaviour booked mode opts out of)", () => {
    const stops = [
      { region: getSlimRegion("thailand-bangkok")!, durationMonths: 1 },
      { region: getSlimRegion("peru-cusco")!, durationMonths: 1 },
    ];
    const legs = planItinerary(stops, 6);
    expect(legs).toHaveLength(2);
    // Whatever order it picks, every leg must still be present exactly once.
    expect(legs.map((l) => l.region.id).sort()).toEqual(
      ["peru-cusco", "thailand-bangkok"].sort()
    );
  });
});
