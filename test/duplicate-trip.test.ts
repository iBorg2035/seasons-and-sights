// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { createTrip, duplicateTrip, getSavedTrips, getTrip } from "@/lib/saved-trips";
import { saveExpense, listExpenses } from "@/lib/expenses";

describe("duplicateTrip", () => {
  beforeEach(() => localStorage.clear());

  it("copies the plan under a new id and a '(copy)' name", () => {
    const source = createTrip("Winter loop", {
      start: 11,
      stops: [
        ["thailand-bangkok", 1],
        ["vietnam-hoian", 2],
      ],
      interests: ["beach"],
      mode: "booked",
      bookedDates: [{ start: "2026-11-01", end: "2026-11-10" }, null],
    })!;

    const copy = duplicateTrip(source)!;

    expect(copy.id).not.toBe(source.id);
    expect(copy.name).toBe("Winter loop (copy)");
    expect(copy.start).toBe(11);
    expect(copy.stops).toEqual(source.stops);
    expect(copy.interests).toEqual(["beach"]);
    expect(copy.mode).toBe("booked");
    expect(copy.bookedDates).toEqual(source.bookedDates);
    expect(getSavedTrips()).toHaveLength(2);
  });

  it("shares no structure with the source, so editing one leaves the other alone", () => {
    const source = createTrip("A", {
      stops: [["thailand-bangkok", 1]],
      bookedDates: [{ start: "2026-11-01", end: "2026-11-10" }],
    })!;
    const copy = duplicateTrip(source)!;

    copy.stops[0][1] = 9;
    copy.bookedDates![0]!.end = "2099-01-01";

    expect(source.stops[0][1]).toBe(1);
    expect(source.bookedDates![0]!.end).toBe("2026-11-10");
  });

  it("does not carry the owner across — a copy of a shared trip is yours", () => {
    const source = { ...createTrip("Shared")!, ownerId: "someone-else" };
    const copy = duplicateTrip(source)!;
    expect(getTrip(copy.id)?.ownerId).toBeUndefined();
  });

  // The transition test: do X on A, copy to B, assert B is clean, A kept.
  it("leaves the source's expenses on the source and gives the copy none", () => {
    const source = createTrip("With spending")!;
    saveExpense(source.id, { day: "2026-11-02", amountCents: 1250, category: "food" });

    const copy = duplicateTrip(source)!;

    expect(listExpenses(copy.id)).toEqual([]);
    expect(listExpenses(source.id)).toHaveLength(1);
  });
});
