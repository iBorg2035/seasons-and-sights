// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  createTrip,
  editedTrip,
  saveTrip,
  hasUnsavedChanges,
  getTrip,
  type SavedTripLite,
} from "@/lib/saved-trips";

/**
 * The trip page edits a working copy and only writes on Save. The property
 * that matters is that nothing reaches storage in between — an edit that
 * leaked through would make the Save button a lie.
 */

const STOPS: [string, number][] = [
  ["peru-cusco", 1],
  ["thailand-bangkok", 1],
];

function trip(): SavedTripLite {
  return createTrip("Draft test", { start: 9, stops: STOPS })!;
}

beforeEach(() => localStorage.clear());

describe("editedTrip", () => {
  it("leaves storage untouched", () => {
    const t = trip();
    const draft = editedTrip(t, (d) => {
      d.name = "Renamed";
      d.stops.push(["japan-kyoto", 2]);
    });

    expect(draft.name).toBe("Renamed");
    expect(draft.stops).toHaveLength(3);
    // The whole point: the stored copy has not moved.
    expect(getTrip(t.id)!.name).toBe("Draft test");
    expect(getTrip(t.id)!.stops).toHaveLength(2);
  });

  it("does not mutate the copy it was given", () => {
    const t = trip();
    editedTrip(t, (d) => d.stops.push(["japan-kyoto", 1]));
    expect(t.stops).toHaveLength(2);
  });

  it("keeps bookedDates aligned, like updateTrip does", () => {
    const t = createTrip("Booked", {
      start: 9,
      stops: STOPS,
      mode: "booked",
      bookedDates: [
        { start: "2026-09-03", end: "2026-09-12" },
        { start: "2026-10-01", end: "2026-10-08" },
      ],
    })!;

    const draft = editedTrip(t, (d) => d.stops.push(["japan-kyoto", 1]));

    // The new stop gets a null slot rather than leaving the arrays ragged.
    expect(draft.bookedDates).toHaveLength(3);
    expect(draft.bookedDates![2]).toBeNull();
  });

  it("does not stamp updatedAt, so a draft isn't dirty just for existing", () => {
    const t = trip();
    const untouched = editedTrip(t, () => {});
    expect(untouched.updatedAt).toBe(t.updatedAt);
    expect(hasUnsavedChanges(untouched, t)).toBe(false);
  });
});

describe("hasUnsavedChanges", () => {
  it("sees a real edit", () => {
    const t = trip();
    expect(hasUnsavedChanges(editedTrip(t, (d) => (d.start = 3)), t)).toBe(true);
  });

  it("ignores the save timestamp on its own", () => {
    const t = trip();
    expect(hasUnsavedChanges({ ...t, updatedAt: t.updatedAt! + 5000 }, t)).toBe(
      false
    );
  });

  it("notices a stay length change", () => {
    const t = trip();
    const draft = editedTrip(t, (d) => (d.stops[0][1] = 2));
    expect(hasUnsavedChanges(draft, t)).toBe(true);
  });
});

describe("saveTrip", () => {
  it("commits the working copy and stamps the save time", () => {
    const t = trip();
    const draft = editedTrip(t, (d) => (d.name = "Committed"));

    expect(saveTrip(draft)).toBe(true);

    const stored = getTrip(t.id)!;
    expect(stored.name).toBe("Committed");
    expect(stored.updatedAt!).toBeGreaterThanOrEqual(t.updatedAt!);
    expect(hasUnsavedChanges(draft, stored)).toBe(false);
  });

  it("refuses a trip that no longer exists rather than resurrecting it", () => {
    const t = trip();
    const draft = editedTrip(t, (d) => (d.name = "Gone"));
    localStorage.setItem("seasons-saved-trips", "[]");
    expect(saveTrip(draft)).toBe(false);
  });

  it("stores a snapshot, not a live reference", () => {
    const t = trip();
    const draft = editedTrip(t, (d) => (d.name = "First"));
    saveTrip(draft);
    draft.name = "Mutated after save";
    expect(getTrip(t.id)!.name).toBe("First");
  });
});
