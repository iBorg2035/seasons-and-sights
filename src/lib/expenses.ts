import type { DayStamp } from "@/lib/saved-trips";
import {
  deleteRecord,
  loadRecords,
  upsertRecord,
  type TripRecord,
} from "@/lib/trip-records";
import {
  formatMoney,
  isCurrencyCode,
  parseAmountToMinor,
  type CurrencyCode,
} from "@/lib/money";

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

/**
 * What was actually handed over, when it wasn't dollars.
 *
 * One object rather than three optional fields: an amount with no currency, or
 * a currency with no rate, are not states worth being able to represent.
 */
export interface ForeignAmount {
  /** Minor units of `currency` — 250000 for ₫250,000. */
  amountMinor: number;
  currency: CurrencyCode;
  /**
   * Units of `currency` per US dollar, as used at entry. Stored on the row,
   * not looked up when displaying: correcting a trip's rate in October must
   * not silently rewrite what August cost.
   */
  unitsPerUsd: number;
}

export interface Expense extends TripRecord {
  day: DayStamp;
  /**
   * USD, in integer cents. Not a float: these get summed across a whole trip
   * and then compared against the estimator, so a total that drifts by a cent
   * for arithmetic reasons would read as a bug in the reconciliation.
   *
   * Always present, including on foreign-currency expenses, where it is the
   * converted figure. Every total, category breakdown and budget comparison
   * reads this and only this.
   */
  amountCents: number;
  category: ExpenseCategory;
  note?: string;
  /** Absent when the expense was in USD, which is every pre-existing row. */
  foreign?: ForeignAmount;
}

export interface ExpenseDraft {
  id?: string;
  day: DayStamp;
  amountCents: number;
  category: ExpenseCategory;
  note?: string;
  foreign?: ForeignAmount;
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
  const cents = parseAmountToMinor(input, "USD");
  // The domain bound lives here, not in money.ts: MAX_AMOUNT_CENTS is a guard
  // against a typo'd expense, not a fact about dollars.
  if (cents === null || cents > MAX_AMOUNT_CENTS) return null;
  return cents;
}

/** `$1,234.56` — unlike formatUsd in season.ts, cents are shown, because a
 *  logged expense is an exact figure rather than an estimate. */
export function formatCents(cents: number): string {
  return formatMoney(cents, "USD");
}

/**
 * Reject a `foreign` that doesn't hold together.
 *
 * Records are untrusted input — they come back from localStorage and from
 * Supabase jsonb, written by whatever client version. A row from a newer build
 * using a currency this one doesn't know must not throw inside a list render.
 */
function validForeign(v: unknown): v is ForeignAmount {
  if (typeof v !== "object" || v === null) return false;
  const f = v as Partial<ForeignAmount>;
  return (
    Number.isSafeInteger(f.amountMinor) &&
    (f.amountMinor as number) > 0 &&
    isCurrencyCode(f.currency) &&
    typeof f.unitsPerUsd === "number" &&
    Number.isFinite(f.unitsPerUsd) &&
    f.unitsPerUsd > 0
  );
}

/**
 * Degrade a bad `foreign` to nothing rather than dropping the expense.
 *
 * `amountCents` is always present, so an expense whose original-currency
 * detail is unreadable still counts toward every total — it just displays in
 * dollars. Losing the receipt's currency is a cosmetic loss; losing the
 * expense is a real one.
 */
function normalize(e: Expense): Expense {
  if (e.foreign === undefined || validForeign(e.foreign)) return e;
  const { foreign: _dropped, ...rest } = e;
  return rest;
}

/** A trip's expenses, newest day first (ties broken by most recently edited). */
export function listExpenses(tripId: string): Expense[] {
  return loadRecords<Expense>(EXPENSE_ENTITY, tripId)
    .map(normalize)
    .sort((a, b) => b.day.localeCompare(a.day) || b.updatedAt - a.updatedAt);
}

/** `₫250,000 ($9.84)`, or just `$9.84` when it was paid in dollars. */
export function describeAmount(e: Expense): string {
  const usd = formatCents(e.amountCents);
  return e.foreign
    ? `${formatMoney(e.foreign.amountMinor, e.foreign.currency)} (${usd})`
    : usd;
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
  // All three fields or none — a half-populated foreign amount is refused
  // rather than quietly stored and dropped again on the next read.
  if (draft.foreign !== undefined && !validForeign(draft.foreign)) return null;

  const expense: Expense = {
    id: draft.id || crypto.randomUUID(),
    day: draft.day,
    amountCents: draft.amountCents,
    category: draft.category,
    note: draft.note?.trim() || undefined,
    foreign: draft.foreign,
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
