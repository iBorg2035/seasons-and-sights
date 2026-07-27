// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  createTrip,
  getTrip,
  editedTrip,
  saveTrip,
  hasUnsavedChanges,
  setStopDates,
  type SavedTripLite,
} from "@/lib/saved-trips";
import { getSlimRegion } from "@/data/regions-slim";
import { bookingIssues, tripDateRanges, tripLegs } from "@/lib/trip-plan";

/**
 * StopsSection renders a FILTERED list: a region retired from the dataset is
 * dropped from the view but still occupies a slot in `stops` and, crucially,
 * in the index-aligned `bookedDates`. Anything that indexes trip data by the
 * visible position is therefore off by one for every stop after the gap.
 */

const RETIRED = "atlantis-lost-city";

function tripWithRetiredStop(): SavedTripLite {
  return createTrip("Mixed", {
    start: 9,
    stops: [
      [RETIRED, 1],
      ["peru-cusco", 1],
      ["thailand-bangkok", 1],
    ],
    mode: "booked",
  })!;
}

/** Mirrors StopsSection's resolved list, including the carried real index. */
function resolve(trip: SavedTripLite) {
  return trip.stops
    .map(([id, duration], stopIndex) => {
      const region = getSlimRegion(id);
      return region ? { id, duration, region, stopIndex } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

beforeEach(() => localStorage.clear());

describe("a trip containing a region the dataset no longer knows", () => {
  it("still lines the visible rows up with their own stops", () => {
    const trip = tripWithRetiredStop();
    const rows = resolve(trip);

    expect(rows).toHaveLength(2);
    // The visible positions are 0 and 1; the real slots are 1 and 2.
    expect(rows.map((r) => r.stopIndex)).toEqual([1, 2]);
    expect(rows[0].id).toBe("peru-cusco");
  });

  it("writes a date onto the destination it was entered for", () => {
    const trip = tripWithRetiredStop();
    const rows = resolve(trip);
    const cusco = rows[0];

    const draft = editedTrip(trip, (t) =>
      setStopDates(t, cusco.stopIndex, {
        start: "2026-09-03",
        end: "2026-09-12",
      })
    );

    // Indexed by the visible position (0) this would have landed on the
    // retired stop, leaving Cusco undated and the date attached to nothing
    // the user can see.
    expect(draft.bookedDates![0]).toBeNull();
    expect(draft.bookedDates![1]).toEqual({
      start: "2026-09-03",
      end: "2026-09-12",
    });
  });

  it("reads back the date it just wrote", () => {
    const trip = tripWithRetiredStop();
    const cusco = resolve(trip)[0];
    const draft = editedTrip(trip, (t) =>
      setStopDates(t, cusco.stopIndex, { start: "2026-09-03", end: "2026-09-12" })
    );

    expect(draft.bookedDates?.[cusco.stopIndex]?.start).toBe("2026-09-03");
  });

  it("attributes booking warnings to the right destination", () => {
    const trip = tripWithRetiredStop();
    const dated = editedTrip(trip, (t) => {
      setStopDates(t, 1, { start: "2026-09-03", end: "2026-09-12" });
      // Overlaps the previous stay — the warning belongs to stop index 2.
      setStopDates(t, 2, { start: "2026-09-08", end: "2026-09-20" });
    });

    const issues = bookingIssues(dated);
    expect(issues.some((i) => i.kind === "overlap" && i.index === 2)).toBe(true);
    // Looked up by visible position (1) the warning would appear on Cusco.
    const rows = resolve(dated);
    expect(rows[1].id).toBe("thailand-bangkok");
    expect(rows[1].stopIndex).toBe(2);
  });
});

describe("hasUnsavedChanges after a save", () => {
  it("does not report a freshly saved trip as dirty", () => {
    // It compares JSON strings, so a key-order difference between the
    // in-memory draft and the copy parsed back out of storage would leave
    // "Unsaved" showing forever with nothing to save.
    const trip = createTrip("Order", { start: 9, stops: [["peru-cusco", 1]] })!;
    const draft = editedTrip(trip, (t) => {
      t.mode = "booked";
      setStopDates(t, 0, { start: "2026-09-03", end: "2026-09-12" });
      t.interests = ["nature"];
    });

    expect(saveTrip(draft)).toBe(true);
    const stored = getTrip(trip.id)!;

    expect(hasUnsavedChanges(draft, stored)).toBe(false);
  });

  it("stays clean after a round trip that removes a field", () => {
    const trip = createTrip("Order", {
      start: 9,
      stops: [["peru-cusco", 1]],
      mode: "booked",
      bookedDates: [{ start: "2026-09-03", end: "2026-09-12" }],
    })!;
    // Clearing the last date drops bookedDates entirely via normalise.
    const draft = editedTrip(trip, (t) => setStopDates(t, 0, null));
    saveTrip(draft);

    expect(hasUnsavedChanges(draft, getTrip(trip.id)!)).toBe(false);
  });
});

describe("legs and their committed dates, with a stop dropped", () => {
  const lookup = (id: string) => getSlimRegion(id);

  function datedTrip(): SavedTripLite {
    return createTrip("Mixed", {
      start: 9,
      stops: [
        [RETIRED, 1],
        ["peru-cusco", 1],
        ["thailand-bangkok", 1],
      ],
      mode: "booked",
      bookedDates: [
        null,
        { start: "2026-09-03", end: "2026-09-12" },
        { start: "2026-10-01", end: "2026-10-08" },
      ],
    })!;
  }

  it("gives each leg the dates of its own destination", () => {
    const trip = datedTrip();
    const legs = tripLegs(trip, lookup);
    const ranges = tripDateRanges(trip, legs);

    expect(legs.map((l) => l.region.id)).toEqual([
      "peru-cusco",
      "thailand-bangkok",
    ]);
    // tripToStops drops the retired id, so pairing ranges to legs by position
    // hands Cusco the retired stop's slot (null) and Bangkok Cusco's dates.
    expect(ranges[0]).not.toBeNull();
    expect(ranges[0]!.start.getMonth()).toBe(8); // September, Cusco's own
    expect(ranges[1]!.start.getMonth()).toBe(9); // October, Bangkok's own
  });

  it("gives the legs real month spans rather than empty ones", () => {
    const legs = tripLegs(datedTrip(), lookup);
    // A leg paired with a null range has no months at all, which is what made
    // the route read "dates TBD" for a stop that had dates.
    expect(legs[0].months).toEqual([9]);
    expect(legs[1].months).toEqual([10]);
  });
});
