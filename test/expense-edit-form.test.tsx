// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { useCallback, useState } from "react";
import type { ReceiptExtraction } from "@/lib/receipt";
import { listExpenses, saveExpense } from "@/lib/expenses";
import { rateFor, setRate } from "@/lib/fx";
import type { CurrencyCode } from "@/lib/money";

/**
 * Entry-form transitions in ExpenseSection that only show up across a
 * sequence of actions: entering edit mode from a different currency, an
 * emptied day field, and a queued scan reviewed while another waits.
 */

let mockResult: ReceiptExtraction | null = null;
vi.mock("@/components/ReceiptScanButton", () => ({
  ReceiptScanButton: (props: { onExtracted: (r: ReceiptExtraction) => void }) => (
    <button type="button" onClick={() => mockResult && props.onExtracted(mockResult)}>
      mock-scan-result
    </button>
  ),
}));

// The queue's IndexedDB drain is covered elsewhere; here only its `ready`
// rows and `discard` matter.
const queueState: {
  ready: { id: string; result: ReceiptExtraction }[];
  discard: ReturnType<typeof vi.fn>;
} = { ready: [], discard: vi.fn() };
vi.mock("@/lib/use-receipt-queue", () => ({
  useReceiptQueue: () => ({
    waiting: [],
    failed: [],
    ready: queueState.ready,
    discard: queueState.discard,
    retry: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const { ExpenseSection } = await import("@/components/ExpenseSection");

function Harness({ currencyForDay }: { currencyForDay?: (d: string) => CurrencyCode }) {
  const [expenses, setExpenses] = useState(() => listExpenses("t1"));
  const onChanged = useCallback(() => setExpenses(listExpenses("t1")), []);
  return (
    <ExpenseSection
      tripId="t1"
      expenses={expenses}
      defaultDay="2026-08-12"
      onChanged={onChanged}
      currencyForDay={currencyForDay}
    />
  );
}

const field = (sel: string) => document.querySelector(sel) as HTMLInputElement;
const currencySelect = () =>
  document.querySelector('select[aria-label="Currency"]') as HTMLSelectElement;

beforeEach(() => {
  localStorage.clear();
  mockResult = null;
  queueState.ready = [];
  queueState.discard = vi.fn();
});
afterEach(cleanup);

describe("editing a foreign-currency expense", () => {
  it("keeps the row's stored rate when only the note changes", () => {
    // Logged at 25,000 VND/USD; the trip's rate was corrected afterwards.
    const original = saveExpense("t1", {
      day: "2026-08-12",
      amountCents: 1000,
      category: "food",
      note: "pho",
      foreign: { amountMinor: 250000, currency: "VND", unitsPerUsd: 25000 },
    })!;
    setRate("t1", "VND", 26000);

    // Form idle on USD, so entering edit mode changes the form's currency.
    render(<Harness />);
    expect(currencySelect().value).toBe("USD");

    fireEvent.click(screen.getByRole("button", { name: /^Edit / }));
    expect(currencySelect().value).toBe("VND");
    expect(field("#expense-rate").value).toBe("25000");

    fireEvent.change(field("#expense-note"), { target: { value: "pho, fixed note" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    const [saved] = listExpenses("t1");
    expect(saved.note).toBe("pho, fixed note");
    expect(saved.amountCents).toBe(original.amountCents);
    expect(saved.foreign).toEqual(original.foreign);
    // And the trip's corrected rate wasn't rolled back by the edit either.
    expect(rateFor("t1", "VND")?.unitsPerUsd).toBe(26000);
  });

  it("still prefills the trip's rate when the currency is changed by hand mid-edit", () => {
    saveExpense("t1", {
      day: "2026-08-12",
      amountCents: 1000,
      category: "food",
      note: "pho",
      foreign: { amountMinor: 250000, currency: "VND", unitsPerUsd: 25000 },
    });
    setRate("t1", "THB", 36);
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /^Edit / }));
    fireEvent.change(currencySelect(), { target: { value: "THB" } });

    expect(field("#expense-rate").value).toBe("36");
  });

  it("prefills the trip's rate when the currency is changed outside edit mode", () => {
    setRate("t1", "VND", 26000);
    render(<Harness />);

    fireEvent.change(currencySelect(), { target: { value: "VND" } });

    expect(field("#expense-rate").value).toBe("26000");
  });
});

describe("an empty day", () => {
  it("says to pick a day rather than blaming browser storage", () => {
    const onChanged = vi.fn();
    render(
      <ExpenseSection tripId="t1" expenses={[]} defaultDay="2026-08-12" onChanged={onChanged} />
    );

    fireEvent.change(field("#expense-day"), { target: { value: "" } });
    fireEvent.change(field("#expense-amount"), { target: { value: "12.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    const alert = screen.getByRole("alert").textContent ?? "";
    expect(alert).toMatch(/pick a day/i);
    expect(alert).not.toMatch(/storage/i);
    expect(onChanged).not.toHaveBeenCalled();
    expect(listExpenses("t1")).toHaveLength(0);
  });
});

describe("reviewing a queued receipt while another scan awaits confirmation", () => {
  const LIVE: ReceiptExtraction = {
    found: true,
    merchant: "Live scan cafe",
    amount: "50000",
    currency: "VND",
    category: "food",
    day: null,
  };
  const QUEUED: ReceiptExtraction = {
    found: true,
    merchant: "Queued market",
    amount: "120000",
    currency: "VND",
    category: "food",
    day: null,
  };

  it("leaves the queued row in place instead of replacing the pending scan", () => {
    queueState.ready = [{ id: "q1", result: QUEUED }];
    mockResult = LIVE;
    render(<Harness />);

    // Mid-entry, so the live scan is parked for confirmation.
    fireEvent.change(field("#expense-amount"), { target: { value: "9.99" } });
    fireEvent.click(screen.getByText("mock-scan-result"));
    expect(screen.getByText(/Live scan cafe.*use this\?/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Review" }));

    // The pending scan survives, and the queued one wasn't consumed.
    expect(screen.getByText(/Live scan cafe.*use this\?/)).toBeTruthy();
    expect(queueState.discard).not.toHaveBeenCalled();
  });

  it("consumes the queued row as before when nothing is pending", () => {
    queueState.ready = [{ id: "q1", result: QUEUED }];
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "Review" }));

    expect(field("#expense-amount").value).toBe("120000");
    expect(queueState.discard).toHaveBeenCalledWith("q1");
  });
});
