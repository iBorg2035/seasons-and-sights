// test/active-trip.test.ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  getActiveTripId,
  setActiveTripId,
  ensureActiveTripId,
  ACTIVE_TRIP_EVENT,
  ACTIVE_TRIP_KEY,
} from "@/lib/active-trip";
import { getSavedTrips } from "@/lib/saved-trips";

describe("active-trip pointer", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips the active id through localStorage", () => {
    setActiveTripId("abc-123");
    expect(getActiveTripId()).toBe("abc-123");
  });

  it("dispatches ACTIVE_TRIP_EVENT on set", () => {
    let fired = false;
    window.addEventListener(ACTIVE_TRIP_EVENT, () => (fired = true));
    setActiveTripId("xyz");
    expect(fired).toBe(true);
  });

  it("returns null when nothing is set", () => {
    expect(getActiveTripId()).toBeNull();
  });

  it("ensureActiveTripId returns the current id when valid", () => {
    setActiveTripId("keep-me");
    expect(ensureActiveTripId()).toBe("keep-me");
  });

  it("ensureActiveTripId repoints to the newest trip when the pointer is stale", () => {
    // seed two saved trips directly
    localStorage.setItem(
      "seasons-saved-trips",
      JSON.stringify([
        { id: "old", name: "Old", start: 1, stops: [], updatedAt: 100 },
        { id: "new", name: "New", start: 1, stops: [], updatedAt: 200 },
      ])
    );
    setActiveTripId("does-not-exist"); // stale
    const id = ensureActiveTripId();
    expect(id).toBe("new"); // newest by updatedAt
    expect(getActiveTripId()).toBe("new"); // repointed
  });
});
