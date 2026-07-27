// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  saveExpense,
  listExpenses,
  removeExpense,
  totalCents,
  parseAmountToCents,
} from "@/lib/expenses";

/**
 * Editing a logged expense. saveExpense always supported replace-by-id; the
 * list only offered Delete, so a mistyped amount could only be removed and
 * re-entered. These pin the behaviour the Edit control now reaches.
 */

const T0 = 1_700_000_000_000;

beforeEach(() => localStorage.clear());

function log(amountCents: number, extra: Partial<Parameters<typeof saveExpense>[1]> = {}) {
  return saveExpense(
    "t",
    { day: "2026-09-05", amountCents, category: "food", ...extra },
    T0
  )!;
}

describe("editing a logged expense", () => {
  it("replaces in place rather than adding a second row", () => {
    const first = log(1250, { note: "lunch" });
    log(4000);

    saveExpense(
      "t",
      { id: first.id, day: "2026-09-05", amountCents: 1500, category: "food", note: "lunch" },
      T0 + 1000
    );

    const rows = listExpenses("t");
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === first.id)!.amountCents).toBe(1500);
    // The corrected amount, not the old one plus a duplicate.
    expect(totalCents(rows)).toBe(5500);
  });

  it("can change every field, not just the amount", () => {
    const e = log(1250, { note: "lunch" });

    saveExpense(
      "t",
      {
        id: e.id,
        day: "2026-09-09",
        amountCents: 800,
        category: "transport",
        note: "bus to the airport",
      },
      T0 + 1000
    );

    const [row] = listExpenses("t");
    expect(row.id).toBe(e.id);
    expect(row.day).toBe("2026-09-09");
    expect(row.category).toBe("transport");
    expect(row.note).toBe("bus to the airport");
  });

  it("round-trips the amount back through the input format", () => {
    // The form shows cents as plain digits and re-parses what's typed; a
    // formatted "$12.50" would still parse, but the field shouldn't show it.
    const e = log(1250);
    const shown = (e.amountCents / 100).toFixed(2);
    expect(shown).toBe("12.50");
    expect(parseAmountToCents(shown)).toBe(1250);
  });

  it("rejects an edit that clears the amount, leaving the row intact", () => {
    const e = log(1250);
    const bad = saveExpense(
      "t",
      { id: e.id, day: "2026-09-05", amountCents: 0, category: "food" },
      T0 + 1000
    );

    expect(bad).toBeNull();
    expect(listExpenses("t")[0].amountCents).toBe(1250);
  });

  it("a deleted row stays gone even if an edit was open on it", () => {
    const e = log(1250);
    removeExpense("t", e.id);
    expect(listExpenses("t")).toEqual([]);
  });
});
