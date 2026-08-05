import { describe, it, expect } from "vitest";
import {
  CURRENCIES,
  currencyFromInfo,
  formatMoney,
  isCurrencyCode,
  parseAmountToMinor,
  toUsdCents,
} from "@/lib/money";

/**
 * The whole point of this module is that not every currency has two decimal
 * places. ₫250,000 is 250000 minor units; treating it as 25,000,000 is a
 * hundred-fold error in the direction of "your trip cost $984".
 */

describe("parsing, by currency precision", () => {
  it("reads a two-decimal currency the way the old USD parser did", () => {
    expect(parseAmountToMinor("12.50", "USD")).toBe(1250);
    expect(parseAmountToMinor("$1,234.5", "USD")).toBe(123450);
    expect(parseAmountToMinor("1234", "USD")).toBe(123400);
  });

  it("reads a zero-decimal currency without inventing minor units", () => {
    expect(parseAmountToMinor("250000", "VND")).toBe(250000);
    expect(parseAmountToMinor("250,000", "VND")).toBe(250000);
    // Half a đồng doesn't exist, so it rounds rather than being kept.
    expect(parseAmountToMinor("250000.5", "VND")).toBe(250001);
    expect(parseAmountToMinor("250000.4", "VND")).toBe(250000);
  });

  it("reads a three-decimal currency", () => {
    expect(parseAmountToMinor("1.5", "KWD")).toBe(1500);
    expect(parseAmountToMinor("1.234", "KWD")).toBe(1234);
    expect(parseAmountToMinor("1.2345", "KWD")).toBe(1235);
  });

  it("rounds the first dropped digit rather than truncating", () => {
    // 1.005 is not representable in binary floating point; parseFloat would
    // round this the wrong way.
    expect(parseAmountToMinor("1.005", "USD")).toBe(101);
  });

  it("strips the currency's own symbol but not arbitrary text", () => {
    expect(parseAmountToMinor("₫250000", "VND")).toBe(250000);
    expect(parseAmountToMinor("12 bananas", "USD")).toBeNull();
  });

  it("rejects what isn't a positive amount", () => {
    for (const bad of ["", ".", "-5", "abc", "0", "0.00"]) {
      expect(parseAmountToMinor(bad, "USD")).toBeNull();
    }
  });
});

describe("formatting", () => {
  it("shows each currency at its own precision", () => {
    expect(formatMoney(984, "USD")).toBe("$9.84");
    expect(formatMoney(250000, "VND")).toBe("₫250,000");
    expect(formatMoney(1500, "KWD")).toBe("KD1.500");
  });
});

describe("converting to USD", () => {
  it("converts a zero-decimal currency", () => {
    // ₫250,000 at 25,400 per dollar is $9.84.
    expect(toUsdCents(250000, "VND", 25400)).toBe(984);
  });

  it("converts a two-decimal currency", () => {
    // S/40.00 at 3.75 per dollar is $10.67.
    expect(toUsdCents(4000, "PEN", 3.75)).toBe(1067);
  });

  it("is the identity for dollars at a rate of one", () => {
    expect(toUsdCents(1250, "USD", 1)).toBe(1250);
  });

  it("never rounds a real purchase down to nothing", () => {
    // ₫100 is $0.0039. Rounding to 0 would make saveExpense reject it, so a
    // cheap thing you actually bought would silently fail to save.
    expect(toUsdCents(100, "VND", 25400)).toBe(1);
  });

  it("refuses a rate that can't be divided by", () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(toUsdCents(250000, "VND", bad)).toBeNull();
    }
  });

  it("refuses a non-integer or non-positive amount", () => {
    expect(toUsdCents(1.5, "USD", 1)).toBeNull();
    expect(toUsdCents(0, "USD", 1)).toBeNull();
  });

  it("keeps precision on a large amount", () => {
    // Multiplying before dividing; ₫2,500,000 at 25,400 is $98.43.
    expect(toUsdCents(2_500_000, "VND", 25400)).toBe(9843);
  });
});

describe("the currency code guard", () => {
  it("accepts known codes and rejects everything else", () => {
    expect(isCurrencyCode("VND")).toBe(true);
    // The kind of typo a union type catches at compile time and this catches
    // in data that arrived from storage.
    expect(isCurrencyCode("VMD")).toBe(false);
    expect(isCurrencyCode(undefined)).toBe(false);
    expect(isCurrencyCode(42)).toBe(false);
    // Object.hasOwn, not `in`, so inherited members aren't currencies.
    expect(isCurrencyCode("toString")).toBe(false);
  });
});

describe("reading a currency off a destination", () => {
  it("pulls the ISO code out of the practical line", () => {
    expect(currencyFromInfo("Vietnamese đồng (VND)")).toBe("VND");
    expect(currencyFromInfo("Peruvian sol (PEN)")).toBe("PEN");
  });

  it("gives up rather than guessing when there's no code", () => {
    // The one destination whose line names two countries' pesos.
    expect(currencyFromInfo("Argentine & Chilean peso")).toBeUndefined();
    expect(currencyFromInfo(undefined)).toBeUndefined();
  });

  it("gives up on a code the app doesn't support", () => {
    expect(currencyFromInfo("Some currency (ZZZ)")).toBeUndefined();
  });
});

describe("the currency table itself", () => {
  it("gives every currency a sane precision", () => {
    for (const [code, meta] of Object.entries(CURRENCIES)) {
      expect([0, 2, 3], `${code} digits`).toContain(meta.digits);
      expect(meta.symbol.length, `${code} symbol`).toBeGreaterThan(0);
    }
  });
});
