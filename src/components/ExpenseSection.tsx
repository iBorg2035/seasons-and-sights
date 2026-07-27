"use client";

import { useState } from "react";
import type { DayStamp } from "@/lib/saved-trips";
import {
  CATEGORY_META,
  EXPENSE_CATEGORIES,
  formatCents,
  parseAmountToCents,
  removeExpense,
  saveExpense,
  totalCents,
  totalsByCategory,
  type Expense,
  type ExpenseCategory,
} from "@/lib/expenses";

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
}: {
  tripId: string;
  expenses: Expense[];
  defaultDay: DayStamp;
  /** Called with the changed row's id so the caller can mirror just that row. */
  onChanged: (id: string) => void;
}) {
  const [day, setDay] = useState<DayStamp>(defaultDay);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Which logged expense the form is currently editing, if any. saveExpense
  // has always taken an id and replaced in place; only the control to reach it
  // was missing, so a mistyped amount could only be deleted and re-entered.
  const [editingId, setEditingId] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setAmount("");
    setNote("");
    setError(null);
  }

  function submit() {
    const amountCents = parseAmountToCents(amount);
    if (amountCents == null) {
      setError("Enter an amount in USD, like 12.50.");
      return;
    }
    const saved = saveExpense(tripId, {
      id: editingId ?? undefined,
      day,
      amountCents,
      category,
      note,
    });
    if (!saved) {
      setError("Couldn't save that expense. Check that browser storage is enabled.");
      return;
    }
    resetForm();
    onChanged(saved.id);
  }

  function startEdit(expense: Expense) {
    setEditingId(expense.id);
    setDay(expense.day);
    // Plain digits, not formatCents' "$12.50" — this goes back into the field
    // the user types into.
    setAmount((expense.amountCents / 100).toFixed(2));
    setCategory(expense.category);
    setNote(expense.note ?? "");
    setError(null);
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
              Amount (USD)
            </label>
            <input
              id="expense-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="12.50"
              className="mt-1 w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-teal-500"
            />
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
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-rose-700">
            {error}
          </p>
        )}
      </div>

      {expenses.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No expenses logged yet. Amounts are in USD.
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
                  {formatCents(e.amountCents)}
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(e)}
                  aria-label={`Edit ${formatCents(e.amountCents)} expense`}
                  className="flex-none text-xs font-medium text-teal-700 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(e)}
                  aria-label={`Delete ${formatCents(e.amountCents)} expense`}
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
