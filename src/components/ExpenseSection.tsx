"use client";

import { useEffect, useState } from "react";
import type { DayStamp } from "@/lib/saved-trips";
import {
  CATEGORY_META,
  EXPENSE_CATEGORIES,
  describeAmount,
  formatCents,
  parseAmountToCents,
  removeExpense,
  saveExpense,
  totalCents,
  totalsByCategory,
  type Expense,
  type ExpenseCategory,
} from "@/lib/expenses";
import {
  CURRENCIES,
  CURRENCY_CODES,
  parseAmountToMinor,
  toUsdCents,
  type CurrencyCode,
} from "@/lib/money";
import {
  FX_ENTITY,
  SNAPSHOT_CAPTURED_AT,
  isSnapshotStale,
  isUsableRate,
  rateFor,
  setRate,
} from "@/lib/fx";
import { useOptionalAuth } from "@/lib/contexts/auth-context";
import { mirrorRecord } from "@/lib/supabase/trip-records";
import { ReceiptScanButton } from "@/components/ReceiptScanButton";
import type { ReceiptExtraction } from "@/lib/receipt";
import { useReceiptQueue } from "@/lib/use-receipt-queue";

function fmtShortDay(day: DayStamp): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ExpenseSection({
  tripId,
  expenses,
  defaultDay,
  onChanged,
  currencyForDay,
}: {
  tripId: string;
  expenses: Expense[];
  defaultDay: DayStamp;
  /** Called with the changed row's id so the caller can mirror just that row. */
  onChanged: (id: string) => void;
  /**
   * Which currency you were most likely handing over on a given day. The
   * caller resolves it from the itinerary; this component deliberately knows
   * nothing about regions, which keeps the destination dataset out of its
   * bundle.
   */
  currencyForDay?: (day: DayStamp) => CurrencyCode | undefined;
}) {
  const user = useOptionalAuth()?.user;
  const [day, setDay] = useState<DayStamp>(defaultDay);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [rateInput, setRateInput] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  // A scan result waiting on confirmation, because it arrived while the
  // amount field already had something in it that it must not overwrite.
  const [pendingExtraction, setPendingExtraction] = useState<ReceiptExtraction | null>(null);
  // The row being edited, if any — the whole row rather than just its id,
  // because deciding whether an edit changed the money means comparing against
  // what was stored.
  const [editing, setEditing] = useState<Expense | null>(null);
  const editingId = editing?.id ?? null;

  // Receipts held on this device because there was no signal when they were
  // taken. Drains itself; this only reads the result.
  const queue = useReceiptQueue(tripId, { hintCurrency: currencyForDay?.(day) });

  // Follow the itinerary while the form is idle: pick a day, and the currency
  // is the one you were spending that day. Left alone once you're editing a
  // row or have started typing, so it never changes under you mid-entry.
  useEffect(() => {
    if (editing || amount !== "") return;
    setCurrency(currencyForDay?.(day) ?? "USD");
    // amount is deliberately not a dependency: this reacts to the day, and
    // re-running it on every keystroke is exactly what "left alone" excludes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, currencyForDay, editing]);

  // Show the rate this trip would use, so it can be corrected before it's used.
  useEffect(() => {
    if (currency === "USD") return;
    setRateInput(String(rateFor(tripId, currency)?.unitsPerUsd ?? ""));
  }, [tripId, currency]);

  const rateSource = currency === "USD" ? undefined : rateFor(tripId, currency)?.source;
  const parsedRate = Number(rateInput);
  const showStaleWarning =
    rateSource === "suggested" && isSnapshotStale() && isUsableRate(parsedRate);

  /** Live "≈ $9.84" under the field, or null when there's nothing to show. */
  const preview = (() => {
    if (currency === "USD" || !amount.trim()) return null;
    const minor = parseAmountToMinor(amount, currency);
    if (minor == null || !isUsableRate(parsedRate)) return null;
    const cents = toUsdCents(minor, currency, parsedRate);
    return cents == null ? null : formatCents(cents);
  })();

  function resetForm() {
    setEditing(null);
    setAmount("");
    setNote("");
    setError(null);
  }

  /**
   * Fill the form from a scan. Currency resolves the same way it does for a
   * fresh entry — the extracted currency wins, the itinerary is the
   * fallback — and the rate-prefill effect above (keyed on currency) picks up
   * the corresponding rate on its own; nothing extra needed here for that.
   *
   * Never calls submit(). The scan fills the same fields a human would type
   * into; nothing is saved until Add is pressed, so a misread is caught by
   * looking at it, not by a computer's confidence score.
   */
  function applyExtraction(result: ReceiptExtraction) {
    const resolved = result.currency ?? currencyForDay?.(result.day ?? day) ?? "USD";
    setCurrency(resolved);
    if (result.amount) setAmount(result.amount);
    if (result.day) setDay(result.day);
    if (result.category) setCategory(result.category);
    // Only into a blank note — a merchant name must not overwrite something
    // already typed, same rule as the amount field below.
    if (result.merchant && note.trim() === "") setNote(result.merchant);
    setPendingExtraction(null);
    setError(null);
  }

  function handleExtracted(result: ReceiptExtraction) {
    // A non-empty amount means someone was already mid-entry when this
    // arrived. Silently replacing what they typed would be worse than the
    // scan never having run, so it waits on an explicit "use this?" instead.
    if (amount.trim() !== "") {
      setPendingExtraction(result);
      return;
    }
    applyExtraction(result);
  }

  function submit() {
    const draft =
      currency === "USD" ? buildUsdDraft() : buildForeignDraft();
    if (draft === null) return;

    const saved = saveExpense(tripId, { ...draft, id: editingId ?? undefined });
    if (!saved) {
      setError("Couldn't save that expense. Check that browser storage is enabled.");
      return;
    }
    resetForm();
    onChanged(saved.id);
  }

  function buildUsdDraft() {
    const amountCents = parseAmountToCents(amount);
    if (amountCents == null) {
      setError("Enter an amount in USD, like 12.50.");
      return null;
    }
    return { day, amountCents, category, note };
  }

  function buildForeignDraft() {
    const amountMinor = parseAmountToMinor(amount, currency);
    if (amountMinor == null) {
      setError(`Enter an amount in ${currency}, like ${CURRENCIES[currency].digits === 0 ? "250000" : "12.50"}.`);
      return null;
    }
    if (!isUsableRate(parsedRate)) {
      setError(`Enter how many ${currency} buy one US dollar.`);
      return null;
    }

    /**
     * An edit that leaves the money alone must leave the stored figures
     * alone. Re-converting a row because its note was fixed would let
     * rounding drift each time, and would silently restate what a past day
     * cost. Anything that does change the money — amount, currency, or a
     * corrected rate — is a correction, so it reconverts.
     */
    const untouched =
      editing?.foreign != null &&
      editing.foreign.currency === currency &&
      editing.foreign.amountMinor === amountMinor &&
      editing.foreign.unitsPerUsd === parsedRate;

    const amountCents = untouched
      ? editing!.amountCents
      : toUsdCents(amountMinor, currency, parsedRate);
    if (amountCents == null) {
      setError("That amount doesn't convert to a usable figure.");
      return null;
    }

    // Remember the rate for the rest of the trip, and push it like any other
    // record so the other device doesn't ask again.
    if (rateFor(tripId, currency)?.unitsPerUsd !== parsedRate) {
      if (setRate(tripId, currency, parsedRate) && user) {
        void mirrorRecord(user.id, tripId, FX_ENTITY, currency);
      }
    }

    return {
      day,
      amountCents,
      category,
      note,
      foreign: { amountMinor, currency, unitsPerUsd: parsedRate },
    };
  }

  function startEdit(expense: Expense) {
    setEditing(expense);
    setDay(expense.day);
    setCategory(expense.category);
    setNote(expense.note ?? "");
    setError(null);
    if (expense.foreign) {
      const { amountMinor, currency: code, unitsPerUsd } = expense.foreign;
      setCurrency(code);
      setAmount(
        (amountMinor / 10 ** CURRENCIES[code].digits).toFixed(
          CURRENCIES[code].digits
        )
      );
      setRateInput(String(unitsPerUsd));
      return;
    }
    setCurrency("USD");
    // Plain digits, not formatCents' "$12.50" — this goes back into the field
    // the user types into.
    setAmount((expense.amountCents / 100).toFixed(2));
  }

  function handleRemove(expense: Expense) {
    if (!removeExpense(tripId, expense.id)) {
      setError("Couldn't delete that expense.");
      return;
    }
    if (editingId === expense.id) resetForm();
    onChanged(expense.id);
  }

  const total = totalCents(expenses);
  const byCategory = totalsByCategory(expenses);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Expenses</h2>
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{formatCents(total)}</span>{" "}
          logged
        </p>
      </div>

      {(queue.waiting.length > 0 ||
        queue.ready.length > 0 ||
        queue.failed.length > 0) && (
        <div className="space-y-2 rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
          {queue.waiting.length > 0 && (
            <p className="text-sm text-slate-700" role="status">
              📷 {queue.waiting.length} receipt
              {queue.waiting.length === 1 ? "" : "s"} waiting for signal —
              held on this device only.
            </p>
          )}

          {queue.ready.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-800">
                Read {row.result?.amount} {row.result?.currency ?? ""}
                {row.result?.merchant ? ` at ${row.result.merchant}` : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (row.result) handleExtracted(row.result);
                  void queue.discard(row.id);
                }}
                className="rounded-lg bg-sky-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-900"
              >
                Review
              </button>
              <button
                type="button"
                onClick={() => void queue.discard(row.id)}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Discard
              </button>
            </div>
          ))}

          {queue.failed.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-rose-700">
                Couldn&apos;t read a receipt: {row.error}
              </span>
              {/* Retry only when the photo is still here to send. */}
              {row.blob && (
                <button
                  type="button"
                  onClick={() => void queue.retry(row.id)}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Retry
                </button>
              )}
              <button
                type="button"
                onClick={() => void queue.discard(row.id)}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Discard
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500" htmlFor="expense-day">
              Day
            </label>
            <input
              id="expense-day"
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500" htmlFor="expense-amount">
              Amount
            </label>
            <div className="mt-1 flex items-center gap-1.5">
              <input
                id="expense-amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder={CURRENCIES[currency].digits === 0 ? "250000" : "12.50"}
                className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-teal-500"
              />
              <select
                aria-label="Currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
              >
                {CURRENCY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {preview && (
              <p className="mt-1 text-xs text-slate-500" role="status" aria-live="polite">
                ≈ {preview}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500" htmlFor="expense-category">
              Category
            </label>
            <select
              id="expense-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].icon} {CATEGORY_META[c].label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[8rem] flex-1">
            <label className="block text-xs font-medium text-slate-500" htmlFor="expense-note">
              Note (optional)
            </label>
            <input
              id="expense-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="Dinner at the market"
              className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-teal-500"
            />
          </div>
          <button
            type="button"
            onClick={submit}
            className="rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-900"
          >
            {editingId ? "Save changes" : "Add"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          )}
          <ReceiptScanButton
            currencyHint={currencyForDay?.(day)}
            tripId={tripId}
            onExtracted={handleExtracted}
            onError={setError}
            onQueued={queue.refresh}
          />
        </div>

        {pendingExtraction && (
          <div
            role="status"
            className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-700"
          >
            <span>
              Read {pendingExtraction.amount} {pendingExtraction.currency ?? ""}
              {pendingExtraction.merchant ? ` at ${pendingExtraction.merchant}` : ""}
              {" "}— use this?
            </span>
            <button
              type="button"
              onClick={() => applyExtraction(pendingExtraction)}
              className="rounded-lg bg-sky-800 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-900"
            >
              Use it
            </button>
            <button
              type="button"
              onClick={() => setPendingExtraction(null)}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {currency !== "USD" && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <label
              className="text-xs font-medium text-slate-500"
              htmlFor="expense-rate"
            >
              1 USD =
            </label>
            <input
              id="expense-rate"
              type="text"
              inputMode="decimal"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-teal-500"
            />
            <span className="text-xs text-slate-500">
              {CURRENCIES[currency].name} ({currency})
            </span>
            {showStaleWarning && (
              // Never blocks. A stale rate you can see beats an accurate one
              // you can't, and the traveller is the one holding the receipt.
              <span className="text-xs text-amber-700">
                suggested, from {SNAPSHOT_CAPTURED_AT} — worth checking
              </span>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-2 text-sm text-rose-700">
            {error}
          </p>
        )}
      </div>

      {expenses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No expenses logged yet. Totals are in USD.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {EXPENSE_CATEGORIES.map((c) => (
              <li
                key={c}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center"
              >
                <div className="text-lg" aria-hidden>
                  {CATEGORY_META[c].icon}
                </div>
                <div className="text-xs text-slate-500">{CATEGORY_META[c].label}</div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatCents(byCategory[c])}
                </div>
              </li>
            ))}
          </ul>

          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {expenses.map((e) => (
              <li
                key={e.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  editingId === e.id ? "bg-amber-50" : ""
                }`}
              >
                <span aria-hidden>{CATEGORY_META[e.category].icon}</span>
                <span className="w-16 flex-none text-xs text-slate-500">
                  {fmtShortDay(e.day)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  {e.note || CATEGORY_META[e.category].label}
                </span>
                <span className="flex-none text-sm font-medium text-slate-900">
                  {describeAmount(e)}
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(e)}
                  aria-label={`Edit ${describeAmount(e)} expense`}
                  className="flex-none text-xs font-medium text-teal-700 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(e)}
                  aria-label={`Delete ${describeAmount(e)} expense`}
                  className="flex-none text-xs font-medium text-rose-600 hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
