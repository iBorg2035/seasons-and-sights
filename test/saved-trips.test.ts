// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getSavedTrips,
  createTrip,
  updateTrip,
  getTrip,
} from "@/lib/saved-trips";

describe("trip store helpers", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("createTrip adds a fresh trip and returns it", () => {
    const t = createTrip();
    expect(t).not.toBeNull();
    if (!t) throw new Error("trip was not created");
    expect(t.id).toBeTruthy();
    expect(t.name).toBe("Untitled trip");
    expect(getSavedTrips()).toHaveLength(1);
    expect(getSavedTrips()[0].id).toBe(t.id);
  });

  it("getTrip returns the trip by id, undefined when missing", () => {
    const t = createTrip();
    expect(t).not.toBeNull();
    if (!t) throw new Error("trip was not created");
    expect(getTrip(t.id)?.id).toBe(t.id);
    expect(getTrip("nope")).toBeUndefined();
  });

  it("updateTrip mutates in place and bumps updatedAt", () => {
    const t = createTrip();
    expect(t).not.toBeNull();
    if (!t) throw new Error("trip was not created");
    const before = t.updatedAt ?? 0;
    updateTrip(t.id, (trip) => {
      trip.name = "Renamed";
      trip.stops = [["vietnam-hoian", 2]];
    });
    const after = getTrip(t.id);
    expect(after?.name).toBe("Renamed");
    expect(after?.stops).toEqual([["vietnam-hoian", 2]]);
    expect((after?.updatedAt ?? 0) >= before).toBe(true);
  });

  it("round-trips interests through updateTrip/getTrip", () => {
    const t = createTrip();
    expect(t).not.toBeNull();
    if (!t) throw new Error("trip was not created");
    expect(t.interests).toBeUndefined();
    updateTrip(t.id, (trip) => {
      trip.interests = ["beach", "wildlife"];
    });
    expect(getTrip(t.id)?.interests).toEqual(["beach", "wildlife"]);
  });

  it("updateTrip is a no-op for a missing id", () => {
    createTrip();
    updateTrip("missing", (t) => (t.name = "x"));
    expect(getSavedTrips()).toHaveLength(1);
    expect(getSavedTrips()[0].name).toBe("Untitled trip");
  });

  it("createTrip returns null and leaves no phantom trip when storage throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Persistent storage disabled", "SecurityError");
    });

    const t = createTrip();
    expect(t).toBeNull();
    expect(getSavedTrips()).toHaveLength(0);
  });
});

describe("hasUnsavedChanges", () => {
  // Regression: the cloud merge stamps ownerId onto a new trip after its first
  // sync, which used to flag an untouched trip as "Unsaved".
  it("ignores ownerId and updatedAt, which sync writes", async () => {
    const { hasUnsavedChanges } = await import("@/lib/saved-trips");
    const draft = { id: "t", name: "A", start: 0, stops: [] as [string, number][], updatedAt: 1 };
    const synced = { ...draft, ownerId: "user-1", updatedAt: 2 };
    expect(hasUnsavedChanges(draft, synced)).toBe(false);
  });

  it("still sees a real edit", async () => {
    const { hasUnsavedChanges } = await import("@/lib/saved-trips");
    const saved = { id: "t", name: "A", start: 0, stops: [] as [string, number][] };
    expect(hasUnsavedChanges({ ...saved, name: "B" }, saved)).toBe(true);
  });
});
