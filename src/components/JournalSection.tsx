"use client";

import { useState } from "react";
import type { DayStamp } from "@/lib/saved-trips";
import {
  groupByDay,
  removeEntry,
  saveEntry,
  MAX_ENTRY_CHARS,
  type JournalEntry,
} from "@/lib/journal";
import { formatCents, type Expense, totalForDay } from "@/lib/expenses";

function fmtDay(day: DayStamp): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function JournalSection({
  tripId,
  entries,
  expenses,
  defaultDay,
  placeFor,
  onChanged,
}: {
  tripId: string;
  entries: JournalEntry[];
  expenses: Expense[];
  defaultDay: DayStamp;
  /** Which destination the trip was in on a day, or null if none/undated. */
  placeFor: (day: DayStamp) => { name: string } | null;
  /** Called with the changed row's id so the caller can mirror just that row. */
  onChanged: (id: string) => void;
}) {
  const [day, setDay] = useState<DayStamp>(defaultDay);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const saved = saveEntry(tripId, {
      id: editingId ?? undefined,
      day,
      text,
    });
    if (!saved) {
      setError(
        text.trim().length > MAX_ENTRY_CHARS
          ? `That's longer than ${MAX_ENTRY_CHARS.toLocaleString()} characters — trim it and try again.`
          : "Couldn't save that entry. Check that browser storage is enabled."
      );
      return;
    }
    setError(null);
    setText("");
    setEditingId(null);
    onChanged(saved.id);
  }

  function startEdit(entry: JournalEntry) {
    setEditingId(entry.id);
    setDay(entry.day);
    setText(entry.text);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setText("");
    setError(null);
  }

  function handleRemove(entry: JournalEntry) {
    if (!window.confirm("Delete this entry? This can't be undone.")) return;
    if (!removeEntry(tripId, entry.id)) {
      setError("Couldn't delete that entry.");
      return;
    }
    if (editingId === entry.id) cancelEdit();
    // The tombstone, not the entry — mirroring it is what makes the delete
    // stick on other devices.
    onChanged(entry.id);
  }

  const groups = groupByDay(entries);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Journal</h2>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-slate-500" htmlFor="entry-day">
            Day
          </label>
          <input
            id="entry-day"
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-800"
          />
          {placeFor(day) && (
            <span className="text-xs text-slate-500">
              in {placeFor(day)!.name}
            </span>
          )}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="What happened today?"
          aria-label="Journal entry"
          className="mt-3 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-500"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            className="rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {editingId ? "Save changes" : "Add entry"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No entries yet. Notes you add here stay on this trip.
        </p>
      ) : (
        <ol className="space-y-4">
          {groups.map((group) => {
            const place = placeFor(group.day);
            const daySpend = totalForDay(expenses, group.day);
            return (
              <li
                key={group.day}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {fmtDay(group.day)}
                    {place && (
                      <span className="ml-2 font-normal text-slate-500">
                        · {place.name}
                      </span>
                    )}
                  </h3>
                  {daySpend > 0 && (
                    <span className="text-xs text-slate-500">
                      {formatCents(daySpend)} spent
                    </span>
                  )}
                </div>
                <ul className="divide-y divide-slate-100">
                  {group.entries.map((entry) => (
                    <li key={entry.id} className="px-4 py-3">
                      <p className="whitespace-pre-wrap text-sm text-slate-700">
                        {entry.text}
                      </p>
                      <div className="mt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(entry)}
                          className="text-xs font-medium text-teal-700 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(entry)}
                          className="text-xs font-medium text-rose-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
