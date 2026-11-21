import { describe, expect, it } from "vitest";
import {
  amountMatchesPrinted,
  checkReceipt,
  printedNumbers,
  type ModelReceipt,
} from "@/lib/receipt-check";

const base: ModelReceipt = {
  found: true,
  totalAsPrinted: "€12,50",
  merchant: "Café",
  amount: "12.50",
  currency: "EUR",
  category: "food",
  day: "2026-08-12",
};

describe("printedNumbers", () => {
  it.each([
    ["250.000 ₫", 250000],
    ["1,234.50", 1234.5],
    ["€12,50", 12.5],
    ["$4.5", 4.5],
    ["1 234,00 Kč", 1234],
    ["¥3,200", 3200],
    ["THB 1,250", 1250],
  ])("reads %s as %d", (text, n) => {
    expect(printedNumbers(text)).toContain(n);
  });
});

describe("amountMatchesPrinted", () => {
  it("accepts the printed total however it's punctuated", () => {
    expect(amountMatchesPrinted("250000", "250.000 ₫")).toBe(true);
    expect(amountMatchesPrinted("12.5", "€12,50")).toBe(true);
  });

  it("rejects an amount that isn't what was printed", () => {
    expect(amountMatchesPrinted("4.50", "€12,50")).toBe(false);
    expect(amountMatchesPrinted("100", "1.00")).toBe(false);
  });

  it("rejects zero and non-numbers", () => {
    expect(amountMatchesPrinted("0", "0.00")).toBe(false);
    expect(amountMatchesPrinted("12,50", "€12,50")).toBe(false);
  });
});

describe("checkReceipt", () => {
  it("passes a consistent reading through, without totalAsPrinted", () => {
    const out = checkReceipt(base);
    expect(out).toEqual({
      found: true,
      merchant: "Café",
      amount: "12.50",
      currency: "EUR",
      category: "food",
      day: "2026-08-12",
    });
    expect(out).not.toHaveProperty("totalAsPrinted");
  });

  // Regression: a blank image came back found: true with an invented receipt.
  it("blanks a reading with no printed total", () => {
    expect(checkReceipt({ ...base, totalAsPrinted: null }).found).toBe(false);
  });

  it("blanks a reading whose amount disagrees with the printed total", () => {
    const out = checkReceipt({ ...base, amount: "4.50" });
    expect(out.found).toBe(false);
    expect(out.merchant).toBeNull();
  });

  it("keeps found: false as not found", () => {
    expect(checkReceipt({ ...base, found: false }).found).toBe(false);
  });
});
