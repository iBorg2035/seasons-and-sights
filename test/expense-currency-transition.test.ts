// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { listExpenses, saveExpense, totalCents } from "@/lib/expenses";
import { loadRates, rateFor, setRate } from "@/lib/fx";

/**
 * The transition, not the state — AGENTS.md. Per-trip storage has produced a
 * cross-trip leak in this app before, and a rate is exactly the kind of value
 * that looks per-trip until the day it isn't.
 */

const A = "trip-a";
const B = "trip-b";
const VND = { amountMinor: 250000, currency: "VND", unitsPerUsd: 25400 } as const;

beforeEach(() => localStorage.clear());

describe("logging in đồng on one trip, then opening another", () => {
  it("leaves the other trip's expenses and rates untouched", () => {
    saveExpense(A, {
      day: "2026-08-12",
      amountCents: 984,
      category: "food",
      foreign: { ...VND },
    });
    setRate(A, "VND", 25400);

    // → switch to B
    expect(listExpenses(B)).toHaveLength(0);
    expect(totalCents(listExpenses(B))).toBe(0);
    expect(loadRates(B).VND).toBeUndefined();
    // B falls back to the shared suggestion rather than inheriting A's rate.
    expect(rateFor(B, "VND")?.source).toBe("suggested");

    // → back to A
    const [kept] = listExpenses(A);
    expect(kept.foreign).toEqual(VND);
    expect(kept.amountCents).toBe(984);
    expect(rateFor(A, "VND")).toEqual({ unitsPerUsd: 25400, source: "trip" });
  });

  it("keeps two trips' rates for the same currency apart", () => {
    // Two visits, months apart, at genuinely different rates.
    setRate(A, "VND", 25400);
    setRate(B, "VND", 26800);

    expect(rateFor(A, "VND")?.unitsPerUsd).toBe(25400);
    expect(rateFor(B, "VND")?.unitsPerUsd).toBe(26800);
  });

  it("does not restate trip A's expenses when trip B sets its own rate", () => {
    saveExpense(A, {
      day: "2026-08-12",
      amountCents: 984,
      category: "food",
      foreign: { ...VND },
    });
    setRate(B, "VND", 30000);

    expect(listExpenses(A)[0].amountCents).toBe(984);
    expect(listExpenses(A)[0].foreign?.unitsPerUsd).toBe(25400);
  });
});
