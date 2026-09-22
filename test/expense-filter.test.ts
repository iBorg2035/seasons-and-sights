// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import {
  NO_EXPENSE_FILTER,
  filterExpenses,
  isFilterActive,
  placesForExpenses,
  sortExpenses,
  totalCents,
  type Expense,
} from "@/lib/expenses";

/**
 * Narrowing the expense list. The filter is a view: it must never be able to
 * change what is stored, and "nothing selected" must mean everything rather
 * than nothing — an empty category list showing an empty list is the bug this
 * whole file exists to keep out.
 */

const T0 = 1_700_000_000_000;

function e(
  id: string,
  day: string,
  amountCents: number,
  category: Expense["category"],
  note?: string
): Expense {
  return { id, day, amountCents, category, note, updatedAt: T0 };
}

const ROWS: Expense[] = [
  e("a", "2026-09-01", 1200, "food", "Pho at the market"),
  e("b", "2026-09-01", 8000, "lodging", "Hanoi guesthouse"),
  e("c", "2026-09-04", 450, "transport", "Grab to the bus"),
  e("d", "2026-09-05", 25000, "lodging", "Beach hotel"),
  e("f", "2026-09-05", 1200, "food"),
];

/** Days 1–3 in Hanoi, 4–6 in Hoi An, anything else off-itinerary. */
const placeOf = (day: string) =>
  day <= "2026-09-03" ? "Hanoi" : day <= "2026-09-06" ? "Hoi An" : null;

const ids = (rows: Expense[]) => rows.map((r) => r.id);

describe("filterExpenses", () => {
  it("shows everything when nothing is selected", () => {
    expect(filterExpenses(ROWS, NO_EXPENSE_FILTER, placeOf)).toHaveLength(5);
    expect(isFilterActive(NO_EXPENSE_FILTER)).toBe(false);
  });

  it("narrows to one category", () => {
    const rows = filterExpenses(
      ROWS,
      { ...NO_EXPENSE_FILTER, categories: ["lodging"] },
      placeOf
    );
    expect(ids(rows)).toEqual(["b", "d"]);
  });

  it("treats several categories as an either/or, not an and", () => {
    const rows = filterExpenses(
      ROWS,
      { ...NO_EXPENSE_FILTER, categories: ["lodging", "food"] },
      placeOf
    );
    expect(ids(rows)).toEqual(["a", "b", "d", "f"]);
  });

  it("matches notes case-insensitively, ignoring stray spaces", () => {
    const rows = filterExpenses(
      ROWS,
      { ...NO_EXPENSE_FILTER, query: "  HOTEL " },
      placeOf
    );
    expect(ids(rows)).toEqual(["d"]);
  });

  it("does not match a note's absence, or the category name", () => {
    // Row f has no note. A search must not quietly match every unnoted row,
    // and "food" is a chip, not a search term.
    expect(
      filterExpenses(ROWS, { ...NO_EXPENSE_FILTER, query: "food" }, placeOf)
    ).toHaveLength(0);
  });

  it("filters by the destination the day falls in", () => {
    const rows = filterExpenses(
      ROWS,
      { ...NO_EXPENSE_FILTER, place: "Hanoi" },
      placeOf
    );
    expect(ids(rows)).toEqual(["a", "b"]);
  });

  it("leaves an off-itinerary day out of every destination", () => {
    const stray = [...ROWS, e("z", "2026-10-20", 500, "other", "after the trip")];
    const rows = filterExpenses(stray, { ...NO_EXPENSE_FILTER, place: "Hoi An" }, placeOf);
    expect(ids(rows)).toEqual(["c", "d", "f"]);
  });

  it("offers no destination filter at all without a resolver", () => {
    // Undated trip: asking for a place can't be satisfied, and must not
    // silently fall through to showing everything.
    expect(filterExpenses(ROWS, { ...NO_EXPENSE_FILTER, place: "Hanoi" })).toHaveLength(0);
  });

  it("treats the date range as inclusive at both ends", () => {
    const rows = filterExpenses(
      ROWS,
      { ...NO_EXPENSE_FILTER, from: "2026-09-01", to: "2026-09-04" },
      placeOf
    );
    expect(ids(rows)).toEqual(["a", "b", "c"]);
  });

  it("takes an open-ended range from either side", () => {
    expect(
      ids(filterExpenses(ROWS, { ...NO_EXPENSE_FILTER, from: "2026-09-05" }, placeOf))
    ).toEqual(["d", "f"]);
    expect(
      ids(filterExpenses(ROWS, { ...NO_EXPENSE_FILTER, to: "2026-09-01" }, placeOf))
    ).toEqual(["a", "b"]);
  });

  it("combines the axes as an and", () => {
    const rows = filterExpenses(
      ROWS,
      {
        categories: ["lodging"],
        query: "hotel",
        place: "Hoi An",
        from: "2026-09-04",
        to: "2026-09-06",
      },
      placeOf
    );
    expect(ids(rows)).toEqual(["d"]);
  });

  it("returns nothing rather than everything for a backwards range", () => {
    expect(
      filterExpenses(ROWS, { ...NO_EXPENSE_FILTER, from: "2026-09-05", to: "2026-09-01" }, placeOf)
    ).toHaveLength(0);
  });

  it("never mutates or drops the underlying rows", () => {
    const before = JSON.stringify(ROWS);
    filterExpenses(ROWS, { ...NO_EXPENSE_FILTER, categories: ["food"] }, placeOf);
    expect(JSON.stringify(ROWS)).toBe(before);
    // The trip total is a fact about the trip, not about what's on screen.
    expect(totalCents(ROWS)).toBe(35850);
  });
});

describe("isFilterActive", () => {
  it("counts every axis", () => {
    expect(isFilterActive({ ...NO_EXPENSE_FILTER, categories: ["food"] })).toBe(true);
    expect(isFilterActive({ ...NO_EXPENSE_FILTER, query: "x" })).toBe(true);
    expect(isFilterActive({ ...NO_EXPENSE_FILTER, place: "Hanoi" })).toBe(true);
    expect(isFilterActive({ ...NO_EXPENSE_FILTER, from: "2026-09-01" })).toBe(true);
    expect(isFilterActive({ ...NO_EXPENSE_FILTER, to: "2026-09-01" })).toBe(true);
  });

  it("ignores a query of pure whitespace", () => {
    expect(isFilterActive({ ...NO_EXPENSE_FILTER, query: "   " })).toBe(false);
  });
});

describe("sortExpenses", () => {
  it("puts the biggest spend first", () => {
    // a and f are both $12; the later day wins the tie.
    expect(ids(sortExpenses(ROWS, "amount"))).toEqual(["d", "b", "f", "a", "c"]);
  });

  it("keeps newest-first as the default order", () => {
    expect(ids(sortExpenses(ROWS, "day"))).toEqual(["d", "f", "c", "a", "b"]);
  });

  it("sorts a copy, leaving the caller's list alone", () => {
    const rows = [...ROWS];
    sortExpenses(rows, "amount");
    expect(ids(rows)).toEqual(["a", "b", "c", "d", "f"]);
  });

  it("breaks amount ties by day so equal rows don't shuffle", () => {
    const tied = sortExpenses([e("x", "2026-09-01", 1200, "food"), e("y", "2026-09-05", 1200, "food")], "amount");
    expect(ids(tied)).toEqual(["y", "x"]);
  });
});

describe("placesForExpenses", () => {
  it("lists each destination once, in itinerary order", () => {
    expect(placesForExpenses(ROWS, placeOf)).toEqual(["Hanoi", "Hoi An"]);
  });

  it("offers no place for days the itinerary doesn't cover", () => {
    expect(placesForExpenses([e("z", "2026-10-20", 500, "other")], placeOf)).toEqual([]);
  });
});
