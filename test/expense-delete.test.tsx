// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useState } from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { ExpenseSection } from "@/components/ExpenseSection";
import { listExpenses, saveExpense } from "@/lib/expenses";

/**
 * Reported as "I have multiple receipts logged and can't delete the wrong one".
 * The rows being indistinguishable is one half of that; this covers the other:
 * pressing Delete on a specific row has to remove that row and no other.
 */

const base = { day: "2026-08-12", amountCents: 984, category: "food" } as const;

beforeEach(() => localStorage.clear());
afterEach(cleanup);

/** Re-reads storage on every change, exactly as the journal page does. */
function Harness() {
  const [expenses, setExpenses] = useState(() => listExpenses("t1"));
  return (
    <ExpenseSection
      tripId="t1"
      expenses={expenses}
      defaultDay="2026-08-12"
      onChanged={() => setExpenses(listExpenses("t1"))}
    />
  );
}

describe("deleting one of two identical expenses", () => {
  it("removes exactly the row whose button was pressed", () => {
    const older = saveExpense("t1", { ...base, note: "Cua Dai" }, 1_000_000)!;
    const newer = saveExpense("t1", base, 2_000_000)!;

    render(<Harness />);

    const buttons = [...document.querySelectorAll("button")].filter((b) =>
      b.getAttribute("aria-label")?.startsWith("Delete")
    );
    expect(buttons).toHaveLength(2);

    // Their accessible names must differ, or there is no way to aim at one.
    expect(buttons[0].getAttribute("aria-label")).not.toBe(
      buttons[1].getAttribute("aria-label")
    );

    // Newest first, so the second button is the older row.
    fireEvent.click(buttons[1]);

    const left = listExpenses("t1");
    expect(left.map((e) => e.id)).toEqual([newer.id]);
    expect(left.map((e) => e.id)).not.toContain(older.id);
  });

  it("drops the row from the rendered list, not just from storage", () => {
    saveExpense("t1", base, 1_000_000);
    saveExpense("t1", base, 2_000_000);

    render(<Harness />);
    const first = [...document.querySelectorAll("button")].find((b) =>
      b.getAttribute("aria-label")?.startsWith("Delete")
    )!;
    fireEvent.click(first);

    expect(
      [...document.querySelectorAll("button")].filter((b) =>
        b.getAttribute("aria-label")?.startsWith("Delete")
      )
    ).toHaveLength(1);
  });
});
