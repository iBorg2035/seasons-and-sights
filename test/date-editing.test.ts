// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  createTrip,
  getTrip,
  updateTrip,
  removeStopAt,
  type SavedTripLite,
} from "@/lib/saved-trips";
import { datesForMonth } from "@/lib/season";

/**
 * Editing committed dates. `bookedDates` is index-aligned with `stops`, so any
 * operation that rewrites one without the other silently hangs every date on
 * the wrong destination — the exact failure the whole dates arc was built to
 * avoid, and the one "reset to last saved" reintroduced.
 */

const STOPS: [string, number][] = [
  ["peru-cusco", 1],
  ["thailand-bangkok", 1],
  ["japan-kyoto", 1],
];

const DATES = [
  { start: "2026-09-03", end: "2026-09-12" },
  { start: "2026-10-01", end: "2026-10-08" },
  { start: "2026-11-01", end: "2026-11-10" },
];

function booked(): SavedTripLite {
  const t = createTrip("Dates", {
    start: 9,
    stops: STOPS,
    mode: "booked",
    bookedDates: DATES,
  })!;
  return t;
}

/** Mirrors TripView's handleReset. */
function resetTo(tripId: string, saved: SavedTripLite): void {
  updateTrip(tripId, (t) => {
    t.name = saved.name;
    t.start = saved.start;
    t.stops = saved.stops.map((s) => [s[0], s[1]] as [string, number]);
    t.mode = saved.mode;
    t.bookedDates = saved.bookedDates?.map((d) => (d ? { ...d } : null));
    t.interests = saved.interests ? [...saved.interests] : undefined;
  });
}

/** Which date each destination ends up with — the thing that must not drift. */
function pairing(tripId: string): [string, string | null][] {
  const t = getTrip(tripId)!;
  return t.stops.map(([id], i) => [id, t.bookedDates?.[i]?.start ?? null]);
}

beforeEach(() => localStorage.clear());

describe("reset to last saved", () => {
  it("restores dates onto the destinations they belonged to", () => {
    const trip = booked();
    const snapshot = JSON.parse(JSON.stringify(getTrip(trip.id))) as SavedTripLite;

    // Remove the first stop; the survivors correctly keep their own dates.
    updateTrip(trip.id, (t) => removeStopAt(t, 0));
    expect(pairing(trip.id)).toEqual([
      ["thailand-bangkok", "2026-10-01"],
      ["japan-kyoto", "2026-11-01"],
    ]);

    resetTo(trip.id, snapshot);

    // Restoring stops without bookedDates used to leave the dates where they
    // were, shifting every stay one destination earlier and dropping the last.
    expect(pairing(trip.id)).toEqual([
      ["peru-cusco", "2026-09-03"],
      ["thailand-bangkok", "2026-10-01"],
      ["japan-kyoto", "2026-11-01"],
    ]);
  });

  it("restores the mode too, so a locked-in trip doesn't come back planning", () => {
    const trip = booked();
    const snapshot = JSON.parse(JSON.stringify(getTrip(trip.id))) as SavedTripLite;

    updateTrip(trip.id, (t) => {
      t.mode = "planning";
    });
    resetTo(trip.id, snapshot);

    expect(getTrip(trip.id)!.mode).toBe("booked");
  });

  it("clears dates that weren't in the snapshot", () => {
    const trip = createTrip("Plain", { start: 9, stops: STOPS })!;
    const snapshot = JSON.parse(JSON.stringify(getTrip(trip.id))) as SavedTripLite;

    updateTrip(trip.id, (t) => {
      t.mode = "booked";
      t.bookedDates = DATES;
    });
    resetTo(trip.id, snapshot);

    const back = getTrip(trip.id)!;
    expect(back.bookedDates).toBeUndefined();
    expect(back.mode).toBeUndefined();
  });

  it("restores interests, which were also being left behind", () => {
    const trip = createTrip("Interests", {
      start: 9,
      stops: STOPS,
      interests: ["beach"],
    })!;
    const snapshot = JSON.parse(JSON.stringify(getTrip(trip.id))) as SavedTripLite;

    updateTrip(trip.id, (t) => {
      t.interests = ["city", "culture"];
    });
    resetTo(trip.id, snapshot);

    expect(getTrip(trip.id)!.interests).toEqual(["beach"]);
  });
});

describe("datesForMonth label honesty", () => {
  it("does not hand back next month's dates under this month's label", () => {
    // Late July: "+14 days" lands on Aug 10, but the card says "Dates set for
    // July". Reproduced from a real screenshot showing exactly that.
    const lateJuly = new Date(2026, 6, 27);
    const { checkin } = datesForMonth(7, lateJuly);
    expect(checkin.slice(0, 7)).toBe("2027-07");
  });

  it("still nudges out when the month has room left", () => {
    const earlyJuly = new Date(2026, 6, 2);
    const { checkin, checkout } = datesForMonth(7, earlyJuly);
    expect(checkin).toBe("2026-07-16");
    expect(checkout).toBe("2026-07-31");
  });

  it("keeps a future month on its own next occurrence", () => {
    const july = new Date(2026, 6, 27);
    expect(datesForMonth(9, july).checkin).toBe("2026-09-10");
    expect(datesForMonth(3, july).checkin).toBe("2027-03-10");
  });
});
