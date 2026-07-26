"use client";

import { useState } from "react";
import {
  updateTrip,
  moveStop,
  removeStopAt,
  setStopDates,
  isBooked,
  type SavedTripLite,
} from "@/lib/saved-trips";
import { getSlimRegion } from "@/data/regions-slim";
import {
  fitQuality,
  climateForMonth,
  SEASON_META,
} from "@/lib/season";
import { tripSlimLegs } from "@/lib/trip-plan-slim";
import { bookingIssues, type BookingIssue } from "@/lib/trip-plan";
import { AddStopsDialog } from "@/components/AddStopsDialog";
import { StopDetail } from "@/components/StopDetail";

const DURATIONS = [1, 2, 3] as const;

const ISSUE_TEXT: Record<BookingIssue["kind"], string> = {
  gap: "Gap before this stop — nothing booked in between.",
  overlap: "Overlaps the previous stop.",
  inverted: "Leaves before it arrives.",
};

/**
 * Arrive/leave pickers for a committed stay. `leave` is the day you go, which
 * is exactly the exclusive end BookedRange stores — so what the user types is
 * what gets saved, with no off-by-one translation.
 *
 * Editing one field before the other is normal, so a half-filled pair is held
 * locally and only committed once both sides are present; clearing either
 * clears the stay.
 */
function BookedDates({
  range,
  onChange,
}: {
  range: { start: string; end: string } | null;
  onChange: (next: { start: string; end: string } | null) => void;
}) {
  const [start, setStart] = useState(range?.start ?? "");
  const [end, setEnd] = useState(range?.end ?? "");

  function commit(nextStart: string, nextEnd: string) {
    setStart(nextStart);
    setEnd(nextEnd);
    if (nextStart && nextEnd) onChange({ start: nextStart, end: nextEnd });
    else if (!nextStart && !nextEnd) onChange(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <label className="text-xs font-medium text-slate-700">
        <span className="sr-only">Arrive</span>
        <input
          type="date"
          value={start}
          onChange={(e) => commit(e.target.value, end)}
          aria-label="Arrive"
          className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-800"
        />
      </label>
      <span className="text-xs text-slate-400" aria-hidden>
        →
      </span>
      <label className="text-xs font-medium text-slate-700">
        <span className="sr-only">Leave</span>
        <input
          type="date"
          value={end}
          min={start || undefined}
          onChange={(e) => commit(start, e.target.value)}
          aria-label="Leave"
          className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-800"
        />
      </label>
      {!range && (
        <span className="text-xs text-slate-400">Dates TBD</span>
      )}
    </div>
  );
}

export function StopsSection({
  trip,
  onChange,
  onSaveFailure,
}: {
  trip: SavedTripLite;
  /** Re-read the trip after a mutation so the parent stays in sync. */
  onChange: () => void;
  onSaveFailure?: () => void;
}) {
  // Stops expand to show full destination detail by default — the rich local
  // info (climate, sights, map, toolkit) is the point of the trip page, so it
  // shouldn't be hidden behind a click. `collapsedIds` tracks *manually*
  // collapsed stops by region id (not array position) so reordering a stop
  // doesn't leave its collapsed/expanded state behind at the old index.
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  // Rows for the stop list, in the trip's own order (the planner reorders, but
  // the editable list must stay in the order the user arranged).
  const resolved = trip.stops
    .map(([id, duration]) => {
      const region = getSlimRegion(id);
      return region ? { id, duration, region } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const legs = tripSlimLegs(trip);
  // planItinerary reorders for best fit; map region id → leg for the label.
  const legByRegion = new Map(legs.map((l) => [l.region.id, l]));

  const booked = isBooked(trip);
  // Advisory only — gaps and overlaps are both legitimate (going home in
  // between; keeping the old flat a few days). Shown, never blocking.
  const issuesByStop = new Map<number, BookingIssue[]>();
  for (const issue of bookingIssues(trip)) {
    const list = issuesByStop.get(issue.index) ?? [];
    list.push(issue);
    issuesByStop.set(issue.index, list);
  }

  if (resolved.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <p className="mb-4 text-slate-500">No stops yet.</p>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-xl bg-sky-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-900"
          >
            + Add a destination
          </button>
        </div>
        {adding && (
          <AddStopsDialog
            existingIds={trip.stops.map(([id]) => id)}
            onClose={() => setAdding(false)}
            onAdd={(ids) => {
              if (ids.length) {
                mutate((t) => {
                  for (const id of ids) t.stops.push([id, 2]);
                });
              }
            }}
          />
        )}
      </>
    );
  }

  function mutate(fn: (t: SavedTripLite) => void) {
    if (!updateTrip(trip.id, fn)) {
      onSaveFailure?.();
      return;
    }
    onChange();
  }

  return (
    <>
    <ul className="space-y-2">
      {resolved.map((s, i) => {
        const { region } = s;
        const leg = legByRegion.get(region.id);
        const isOpen = !collapsedIds.has(region.id);
        const season = leg
          ? climateForMonth(region, leg.months[0]).season
          : "shoulder";
        const fitLabel = leg ? fitQuality(leg.fit).label : "";
        const meta = SEASON_META[season];

        return (
          <li
            key={region.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            {/* Collapsed header — click toggles */}
            <button
              type="button"
              onClick={() =>
                setCollapsedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(region.id)) next.delete(region.id);
                  else next.add(region.id);
                  return next;
                })
              }
              id={`stop-toggle-${region.id}`}
              aria-expanded={isOpen}
              aria-controls={`stop-panel-${region.id}`}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
            >
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-900">
                  {region.name}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {region.country} · {s.duration}m
                </span>
              </span>
              <span
                className={`flex-none rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.chip}`}
              >
                {fitLabel || meta.short}
              </span>
              <span
                className={`flex-none text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
                aria-hidden
              >
                ▾
              </span>
            </button>

            {isOpen && (
              <div
                id={`stop-panel-${region.id}`}
                aria-labelledby={`stop-toggle-${region.id}`}
              >
                <StopDetail
                  region={region}
                  prevStop={i > 0 ? resolved[i - 1]?.region : undefined}
                  stayMonth={leg?.months[0]}
                  stayMonths={leg?.months}
                />
              </div>
            )}

            {/* Controls row — always visible */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-white px-4 py-2">
              {booked ? (
                <BookedDates
                  range={trip.bookedDates?.[i] ?? null}
                  onChange={(next) =>
                    mutate((t) => setStopDates(t, i, next))
                  }
                />
              ) : (
                <>
              <span className="text-xs font-medium text-slate-700">Stay:</span>
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    mutate((t) => {
                      const row = t.stops.find(([id]) => id === region.id);
                      if (row) row[1] = d;
                    })
                  }
                  aria-pressed={s.duration === d}
                  className={`rounded-md border px-2 py-0.5 text-xs font-medium transition ${
                    s.duration === d
                      ? "border-amber-300 bg-amber-100 text-amber-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {d}m
                </button>
              ))}
                </>
              )}
              <span className="mx-1 h-4 w-px bg-slate-200" aria-hidden />
              <button
                type="button"
                onClick={() =>
                  mutate((t) => {
                    const idx = t.stops.findIndex(([id]) => id === region.id);
                    if (idx > 0) moveStop(t, idx, idx - 1);
                  })
                }
                disabled={i === 0}
                aria-label="Move up"
                className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-slate-700 transition hover:bg-slate-50 disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() =>
                  mutate((t) => {
                    const idx = t.stops.findIndex(([id]) => id === region.id);
                    if (idx >= 0 && idx < t.stops.length - 1)
                      moveStop(t, idx, idx + 1);
                  })
                }
                disabled={i === resolved.length - 1}
                aria-label="Move down"
                className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-slate-700 transition hover:bg-slate-50 disabled:opacity-30"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() =>
                  mutate((t) => {
                    const idx = t.stops.findIndex(([id]) => id === region.id);
                    removeStopAt(t, idx);
                  })
                }
                aria-label={`Remove ${region.name}`}
                className="ml-auto rounded-md border border-rose-200 bg-white px-2 py-0.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
              >
                ✕ Remove
              </button>
            </div>
            {(issuesByStop.get(i) ?? []).map((issue) => (
              <p
                key={issue.kind}
                className="border-t border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-800"
              >
                {ISSUE_TEXT[issue.kind]}
              </p>
            ))}
          </li>
        );
      })}
    </ul>

    <button
      type="button"
      onClick={() => setAdding(true)}
      className="mt-2 w-full rounded-2xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
    >
      + Add destination
    </button>

    {adding && (
      <AddStopsDialog
        existingIds={trip.stops.map(([id]) => id)}
        onClose={() => setAdding(false)}
        onAdd={(ids) => {
          if (ids.length) {
            mutate((t) => {
              for (const id of ids) t.stops.push([id, 2]);
            });
          }
        }}
      />
    )}
  </>
  );
}
