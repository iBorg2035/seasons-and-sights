// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  parseAmountToCents,
  formatCents,
  listExpenses,
  saveExpense,
  removeExpense,
  totalCents,
  totalsByCategory,
  totalForDay,
  MAX_AMOUNT_CENTS,
  type Expense,
} from "@/lib/expenses";

const T0 = 1_700_000_000_000;

beforeEach(() => {
  localStorage.clear();
});

describe("parseAmountToCents", () => {
  it("parses plain and decimal amounts exactly", () => {
    expect(parseAmountToCents("12")).toBe(1200);
    expect(parseAmountToCents("12.5")).toBe(1250);
    expect(parseAmountToCents("12.50")).toBe(1250);
    expect(parseAmountToCents("0.01")).toBe(1);
  });

  it("does not round wrong on values float arithmetic gets wrong", () => {
    // Math.round(1.005 * 100) is 100, because 1.005 isn't representable in
    // binary floating point. Parsing the decimal string avoids that entirely.
    expect(parseAmountToCents("1.005")).toBe(101);
    expect(parseAmountToCents("8.615")).toBe(862);
  });

  it("rounds the third decimal rather than truncating it", () => {
    expect(parseAmountToCents("1.234")).toBe(123);
    expect(parseAmountToCents("1.236")).toBe(124);
  });

  it("tolerates currency symbols, commas and padding", () => {
    expect(parseAmountToCents(" $1,234.56 ")).toBe(123456);
  });

  it("rejects anything that isn't a usable positive amount", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents(".")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("0")).toBeNull();
    expect(parseAmountToCents("0.00")).toBeNull();
    // Refunds are a real thing, but they aren't this — storing one silently
    // would understate a category total.
    expect(parseAmountToCents("-5")).toBeNull();
    expect(parseAmountToCents("1e5")).toBeNull();
  });

  it("rejects an amount past the typo guard", () => {
    expect(parseAmountToCents(String(MAX_AMOUNT_CENTS / 100))).toBe(
      MAX_AMOUNT_CENTS
    );
    expect(parseAmountToCents(String(MAX_AMOUNT_CENTS / 100 + 1))).toBeNull();
  });
});

describe("formatCents", () => {
  it("always shows cents, because a logged expense is exact", () => {
    expect(formatCents(1250)).toBe("$12.50");
    expect(formatCents(1200)).toBe("$12.00");
    expect(formatCents(123456)).toBe("$1,234.56");
    expect(formatCents(0)).toBe("$0.00");
  });
});

describe("saveExpense", () => {
  it("creates an expense and reads it back", () => {
    const saved = saveExpense(
      "t",
      { day: "2026-09-05", amountCents: 1250, category: "food", note: "lunch" },
      T0
    );

    expect(saved).not.toBeNull();
    expect(listExpenses("t")).toHaveLength(1);
    expect(listExpenses("t")[0].amountCents).toBe(1250);
  });

  it("edits in place when given an existing id", () => {
    const first = saveExpense(
      "t",
      { day: "2026-09-05", amountCents: 1000, category: "food" },
      T0
    )!;
    saveExpense(
      "t",
      { id: first.id, day: "2026-09-05", amountCents: 2000, category: "food" },
      T0 + 1000
    );

    expect(listExpenses("t")).toHaveLength(1);
    expect(listExpenses("t")[0].amountCents).toBe(2000);
  });

  it("rejects amounts that aren't positive whole cents", () => {
    const bad = [0, -100, 12.5, NaN, MAX_AMOUNT_CENTS + 1];
    for (const amountCents of bad) {
      expect(
        saveExpense("t", { day: "2026-09-05", amountCents, category: "food" }, T0)
      ).toBeNull();
    }
    expect(listExpenses("t")).toEqual([]);
  });

  it("rejects an unknown category rather than storing it", () => {
    expect(
      saveExpense(
        "t",
        {
          day: "2026-09-05",
          amountCents: 100,
          category: "bribes" as never,
        },
        T0
      )
    ).toBeNull();
  });

  it("drops a blank note instead of storing an empty string", () => {
    const saved = saveExpense(
      "t",
      { day: "2026-09-05", amountCents: 100, category: "food", note: "   " },
      T0
    )!;
    expect(saved.note).toBeUndefined();
  });

  it("keeps expenses on separate trips apart", () => {
    saveExpense("trip-a", { day: "2026-09-05", amountCents: 100, category: "food" }, T0);
    expect(listExpenses("trip-b")).toEqual([]);
    expect(listExpenses("trip-a")).toHaveLength(1);
  });
});

describe("removeExpense", () => {
  it("hides the expense and stops it counting toward totals", () => {
    const saved = saveExpense(
      "t",
      { day: "2026-09-05", amountCents: 5000, category: "food" },
      T0
    )!;
    saveExpense("t", { day: "2026-09-05", amountCents: 1000, category: "food" }, T0);

    removeExpense("t", saved.id);

    expect(listExpenses("t")).toHaveLength(1);
    expect(totalCents(listExpenses("t"))).toBe(1000);
  });
});

describe("totals", () => {
  const rows: Expense[] = [
    { id: "1", day: "2026-09-05", amountCents: 1250, category: "food", updatedAt: T0 },
    { id: "2", day: "2026-09-05", amountCents: 8000, category: "lodging", updatedAt: T0 },
    { id: "3", day: "2026-09-06", amountCents: 350, category: "food", updatedAt: T0 },
  ];

  it("sums exactly, with no float drift", () => {
    expect(totalCents(rows)).toBe(9600);
    expect(formatCents(totalCents(rows))).toBe("$96.00");
  });

  it("sums a long run of odd cents without drifting", () => {
    // 1000 × $0.07 must be exactly $70.00 — the reason amounts are integers.
    const many: Expense[] = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i),
      day: "2026-09-05",
      amountCents: 7,
      category: "food",
      updatedAt: T0,
    }));
    expect(totalCents(many)).toBe(7000);
  });

  it("reports every category, including the empty ones", () => {
    const totals = totalsByCategory(rows);
    expect(totals.food).toBe(1600);
    expect(totals.lodging).toBe(8000);
    expect(totals.transport).toBe(0);
    expect(totals.activities).toBe(0);
    expect(totals.other).toBe(0);
  });

  it("totals a single day", () => {
    expect(totalForDay(rows, "2026-09-05")).toBe(9250);
    expect(totalForDay(rows, "2026-09-06")).toBe(350);
    expect(totalForDay(rows, "2026-12-25")).toBe(0);
  });

  it("totals nothing as zero, not NaN", () => {
    expect(totalCents([])).toBe(0);
    expect(totalForDay([], "2026-09-05")).toBe(0);
  });
});
