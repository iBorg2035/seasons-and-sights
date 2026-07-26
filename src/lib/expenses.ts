import type { DayStamp } from "@/lib/saved-trips";
import {
  deleteRecord,
  loadRecords,
  upsertRecord,
  type TripRecord,
} from "@/lib/trip-records";

export const EXPENSE_ENTITY = "expense";

export const EXPENSE_CATEGORIES = [
  "food",
  "lodging",
  "transport",
  "activities",
  "other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_META: Record<ExpenseCategory, { icon: string; label: string }> = {
  food: { icon: "🍜", label: "Food & drink" },
  lodging: { icon: "🛏️", label: "Lodging" },
  transport: { icon: "🚆", label: "Transport" },
  activities: { icon: "🎟️", label: "Activities" },
  other: { icon: "🧾", label: "Other" },
};

/** ~$100k in one line item — a typo guard, not a real spending limit. */
export const MAX_AMOUNT_CENTS = 10_000_000;

export interface Expense extends TripRecord {
  day: DayStamp;
  /**
   * USD, in integer cents. Not a float: these get summed across a whole trip
   * and then compared against the estimator, so a total that drifts by a cent
   * for arithmetic reasons would read as a bug in the reconciliation.
   */
  amountCents: number;
  category: ExpenseCategory;
  note?: string;
}

export interface ExpenseDraft {
  id?: string;
  day: DayStamp;
  amountCents: number;
  category: ExpenseCategory;
  note?: string;
}

/**
 * Parse user input into integer cents, or null if it isn't a usable amount.
 *
 * Parsed as a decimal string rather than via parseFloat: `Math.round(1.005 *
 * 100)` is 100, not 101, because 1.005 isn't representable in binary floating
 * point. Money should not round wrong on a value someone typed exactly.
 *
 * Accepts "$1,234.5" and "1234.50"; rejects negatives — a refund is a real
 * thing but it isn't this, and silently storing one would quietly understate
 * a category total.
 */
export function parseAmountToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[$,\s]/g, "");
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === "" || cleaned === ".") {
    return null;
  }

  const [whole, frac = ""] = cleaned.split(".");
  // Third decimal onward is rounded, not truncated, so "0.005" is a cent.
  const centsFrac = frac.slice(0, 2).padEnd(2, "0");
  const roundUp = frac.length > 2 && Number(frac[2]) >= 5 ? 1 : 0;

  const cents = Number(whole || "0") * 100 + Number(centsFrac) + roundUp;
  if (!Number.isFinite(cents) || cents <= 0 || cents > MAX_AMOUNT_CENTS) {
    return null;
  }
  return cents;
}

/** `$1,234.56` — unlike formatUsd in season.ts, cents are shown, because a
 *  logged expense is an exact figure rather than an estimate. */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** A trip's expenses, newest day first (ties broken by most recently edited). */
export function listExpenses(tripId: string): Expense[] {
  return loadRecords<Expense>(EXPENSE_ENTITY, tripId).sort(
    (a, b) => b.day.localeCompare(a.day) || b.updatedAt - a.updatedAt
  );
}

/** Create or update an expense. Null means it was rejected and not saved. */
export function saveExpense(
  tripId: string,
  draft: ExpenseDraft,
  now: number = Date.now()
): Expense | null {
  if (!draft.day) return null;
  if (
    !Number.isInteger(draft.amountCents) ||
    draft.amountCents <= 0 ||
    draft.amountCents > MAX_AMOUNT_CENTS
  ) {
    return null;
  }
  if (!EXPENSE_CATEGORIES.includes(draft.category)) return null;

  const expense: Expense = {
    id: draft.id || crypto.randomUUID(),
    day: draft.day,
    amountCents: draft.amountCents,
    category: draft.category,
    note: draft.note?.trim() || undefined,
    updatedAt: now,
  };
  return upsertRecord<Expense>(EXPENSE_ENTITY, tripId, expense, now)
    ? expense
    : null;
}

export function removeExpense(tripId: string, id: string): boolean {
  return deleteRecord(EXPENSE_ENTITY, tripId, id);
}

export function totalCents(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amountCents, 0);
}

/** Per-category totals, every category present so the UI can render zeros. */
export function totalsByCategory(
  expenses: Expense[]
): Record<ExpenseCategory, number> {
  const totals = Object.fromEntries(
    EXPENSE_CATEGORIES.map((c) => [c, 0])
  ) as Record<ExpenseCategory, number>;
  for (const e of expenses) totals[e.category] += e.amountCents;
  return totals;
}

/** Total spend on a single day — used to show a day's cost in the journal. */
export function totalForDay(expenses: Expense[], day: DayStamp): number {
  return totalCents(expenses.filter((e) => e.day === day));
}
