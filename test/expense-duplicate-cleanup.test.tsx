// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useState } from "react";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { ExpenseSection } from "@/components/ExpenseSection";
import {
  DUP_OK_ENTITY,
  findDuplicateGroups,
  listExpenses,
  saveExpense,
  totalCents,
} from "@/lib/expenses";
import { loadTickSet } from "@/lib/ticks";

/**
 * Reported from the road with 19 real expenses logged and one accidental
 * re-scan among them: "I still see $308.09 and I can't do anything here."
 *
 * Warning at the moment of entry does nothing for a repeat already in the
 * list, and finding it by eye means reading every row on every day while
 * holding three fields in your head. The app knew which rows matched and
 * never said so.
 */

const lunch = { day: "2026-08-06", amountCents: 800, category: "food" } as const;

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function Harness() {
  const [expenses, setExpenses] = useState(() => listExpenses("t1"));
  return (
    <ExpenseSection
      tripId="t1"
      expenses={expenses}
      defaultDay="2026-08-06"
      onChanged={() => setExpenses(listExpenses("t1"))}
    />
  );
}

/** The reported shape: a real list with one accidental repeat inside it. */
function seedRealisticTrip() {
  saveExpense("t1", { day: "2026-08-03", amountCents: 1500, category: "food", note: "newark" }, 1_000);
  saveExpense("t1", { day: "2026-08-04", amountCents: 1600, category: "transport", note: "onward ticket" }, 2_000);
  saveExpense("t1", { day: "2026-08-06", amountCents: 610, category: "food", note: "breakfast" }, 3_000);
  const first = saveExpense("t1", { ...lunch, note: "Dinner (salmon teriyaki)" }, 4_000)!;
  const rescan = saveExpense("t1", { ...lunch, note: "PHO STATION Dinner (salmon teriyaki)" }, 5_000)!;
  return { first, rescan };
}

describe("finding repeats already in the list", () => {
  it("groups rows that match on day, amount and category", () => {
    seedRealisticTrip();
    const groups = findDuplicateGroups(listExpenses("t1"));

    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
    expect(groups[0].every((e) => e.amountCents === 800)).toBe(true);
  });

  it("leaves rows that merely share a day or a price alone", () => {
    seedRealisticTrip();
    const groups = findDuplicateGroups(listExpenses("t1"));
    // Aug 6 also holds a 610 breakfast, and nothing else is 800.
    expect(groups.flat().map((e) => e.amountCents)).toEqual([800, 800]);
  });

  it("orders a group oldest first, since the later one is the re-scan", () => {
    const { first, rescan } = seedRealisticTrip();
    const [group] = findDuplicateGroups(listExpenses("t1"));
    expect(group.map((e) => e.id)).toEqual([first.id, rescan.id]);
  });

  it("says nothing when there is nothing to say", () => {
    saveExpense("t1", lunch, 1_000);
    expect(findDuplicateGroups(listExpenses("t1"))).toEqual([]);
  });
});

describe("acting on a repeat", () => {
  it("surfaces the group without having to scroll the list", () => {
    seedRealisticTrip();
    render(<Harness />);
    expect(screen.getByText(/look like the same food & drink/i)).toBeTruthy();
  });

  it("removes the row you pick, and the total falls by exactly that much", () => {
    const { first, rescan } = seedRealisticTrip();
    const before = totalCents(listExpenses("t1"));
    render(<Harness />);

    const remove = screen
      .getAllByRole("button", { name: /^Remove the .* expense logged at/ })
      .at(-1)!;
    fireEvent.click(remove);

    const left = listExpenses("t1");
    expect(left.map((e) => e.id)).not.toContain(rescan.id);
    expect(left.map((e) => e.id)).toContain(first.id);
    expect(totalCents(left)).toBe(before - 800);
  });

  it("stops warning once the group is gone", () => {
    seedRealisticTrip();
    render(<Harness />);
    fireEvent.click(
      screen.getAllByRole("button", { name: /^Remove the .* expense logged at/ }).at(-1)!
    );
    expect(screen.queryByText(/look like the same/i)).toBeNull();
  });
});

describe("two real spends that happen to match", () => {
  it("can be dismissed, and the dismissal is remembered", () => {
    seedRealisticTrip();
    render(<Harness />);

    fireEvent.click(screen.getByText(/keep both/i));

    expect(screen.queryByText(/look like the same/i)).toBeNull();
    // Persisted as a tick so it survives a reload and reaches other devices,
    // rather than living in component state until the next render.
    expect(loadTickSet(DUP_OK_ENTITY, "t1").size).toBe(1);
  });

  it("keeps both rows — dismissing is not a delete", () => {
    seedRealisticTrip();
    const before = listExpenses("t1").length;
    render(<Harness />);
    fireEvent.click(screen.getByText(/keep both/i));
    expect(listExpenses("t1")).toHaveLength(before);
  });
});
