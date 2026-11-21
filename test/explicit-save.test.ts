// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  createTrip,
  editedTrip,
  saveTrip,
  hasUnsavedChanges,
  reconcileDraft,
  getTrip,
  SAVED_TRIPS_KEY,
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

  // Regression: the cloud merge stamps ownerId onto a new trip after its first
  // sync, which used to flag an untouched trip as "Unsaved".
  it("ignores the ownerId sync stamps on", () => {
    const t = trip();
    expect(hasUnsavedChanges(t, { ...t, ownerId: "user-1" })).toBe(false);
  });

  // A cloud row and a local edit can build the same trip in a different key order.
  it("doesn't care about key order", () => {
    const t = trip();
    const a = { ...t, mode: "booked" as const, bookedDates: [null, null] };
    const b = { ...t, bookedDates: [null, null], mode: "booked" as const };
    expect(hasUnsavedChanges(a, b)).toBe(false);
  });
});

/**
 * The trip page's refresh: what the working copy becomes when storage changes
 * underneath it. Tested as the transition — page open, storage changes, then
 * what the page shows and what Save would write.
 */
describe("reconcileDraft", () => {
  it("an untouched page follows a newer synced copy", () => {
    const before = trip();
    const synced = { ...before, name: "Peru & Thailand", ownerId: "owner-1" };
    const shown = reconcileDraft(before, before, synced);
    expect(shown).toEqual(synced);
    expect(hasUnsavedChanges(shown!, synced)).toBe(false);
  });

  // Regression: comparing the draft with the NEW stored copy made the incoming
  // change look like a local edit, so the page kept the old trip, said
  // "Unsaved", and Save wrote it back over the newer one.
  it("an untouched page picks up a stop that was saved straight away", () => {
    const before = trip();
    const added = editedTrip(before, (d) => d.stops.push(["japan-kyoto", 1]));
    const shown = reconcileDraft(before, before, added);
    expect(shown!.stops).toHaveLength(3);
  });

  it("keeps real edits, taking only ownerId from storage", () => {
    const before = trip();
    const edited = editedTrip(before, (d) => (d.name = "My edit"));
    const synced = { ...before, ownerId: "owner-1" };
    const shown = reconcileDraft(before, edited, synced)!;
    expect(shown.name).toBe("My edit");
    expect(shown.ownerId).toBe("owner-1");
  });

  it("a deleted trip clears the page", () => {
    const before = trip();
    expect(reconcileDraft(before, before, undefined)).toBeUndefined();
  });
});

describe("saveTrip", () => {
  // Regression: a draft opened before sync stamped ownerId used to erase it on Save.
  it("keeps the stored ownerId even if the draft predates it", () => {
    const t = trip();
    const stored = JSON.parse(localStorage.getItem(SAVED_TRIPS_KEY)!);
    stored[0].ownerId = "owner-1";
    localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(stored));
    expect(saveTrip(editedTrip(t, (d) => (d.name = "Renamed")))).toBe(true);
    expect(getTrip(t.id)).toMatchObject({ name: "Renamed", ownerId: "owner-1" });
  });

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
