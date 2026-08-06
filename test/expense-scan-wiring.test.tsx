// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { ReceiptExtraction } from "@/lib/receipt";

/**
 * How ExpenseSection responds to a scan result — not the network call or the
 * extraction logic itself (covered in receipt-client.test.ts and
 * receipt-extract-route.test.ts), just the wiring: does a result reach the
 * right fields, and does it ever clobber something a human already typed.
 *
 * ReceiptScanButton is replaced with two buttons that invoke the same
 * callbacks it would, so each test controls exactly what "the scan returned"
 * without going through a real file, a canvas, or a network request.
 */

let mockResult: ReceiptExtraction | null = null;
let mockErrorMessage: string | null = null;

vi.mock("@/components/ReceiptScanButton", () => ({
  ReceiptScanButton: (props: {
    onExtracted: (r: ReceiptExtraction) => void;
    onError: (m: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => mockResult && props.onExtracted(mockResult)}>
        mock-scan-result
      </button>
      <button
        type="button"
        onClick={() => mockErrorMessage && props.onError(mockErrorMessage)}
      >
        mock-scan-error
      </button>
    </div>
  ),
}));

const { ExpenseSection } = await import("@/components/ExpenseSection");

const VND_RESULT: ReceiptExtraction = {
  found: true,
  merchant: "Cua Dai restaurant",
  amount: "250000",
  currency: "VND",
  category: "food",
  day: "2026-08-15",
};

beforeEach(() => {
  localStorage.clear();
  mockResult = null;
  mockErrorMessage = null;
});
afterEach(cleanup);

function renderSection(overrides: Partial<Parameters<typeof ExpenseSection>[0]> = {}) {
  return render(
    <ExpenseSection
      tripId="t1"
      expenses={[]}
      defaultDay="2026-08-12"
      onChanged={() => {}}
      {...overrides}
    />
  );
}

describe("applying a scan to an empty form", () => {
  it("fills amount, currency, category, day and merchant", () => {
    mockResult = VND_RESULT;
    renderSection();

    fireEvent.click(screen.getByText("mock-scan-result"));

    expect((document.querySelector("#expense-amount") as HTMLInputElement).value).toBe(
      "250000"
    );
    expect(
      (document.querySelector('select[aria-label="Currency"]') as HTMLSelectElement).value
    ).toBe("VND");
    expect((document.querySelector("#expense-category") as HTMLSelectElement).value).toBe(
      "food"
    );
    expect((document.querySelector("#expense-day") as HTMLInputElement).value).toBe(
      "2026-08-15"
    );
    expect((document.querySelector("#expense-note") as HTMLInputElement).value).toBe(
      "Cua Dai restaurant"
    );
  });

  it("does not call submit — nothing is saved until Add is pressed", () => {
    mockResult = VND_RESULT;
    const onChanged = vi.fn();
    renderSection({ onChanged });

    fireEvent.click(screen.getByText("mock-scan-result"));

    expect(onChanged).not.toHaveBeenCalled();
  });
});

describe("a scan arriving mid-entry", () => {
  it("does not overwrite an amount someone already typed", () => {
    mockResult = VND_RESULT;
    renderSection();

    const amountField = document.querySelector("#expense-amount") as HTMLInputElement;
    fireEvent.change(amountField, { target: { value: "9.99" } });

    fireEvent.click(screen.getByText("mock-scan-result"));

    expect(amountField.value).toBe("9.99");
    expect(
      (document.querySelector('select[aria-label="Currency"]') as HTMLSelectElement).value
    ).toBe("USD");
  });

  it("offers the result for explicit confirmation instead", () => {
    mockResult = VND_RESULT;
    renderSection();

    fireEvent.change(document.querySelector("#expense-amount")!, {
      target: { value: "9.99" },
    });
    fireEvent.click(screen.getByText("mock-scan-result"));

    expect(screen.getByText(/use this\?/i)).toBeTruthy();
  });

  it("applies the held result once the traveler explicitly confirms it", () => {
    mockResult = VND_RESULT;
    renderSection();

    fireEvent.change(document.querySelector("#expense-amount")!, {
      target: { value: "9.99" },
    });
    fireEvent.click(screen.getByText("mock-scan-result"));
    fireEvent.click(screen.getByText("Use it"));

    expect((document.querySelector("#expense-amount") as HTMLInputElement).value).toBe(
      "250000"
    );
  });

  it("does not overwrite a note someone already typed", () => {
    mockResult = VND_RESULT;
    renderSection();

    fireEvent.change(document.querySelector("#expense-note")!, {
      target: { value: "my own note" },
    });
    fireEvent.click(screen.getByText("mock-scan-result"));

    expect((document.querySelector("#expense-note") as HTMLInputElement).value).toBe(
      "my own note"
    );
  });
});

describe("a scan that fails or finds nothing", () => {
  it("surfaces the error and touches no field", () => {
    mockErrorMessage = "Couldn't read an amount off that receipt — enter it manually.";
    renderSection();

    fireEvent.click(screen.getByText("mock-scan-error"));

    expect(screen.getByRole("alert").textContent).toBe(mockErrorMessage);
    expect((document.querySelector("#expense-amount") as HTMLInputElement).value).toBe("");
  });
});
