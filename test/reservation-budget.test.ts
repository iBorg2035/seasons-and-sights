// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  saveReservation,
  listReservations,
  reservationTotalCents,
  removeReservation,
} from "@/lib/reservations";
import { saveExpense, listExpenses, totalCents } from "@/lib/expenses";

/**
 * Reservations count toward spending alongside expenses. The point of folding
 * them in: a hotel recorded as a reservation would otherwise have to be
 * re-entered as an expense, and most people wouldn't — so the budget would
 * quietly read low exactly where the biggest number is.
 */

const T0 = 1_700_000_000_000;

beforeEach(() => localStorage.clear());

/** Mirrors RouteSection's `spentCents`. */
function spent(tripId: string): number {
  return (
    totalCents(listExpenses(tripId)) +
    reservationTotalCents(listReservations(tripId))
  );
}

describe("spend including reservations", () => {
  it("adds a booked stay to logged expenses", () => {
    saveExpense("t", { day: "2026-08-11", amountCents: 4275, category: "food" }, T0);
    saveReservation(
      "t",
      { kind: "stay", regionId: "vietnam-hoian", amountCents: 42000 },
      T0
    );

    expect(spent("t")).toBe(46275);
  });

  it("counts a flight as spending too", () => {
    saveReservation(
      "t",
      { kind: "flight", regionId: "vietnam-hoian", amountCents: 31050 },
      T0
    );
    expect(spent("t")).toBe(31050);
  });

  it("ignores a reservation with no price yet", () => {
    // A confirmation number saved before you know the total shouldn't invent
    // a zero-cost booking or a NaN.
    saveReservation(
      "t",
      { kind: "stay", regionId: "vietnam-hoian", reference: "BK-1" },
      T0
    );
    expect(spent("t")).toBe(0);
  });

  it("replaces rather than doubles when a reservation is edited", () => {
    const r = saveReservation(
      "t",
      { kind: "stay", regionId: "vietnam-hoian", amountCents: 42000 },
      T0
    )!;
    expect(spent("t")).toBe(42000);

    saveReservation(
      "t",
      { id: r.id, kind: "stay", regionId: "vietnam-hoian", amountCents: 30000 },
      T0 + 1000
    );
    expect(spent("t")).toBe(30000);
  });

  it("stops counting a deleted reservation", () => {
    const r = saveReservation(
      "t",
      { kind: "stay", regionId: "vietnam-hoian", amountCents: 42000 },
      T0
    )!;
    removeReservation("t", r.id);
    expect(spent("t")).toBe(0);
  });

  it("keeps one trip's spend out of another's", () => {
    saveReservation(
      "t",
      { kind: "stay", regionId: "vietnam-hoian", amountCents: 42000 },
      T0
    );
    expect(spent("other")).toBe(0);
  });
});
