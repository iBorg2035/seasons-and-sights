// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  findDuplicate,
  loggedAt,
  listExpenses,
  saveExpense,
  type Expense,
} from "@/lib/expenses";

/**
 * Scanning the same receipt twice is easy — photograph it, get distracted,
 * photograph it again — and the result was two byte-identical rows with the
 * same text and the same accessible name, so neither the eye nor a screen
 * reader could tell which one to remove. Reported as "can't delete the wrong
 * one".
 */

beforeEach(() => localStorage.clear());

const base = { day: "2026-08-12", amountCents: 984, category: "food" } as const;

describe("spotting a repeat before it's saved", () => {
  it("matches on day, amount and category", () => {
    saveExpense("t1", { ...base, note: "Cua Dai" });
    expect(findDuplicate(listExpenses("t1"), base)).toBeDefined();
  });

  it("ignores the note, because a scan may not name the merchant twice", () => {
    // The stored row carries a merchant; the draft has none. The signature
    // doesn't even accept a note, so this is guaranteed by the type — the
    // test pins the behaviour that guarantee exists to provide.
    saveExpense("t1", { ...base, note: "Cua Dai" });
    expect(findDuplicate(listExpenses("t1"), base)).toBeDefined();

    localStorage.clear();
    saveExpense("t1", { ...base, note: "" });
    expect(findDuplicate(listExpenses("t1"), base)).toBeDefined();
  });

  it("does not match a different day, amount or category", () => {
    saveExpense("t1", base);
    const rows = listExpenses("t1");
    expect(findDuplicate(rows, { ...base, day: "2026-08-13" })).toBeUndefined();
    expect(findDuplicate(rows, { ...base, amountCents: 985 })).toBeUndefined();
    expect(findDuplicate(rows, { ...base, category: "transport" })).toBeUndefined();
  });

  it("never treats a row as its own duplicate when editing it", () => {
    // Otherwise every edit would be blocked by a warning about itself.
    const saved = saveExpense("t1", base)!;
    expect(findDuplicate(listExpenses("t1"), { ...base, id: saved.id })).toBeUndefined();
  });

  it("warns rather than blocks — two real lunches at one price are possible", () => {
    // findDuplicate only reports; saveExpense still accepts the second one,
    // which is what makes "Add anyway" honest rather than a lie.
    saveExpense("t1", base);
    expect(saveExpense("t1", base)).not.toBeNull();
    expect(listExpenses("t1")).toHaveLength(2);
  });
});

describe("telling identical rows apart", () => {
  it("gives each a distinct logged time", () => {
    const a = saveExpense("t1", base, 1_760_000_000_000)!;
    const b = saveExpense("t1", base, 1_760_000_000_000 + 42 * 60_000)!;

    // The rows are otherwise indistinguishable; the timestamp is the only
    // thing separating them, so it has to actually differ.
    expect(loggedAt(a)).not.toBe(loggedAt(b));
  });

  it("formats as a readable clock time", () => {
    const e = { updatedAt: new Date(2026, 7, 12, 14, 32).getTime() } as Expense;
    expect(loggedAt(e)).toMatch(/\d{1,2}[:.]\d{2}/);
  });
});
