"use client";

import { useState } from "react";
import {
  KIND_META,
  RESERVATION_KINDS,
  removeReservation,
  saveReservation,
  stayRangeFor,
  type Reservation,
  type ReservationKind,
} from "@/lib/reservations";
import { formatCents, parseAmountToCents } from "@/lib/expenses";
import type { BookedRange } from "@/lib/saved-trips";

function fmtDay(day?: string): string {
  if (!day) return "—";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * What you booked for this stop. Typed in by hand — nothing comes back from
 * Booking.com — so the form stays deliberately forgiving: a confirmation
 * number on its own is a valid reservation.
 */
export function ReservationsBlock({
  tripId,
  regionId,
  reservations,
  onChanged,
  onUseDates,
}: {
  tripId: string;
  regionId: string;
  reservations: Reservation[];
  onChanged: (id: string) => void;
  /** Offered when a stay's dates could fill this stop's arrive/leave pickers. */
  onUseDates?: (range: BookedRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<ReservationKind>("stay");
  const [provider, setProvider] = useState("");
  const [reference, setReference] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEditingId(null);
    setKind("stay");
    setProvider("");
    setReference("");
    setStart("");
    setEnd("");
    setAmount("");
    setError(null);
    setOpen(false);
  }

  function submit() {
    // Blank is fine — an amount you don't know yet shouldn't block saving the
    // confirmation number. Only a non-empty, unparseable amount is an error.
    let amountCents: number | undefined;
    if (amount.trim()) {
      const parsed = parseAmountToCents(amount);
      if (parsed == null) {
        setError("Enter an amount in USD, like 420.00 — or leave it blank.");
        return;
      }
      amountCents = parsed;
    }

    const saved = saveReservation(tripId, {
      id: editingId ?? undefined,
      kind,
      regionId,
      provider,
      reference,
      start: start || undefined,
      end: end || undefined,
      amountCents,
    });
    if (!saved) {
      setError(
        start && end && end < start
          ? "Those dates end before they start."
          : "Couldn't save that reservation."
      );
      return;
    }
    const id = saved.id;
    reset();
    onChanged(id);
  }

  function startEdit(r: Reservation) {
    setEditingId(r.id);
    setKind(r.kind);
    setProvider(r.provider ?? "");
    setReference(r.reference ?? "");
    setStart(r.start ?? "");
    setEnd(r.end ?? "");
    setAmount(r.amountCents != null ? (r.amountCents / 100).toFixed(2) : "");
    setError(null);
    setOpen(true);
  }

  function remove(r: Reservation) {
    if (!window.confirm("Delete this reservation?")) return;
    if (!removeReservation(tripId, r.id)) {
      setError("Couldn't delete that reservation.");
      return;
    }
    if (editingId === r.id) reset();
    onChanged(r.id);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">Your booking</h3>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            + Add a reservation
          </button>
        )}
      </div>

      {reservations.length === 0 && !open && (
        <p className="mt-2 text-sm text-slate-500">
          Booked something? Save the confirmation here so it&apos;s with the
          trip — and offline when you arrive.
        </p>
      )}

      {reservations.length > 0 && (
        <ul className="mt-3 space-y-2">
          {reservations.map((r) => {
            const range = stayRangeFor(r);
            return (
              <li
                key={r.id}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  editingId === r.id
                    ? "border-amber-300 bg-amber-50"
                    : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span aria-hidden>{KIND_META[r.kind].icon}</span>
                  <span className="font-medium text-slate-800">
                    {r.provider || KIND_META[r.kind].label}
                  </span>
                  {r.reference && (
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                      {r.reference}
                    </code>
                  )}
                  {r.amountCents != null && (
                    <span className="text-slate-600">
                      {formatCents(r.amountCents)}
                    </span>
                  )}
                  <span className="ml-auto flex gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(r)}
                      className="text-xs font-medium text-teal-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      className="text-xs font-medium text-rose-600 hover:underline"
                    >
                      Delete
                    </button>
                  </span>
                </div>
                {(r.start || r.end) && (
                  <p className="mt-1 text-xs text-slate-500">
                    {fmtDay(r.start)} → {fmtDay(r.end)}
                    {/* Only for a stay with both ends: a flight can't say how
                        long you're somewhere. */}
                    {range && onUseDates && (
                      <>
                        {" · "}
                        <button
                          type="button"
                          onClick={() => onUseDates(range)}
                          className="font-medium text-teal-700 hover:underline"
                        >
                          Use these as the stop&apos;s dates
                        </button>
                      </>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-medium text-slate-600">
              <span className="block">Type</span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ReservationKind)}
                aria-label="Reservation type"
                className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
              >
                {RESERVATION_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_META[k].icon} {KIND_META[k].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-[9rem] flex-1 text-xs font-medium text-slate-600">
              <span className="block">Booked with</span>
              <input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Hotel or airline"
                aria-label="Booked with"
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
              />
            </label>
            <label className="min-w-[8rem] flex-1 text-xs font-medium text-slate-600">
              <span className="block">Confirmation</span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ref or flight no."
                aria-label="Confirmation or flight number"
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-medium text-slate-600">
              <span className="block">{kind === "stay" ? "Check in" : "Date"}</span>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                aria-label={kind === "stay" ? "Check in" : "Date"}
                className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
              />
            </label>
            {kind === "stay" && (
              <label className="text-xs font-medium text-slate-600">
                <span className="block">Check out</span>
                <input
                  type="date"
                  value={end}
                  min={start || undefined}
                  onChange={(e) => setEnd(e.target.value)}
                  aria-label="Check out"
                  className="mt-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
                />
              </label>
            )}
            <label className="text-xs font-medium text-slate-600">
              <span className="block">Paid (USD)</span>
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="optional"
                aria-label="Amount paid in USD"
                className="mt-1 w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
              />
            </label>
            <button
              type="button"
              onClick={submit}
              className="rounded-lg bg-sky-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-900"
            >
              {editingId ? "Save changes" : "Save reservation"}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
