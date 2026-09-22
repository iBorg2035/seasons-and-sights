// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { ExpenseSection } from "@/components/ExpenseSection";
import { listExpenses, saveExpense } from "@/lib/expenses";
import type { DayStamp } from "@/lib/saved-trips";
import { useCallback, useState } from "react";

/**
 * The filter as the page wires it up. The lib tests cover which rows match;
 * these cover the parts only the component can get wrong — the breakdown
 * tiles doubling as the category control, a filter outliving the trip it was
 * typed for, and hidden rows still being there when the filter clears.
 */

const T0 = 1_700_000_000_000;

/** Days 1–3 in Hanoi, 4–6 in Hoi An. */
const placeFor = (day: DayStamp) =>
  day <= "2026-09-03"
    ? { name: "Hanoi" }
    : day <= "2026-09-06"
      ? { name: "Hoi An" }
      : null;

function seed(tripId: string) {
  const rows: [string, number, Parameters<typeof saveExpense>[1]["category"], string][] = [
    ["2026-09-01", 1200, "food", "Pho at the market"],
    ["2026-09-01", 8000, "lodging", "Hanoi guesthouse"],
    ["2026-09-04", 450, "transport", "Grab to the bus"],
    ["2026-09-05", 25000, "lodging", "Beach hotel"],
    ["2026-09-05", 1600, "food", "Banh mi"],
  ];
  rows.forEach(([day, amountCents, category, note], i) =>
    saveExpense(tripId, { day, amountCents, category, note }, T0 + i)
  );
}

/** Reloads from storage on change, the way the journal page does. */
function Harness({ tripId }: { tripId: string }) {
  const [expenses, setExpenses] = useState(() => listExpenses(tripId));
  const onChanged = useCallback(() => setExpenses(listExpenses(tripId)), [tripId]);
  return (
    <ExpenseSection
      tripId={tripId}
      expenses={expenses}
      defaultDay="2026-09-01"
      onChanged={onChanged}
      placeFor={placeFor}
    />
  );
}

/** The notes currently listed, in the order they're rendered. */
function shownNotes(): string[] {
  return ["Pho at the market", "Hanoi guesthouse", "Grab to the bus", "Beach hotel", "Banh mi", "Coffee"]
    .map((n) => [n, screen.queryByText(n)] as const)
    .filter(([, el]) => el !== null)
    .sort(
      ([, a], [, b]) =>
        // Document order, so sort assertions mean something.
        a!.compareDocumentPosition(b!) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    )
    .map(([n]) => n);
}

const tile = (name: RegExp) => screen.getByRole("button", { name });

/** The filter panel, which owns the Sort control — not the entry form. */
const panel = () =>
  screen.getByLabelText("Sort").closest("div.rounded-2xl") as HTMLElement;

const summary = () =>
  within(panel()).getByRole("status").textContent?.replace(/\s+/g, " ").trim();

beforeEach(() => {
  localStorage.clear();
  seed("t1");
});
afterEach(cleanup);

describe("filtering the expense list", () => {
  it("uses the breakdown tiles as the category filter", () => {
    render(<Harness tripId="t1" />);
    expect(shownNotes()).toHaveLength(5);

    fireEvent.click(tile(/^Lodging/));

    expect(shownNotes()).toEqual(["Beach hotel", "Hanoi guesthouse"]);
    expect(tile(/^Lodging/).getAttribute("aria-pressed")).toBe("true");
    expect(summary()).toBe("Showing 2 of 5 · $330.00");
  });

  it("lets two categories be asked for at once, and toggles back off", () => {
    render(<Harness tripId="t1" />);
    fireEvent.click(tile(/^Lodging/));
    fireEvent.click(tile(/^Food & drink/));
    expect(shownNotes()).toHaveLength(4);

    fireEvent.click(tile(/^Lodging/));
    expect(shownNotes()).toEqual(["Banh mi", "Pho at the market"]);
  });

  it("hides rows without touching them — clearing brings all five back", () => {
    render(<Harness tripId="t1" />);
    fireEvent.click(tile(/^Lodging/));
    expect(shownNotes()).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(shownNotes()).toHaveLength(5);
    // And nothing was written on the way through.
    expect(listExpenses("t1")).toHaveLength(5);
  });

  it("searches the notes", () => {
    render(<Harness tripId="t1" />);
    fireEvent.change(screen.getByLabelText("Search notes"), {
      target: { value: "banh" },
    });
    expect(shownNotes()).toEqual(["Banh mi"]);
  });

  it("filters to a destination, and keeps every destination on offer", () => {
    render(<Harness tripId="t1" />);
    const select = screen.getByLabelText("Destination") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "Hanoi" } });

    expect(shownNotes()).toEqual(["Hanoi guesthouse", "Pho at the market"]);
    // Hoi An must still be selectable, or the filter is a one-way door.
    expect([...select.options].map((o) => o.value)).toEqual(["", "Hanoi", "Hoi An"]);
  });

  it("narrows to a stretch of days", () => {
    render(<Harness tripId="t1" />);
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-04" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-09-04" } });
    expect(shownNotes()).toEqual(["Grab to the bus"]);
  });

  it("reorders to biggest-first without changing what's shown", () => {
    render(<Harness tripId="t1" />);
    fireEvent.change(screen.getByLabelText("Sort"), { target: { value: "amount" } });
    expect(shownNotes()).toEqual([
      "Beach hotel",
      "Hanoi guesthouse",
      "Banh mi",
      "Pho at the market",
      "Grab to the bus",
    ]);
  });

  it("re-totals the tiles for the slice, leaving the trip total alone", () => {
    render(<Harness tripId="t1" />);
    // Lodging across the trip is $330; in Hanoi it's $80. The heading keeps
    // answering "what has this trip cost".
    expect(tile(/^Lodging, \$330\.00/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Destination"), {
      target: { value: "Hanoi" },
    });
    expect(tile(/^Lodging, \$80\.00/)).toBeTruthy();
    expect(screen.getByText("$362.50")).toBeTruthy();
  });

  it("says so when nothing matches, instead of looking empty", () => {
    render(<Harness tripId="t1" />);
    fireEvent.change(screen.getByLabelText("Search notes"), {
      target: { value: "sleeper train" },
    });
    expect(shownNotes()).toHaveLength(0);
    expect(screen.getByText(/No expenses match these filters/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Clear them" }));
    expect(shownNotes()).toHaveLength(5);
  });

  it("keeps a just-added expense visible instead of filtering it away", () => {
    // Filter to lodging, then log a coffee. The row is saved either way; the
    // question is whether the form appears to have swallowed it.
    render(<Harness tripId="t1" />);
    fireEvent.click(tile(/^Lodging/));
    expect(shownNotes()).toHaveLength(2);

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "3.50" } });
    fireEvent.change(screen.getByLabelText("Note (optional)"), {
      target: { value: "Coffee" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.queryByText("Coffee")).not.toBeNull();
    expect(tile(/^Lodging/).getAttribute("aria-pressed")).toBe("false");
    expect(listExpenses("t1")).toHaveLength(6);
  });

  it("leaves the filter alone when the new row matches it", () => {
    render(<Harness tripId="t1" />);
    fireEvent.click(tile(/^Food & drink/));

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "3.50" } });
    fireEvent.change(screen.getByLabelText("Note (optional)"), {
      target: { value: "Coffee" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.queryByText("Coffee")).not.toBeNull();
    // Still narrowed — nothing was hidden, so nothing needed clearing.
    expect(tile(/^Food & drink/).getAttribute("aria-pressed")).toBe("true");
    // Coffee lands on the form's default day (Sep 1), newest edit first.
    expect(shownNotes()).toEqual(["Banh mi", "Coffee", "Pho at the market"]);
  });

  it("keeps the sort control on screen while it is still reordering", () => {
    // Six rows sorted biggest-first, then deleted down to four: the panel's
    // row threshold must not take the only way back to day order with it.
    render(<Harness tripId="t1" />);
    fireEvent.change(screen.getByLabelText("Sort"), { target: { value: "amount" } });
    ["Grab to the bus", "Banh mi"].forEach((note) => {
      const row = screen.getByText(note).closest("li")!;
      fireEvent.click(within(row).getByRole("button", { name: /^Delete/ }));
    });

    expect(shownNotes()).toHaveLength(3);
    expect(screen.getByLabelText("Sort")).toBeTruthy();
  });

  it("keeps the destination control on screen while a place is still chosen", () => {
    render(<Harness tripId="t1" />);
    fireEvent.change(screen.getByLabelText("Destination"), {
      target: { value: "Hanoi" },
    });
    expect(shownNotes()).toEqual(["Hanoi guesthouse", "Pho at the market"]);

    // The trip collapses to one destination under the filter.
    ["Hanoi guesthouse", "Pho at the market"].forEach((note) => {
      const row = screen.getByText(note).closest("li")!;
      fireEvent.click(within(row).getByRole("button", { name: /^Delete/ }));
    });

    // Still filtered to Hanoi, so the control that says so has to stay.
    expect(shownNotes()).toHaveLength(0);
    expect(screen.getByLabelText("Destination")).toBeTruthy();
  });

  it("announces the count through a live region that was already mounted", () => {
    render(<Harness tripId="t1" />);
    // Present and empty before any filter — a region inserted alongside its
    // text is not announced.
    const region = within(panel()).getByRole("status");
    expect(region.textContent).toBe("");

    fireEvent.click(tile(/^Lodging/));
    expect(within(panel()).getByRole("status")).toBe(region);
    expect(summary()).toBe("Showing 2 of 5 · $330.00");
  });

  it("does not warn about look-alike rows the filter is hiding", () => {
    // Two identical transport fares on different days are not a duplicate
    // pair, so seed a real one: same day, same amount, same category.
    saveExpense("t1", { day: "2026-09-05", amountCents: 1600, category: "food", note: "Banh mi again" }, T0 + 99);
    render(<Harness tripId="t1" />);
    expect(screen.queryByText(/look like the same/)).not.toBeNull();

    fireEvent.click(tile(/^Lodging/));

    // The warning offers "Remove this one"; it must not do that for rows
    // that aren't on screen.
    expect(screen.queryByText(/look like the same/)).toBeNull();
  });

  it("does not carry one trip's filter over to another trip", () => {
    seed("t2");
    const { rerender } = render(<Harness tripId="t1" />);
    fireEvent.change(screen.getByLabelText("Search notes"), {
      target: { value: "banh" },
    });
    expect(shownNotes()).toEqual(["Banh mi"]);

    rerender(<Harness tripId="t2" />);

    expect(shownNotes()).toHaveLength(5);
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
    // ...and going back doesn't resurrect it either.
    rerender(<Harness tripId="t1" />);
    expect(shownNotes()).toHaveLength(5);
  });
});
