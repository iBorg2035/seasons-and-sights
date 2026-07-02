// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { migrateDraftToTrips } from "@/lib/trip-migrate";
import { getSavedTrips } from "@/lib/saved-trips";
import { getActiveTripId } from "@/lib/active-trip";

describe("draft→trips migration", () => {
  beforeEach(() => localStorage.clear());

  it("promotes an existing draft into a saved trip", () => {
    localStorage.setItem("seasons-draft", JSON.stringify({ start: 10, stops: [{ id: "vietnam-hoian", duration: 2 }] }));
    migrateDraftToTrips();
    const trips = getSavedTrips();
    expect(trips).toHaveLength(1);
    expect(trips[0].name).toBe("Untitled trip");
    expect(trips[0].stops).toEqual([["vietnam-hoian", 2]]);
    expect(trips[0].start).toBe(10);
  });

  it("deletes the draft after migrating", () => {
    localStorage.setItem("seasons-draft", JSON.stringify({ start: 1, stops: [] }));
    migrateDraftToTrips();
    expect(localStorage.getItem("seasons-draft")).toBeNull();
  });

  it("sets the active trip to the migrated trip", () => {
    localStorage.setItem("seasons-draft", JSON.stringify({ start: 1, stops: [{ id: "x", duration: 1 }] }));
    migrateDraftToTrips();
    const trips = getSavedTrips();
    expect(getActiveTripId()).toBe(trips[0].id);
  });

  it("is idempotent — running twice does nothing the second time", () => {
    localStorage.setItem("seasons-draft", JSON.stringify({ start: 1, stops: [] }));
    migrateDraftToTrips();
    const afterFirst = getSavedTrips().length;
    migrateDraftToTrips();
    expect(getSavedTrips().length).toBe(afterFirst);
  });

  it("does nothing when there was no draft", () => {
    migrateDraftToTrips();
    expect(getSavedTrips()).toHaveLength(0);
  });
});
