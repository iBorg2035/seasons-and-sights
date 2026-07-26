// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { createTrip, getTrip, isBooked, updateTrip } from "@/lib/saved-trips";
import { tripDateRanges, tripLegs } from "@/lib/trip-plan";
import { assessTripHealth } from "@/lib/trip-health";
import { getSlimRegion } from "@/data/regions-slim";

/**
 * A trip started from "I know my dates" begins booked with no stops, then
 * gains stops that have no dates yet. That combination was previously only
 * reachable transiently, so it's the state most likely to be mishandled.
 */

const lookup = (id: string) => getSlimRegion(id);

beforeEach(() => localStorage.clear());

describe("a dates-first trip", () => {
  it("starts booked, with no stops and no dates array", () => {
    const trip = createTrip(undefined, { mode: "booked" })!;

    expect(isBooked(trip)).toBe(true);
    expect(trip.stops).toEqual([]);
    // No array of nulls parked in storage before anything is entered.
    expect(trip.bookedDates).toBeUndefined();
    expect(isBooked(getTrip(trip.id)!)).toBe(true);
  });

  it("stays booked when stops are added, without inventing dates", () => {
    const trip = createTrip(undefined, { mode: "booked" })!;
    updateTrip(trip.id, (t) => {
      t.stops.push(["peru-cusco", 1]);
      t.stops.push(["thailand-bangkok", 1]);
    });

    const saved = getTrip(trip.id)!;
    expect(isBooked(saved)).toBe(true);
    expect(saved.stops).toHaveLength(2);
    expect(saved.bookedDates).toBeUndefined();
  });

  it("renders undated stops without crashing or mis-attributing months", () => {
    const trip = createTrip(undefined, { mode: "booked" })!;
    updateTrip(trip.id, (t) => t.stops.push(["peru-cusco", 1]));
    const saved = getTrip(trip.id)!;

    const legs = tripLegs(saved, lookup);
    const ranges = tripDateRanges(saved, legs);

    expect(legs).toHaveLength(1);
    expect(legs[0].months).toEqual([]);
    expect(legs[0].days).toBe(0);
    expect(ranges).toEqual([null]);
  });

  it("reports health as undiagnosable, not as terrible weather", () => {
    const trip = createTrip(undefined, { mode: "booked" })!;
    updateTrip(trip.id, (t) => t.stops.push(["peru-cusco", 1]));
    const saved = getTrip(trip.id)!;

    const health = assessTripHealth(tripLegs(saved, lookup));

    // Undated legs have fit 0, and avg([]) is 100, so scoring this naively
    // reports weather 0 / crowds 100 — "terrible weather" for a trip that
    // simply has nothing entered yet.
    expect(health.summary).toMatch(/dates/i);
    expect(health.metrics.crowds).toBe(0);
    expect(health.warnings).toEqual([]);
  });

  it("diagnoses normally once a stop is dated", () => {
    const trip = createTrip(undefined, { mode: "booked" })!;
    updateTrip(trip.id, (t) => {
      t.stops.push(["peru-cusco", 1]);
      t.bookedDates = [{ start: "2026-09-03", end: "2026-09-12" }];
    });
    const saved = getTrip(trip.id)!;

    const health = assessTripHealth(tripLegs(saved, lookup));

    expect(health.summary).not.toMatch(/dates/i);
    expect(health.metrics.weather).toBeGreaterThan(0);
  });

  it("leaves a plain planning trip alone", () => {
    const trip = createTrip()!;
    expect(trip.mode).toBeUndefined();
    expect(isBooked(trip)).toBe(false);
  });
});
