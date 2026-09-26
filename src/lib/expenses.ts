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

/**
 * Look-alike groups confirmed to be genuinely separate spends.
 *
 * A tick store keyed by `duplicateKey`, so the answer travels between devices
 * with everything else — being told about the same non-duplicate again on the
 * laptop would be its own small annoyance.
 */
export const DUP_OK_ENTITY = "dupok";

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

/**
 * An already-logged expense that this draft looks like a repeat of.
 *
 * Same day, same amount, same category is a deliberately loose test: two
 * genuinely separate ₫250,000 lunches on one day are possible, so this warns
 * rather than blocks. It exists because scanning the same receipt twice is
 * easy — you photograph it, get distracted, photograph it again — and two
 * identical rows are indistinguishable afterwards, which makes the mistake
 * both easy to commit and hard to undo.
 *
 * Editing an existing row is excluded by id: a row is never its own duplicate.
 */
export function findDuplicate(
  expenses: Expense[],
  draft: Pick<ExpenseDraft, "day" | "amountCents" | "category"> & { id?: string }
): Expense | undefined {
  return expenses.find(
    (e) =>
      e.id !== draft.id &&
      e.day === draft.day &&
      e.amountCents === draft.amountCents &&
      e.category === draft.category
  );
}

/**
 * Expenses already logged that look like repeats of each other.
 *
 * `findDuplicate` only guards the moment of entry, which does nothing for the
 * repeats already sitting in the list — and finding them by eye means reading
 * every row across every day and holding three fields in your head. The app
 * has the answer and was not saying it.
 *
 * Grouped by the same day/amount/category test, so the two functions can never
 * disagree about what a duplicate is. Groups of one aren't groups.
 */
export function findDuplicateGroups(expenses: Expense[]): Expense[][] {
  const groups = new Map<string, Expense[]>();
  for (const e of expenses) {
    const key = duplicateKey(e);
    const group = groups.get(key);
    if (group) group.push(e);
    else groups.set(key, [e]);
  }
  return [...groups.values()]
    .filter((g) => g.length > 1)
    // Oldest first within a group: the first one logged is usually the keeper,
    // and the later one the accidental re-scan.
    .map((g) => [...g].sort((a, b) => a.updatedAt - b.updatedAt));
}

/**
 * Identifies a group of look-alikes, and doubles as the key under which
 * "these are actually different" is remembered. Contains no free text, so
 * dismissing a group can't be undone by editing a note.
 */
export function duplicateKey(e: Pick<Expense, "day" | "amountCents" | "category">): string {
  return `${e.day}|${e.amountCents}|${e.category}`;
}

/** `14:32` — distinguishes rows that are otherwise identical. */
export function loggedAt(e: Expense): string {
  return new Date(e.updatedAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Total spend on a single day — used to show a day's cost in the journal. */
export function totalForDay(expenses: Expense[], day: DayStamp): number {
  return totalCents(expenses.filter((e) => e.day === day));
}

/** How the list is ordered. Not a filter, but always wanted next to one. */
export type ExpenseSort = "day" | "amount";

/**
 * How the expense list is narrowed. One object rather than five loose pieces
 * of state, so "is anything filtered?" and "clear it" are single expressions
 * and can't go half-applied.
 *
 * Every axis has a value meaning "don't narrow on this", so the inactive
 * filter is a real value (`NO_EXPENSE_FILTER`) rather than null or undefined.
 */
export interface ExpenseFilter {
  /** Empty means every category — not "no categories", which shows nothing. */
  categories: ExpenseCategory[];
  /**
   * Matched against the note only. Not the category (which has its own
   * control) and not the amount: a search box that quietly also matches
   * numbers makes "12" a confusing query.
   */
  query: string;
  /** A destination name as the itinerary resolves it, or null for anywhere. */
  place: string | null;
  /** Inclusive day bounds; "" is unbounded on that side. */
  from: DayStamp | "";
  to: DayStamp | "";
}

export const NO_EXPENSE_FILTER: ExpenseFilter = {
  categories: [],
  query: "",
  place: null,
  from: "",
  to: "",
};

/** Whether anything is being hidden — what "Clear filters" keys off. */
export function isFilterActive(f: ExpenseFilter): boolean {
  return (
    f.categories.length > 0 ||
    f.query.trim() !== "" ||
    f.place !== null ||
    f.from !== "" ||
    f.to !== ""
  );
}

/**
 * Apply a filter. Purely a view operation — nothing here writes, so a filtered
 * list can never be mistaken for the trip's real contents by a caller that
 * totals it.
 *
 * `placeOf` resolves a day to a destination name and is supplied by the caller
 * (from the itinerary), because expenses store a day and not a place: the
 * place a spend happened is derived, and re-deriving it here would drag the
 * destination dataset into this module.
 *
 * Day comparisons are plain string compares, which is exact for `DayStamp`'s
 * `YYYY-MM-DD` and avoids parsing dates into a timezone.
 */
export function filterExpenses(
  expenses: Expense[],
  filter: ExpenseFilter,
  placeOf?: (day: DayStamp) => string | null
): Expense[] {
  const query = filter.query.trim().toLowerCase();
  return expenses.filter((e) => {
    if (filter.categories.length > 0 && !filter.categories.includes(e.category))
      return false;
    if (filter.from && e.day < filter.from) return false;
    if (filter.to && e.day > filter.to) return false;
    if (query && !(e.note ?? "").toLowerCase().includes(query)) return false;
    // An expense on a day the itinerary doesn't cover has no place, so it is
    // not in the one being asked about.
    if (filter.place !== null && placeOf?.(e.day) !== filter.place) return false;
    return true;
  });
}

/**
 * Reorder a copy — callers hold the unsorted list for totals and duplicate
 * detection, which must not change because the list is being read differently.
 *
 * Both orders end in the same day/updatedAt tie-break as `listExpenses`, so
 * two rows that look identical keep a stable relative order however they're
 * sorted.
 */
export function sortExpenses(expenses: Expense[], sort: ExpenseSort): Expense[] {
  const rows = [...expenses];
  if (sort === "amount") {
    return rows.sort(
      (a, b) =>
        b.amountCents - a.amountCents ||
        b.day.localeCompare(a.day) ||
        b.updatedAt - a.updatedAt
    );
  }
  return rows.sort(
    (a, b) => b.day.localeCompare(a.day) || b.updatedAt - a.updatedAt
  );
}

/**
 * The destinations these expenses fall in, in itinerary order.
 *
 * Built from the expenses rather than from the trip's stops so the dropdown
 * only ever offers places that would actually return something — a filter
 * option that yields an empty list is a small lie.
 */
export function placesForExpenses(
  expenses: Expense[],
  placeOf: (day: DayStamp) => string | null
): string[] {
  const names = new Set<string>();
  for (const e of [...expenses].sort((a, b) => a.day.localeCompare(b.day))) {
    const name = placeOf(e.day);
    if (name) names.add(name);
  }
  return [...names];
}
