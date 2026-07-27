"use client";

import { useEffect, useState } from "react";
import {
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
  formatStay,
  SEASON_META,
  WEEK_MONTHS,
} from "@/lib/season";
import { tripSlimLegs } from "@/lib/trip-plan-slim";
import {
  bookingIssues,
  tripDateRanges,
  type BookingIssue,
} from "@/lib/trip-plan";
import { AddStopsDialog } from "@/components/AddStopsDialog";
import { StopDetail } from "@/components/StopDetail";
import { ReservationsBlock } from "@/components/ReservationsBlock";
import type { Reservation } from "@/lib/reservations";

/** Stay lengths offered per stop. Weeks first — a fortnight in one place is a
 *  far more common trip than three months in one. */
const DURATIONS = [WEEK_MONTHS, WEEK_MONTHS * 2, 1, 2, 3] as const;

/** Compare stay lengths by whole days, so float noise can't unselect a chip. */
function sameStay(a: number, b: number): boolean {
  return Math.round(a * 30) === Math.round(b * 30);
}

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
 * A stay needs both halves to exist, so a half-filled pair can't be committed.
 * It is held locally AND said out loud: silently keeping a date the user can
 * see in the field, but which vanishes on the next reload, is the single most
 * confusing thing this control did.
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

  // Re-sync when the stay changes underneath us — a cloud sync, another tab,
  // or a mode switch. Without this the fields keep their first value while the
  // rest of the page shows the new one, so the same stop reads two ways at
  // once. Keyed on the values, so an uncommitted half-filled draft is left
  // alone (it hasn't changed `range`).
  useEffect(() => {
    setStart(range?.start ?? "");
    setEnd(range?.end ?? "");
  }, [range?.start, range?.end]);

  function commit(nextStart: string, nextEnd: string) {
    setStart(nextStart);
    setEnd(nextEnd);
    if (nextStart && nextEnd) onChange({ start: nextStart, end: nextEnd });
    else if (!nextStart && !nextEnd) onChange(null);
  }

  const halfFilled = Boolean(start) !== Boolean(end);

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
      {halfFilled ? (
        <span role="status" className="text-xs font-medium text-amber-700">
          Add {start ? "a leave" : "an arrive"} date to save this stay
        </span>
      ) : (
        !range && <span className="text-xs text-slate-400">Dates TBD</span>
      )}
    </div>
  );
}

export function StopsSection({
  trip,
  onEdit,
  onLockInDates,
  reservations,
  onReservationChanged,
}: {
  trip: SavedTripLite;
  /** Apply an edit to the trip page's working copy. */
  onEdit: (mutate: (trip: SavedTripLite) => void) => void;
  /** Switch the trip onto real dates — the same action as the mode toggle,
   *  surfaced where someone asks "can I just pick the dates?". */
  onLockInDates?: () => void;
  /** This trip's saved reservations, grouped onto stops below. */
  reservations?: Reservation[];
  onReservationChanged?: (id: string) => void;
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
  // stopIndex is the position in `trip.stops`, carried through because this
  // list is FILTERED: a region retired from the dataset is dropped from the
  // view but still occupies a slot in stops and bookedDates. Indexing those by
  // the visible position would hang every date on the wrong destination — the
  // same misalignment moveStop/removeStopAt already guard against.
  const resolved = trip.stops
    .map(([id, duration], stopIndex) => {
      const region = getSlimRegion(id);
      return region ? { id, duration, region, stopIndex } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const legs = tripSlimLegs(trip);
  // The stop's real window: committed dates when booked, the planned range
  // otherwise. Indexed by leg, and legs are in stops order only when booked —
  // so look it up by region below rather than by row index.
  const legRanges = tripDateRanges(trip, legs);
  // planItinerary reorders for best fit; map region id → leg for the label.
  const legByRegion = new Map(legs.map((l) => [l.region.id, l]));
  const reservationsByRegion = new Map<string, Reservation[]>();
  for (const r of reservations ?? []) {
    const list = reservationsByRegion.get(r.regionId) ?? [];
    list.push(r);
    reservationsByRegion.set(r.regionId, list);
  }
  const rangeByRegion = new Map(
    legs.map((l, k) => [l.region.id, legRanges[k] ?? null])
  );

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
                  for (const id of ids) t.stops.push([id, 1]);
                });
              }
            }}
          />
        )}
      </>
    );
  }

  // Edits go to the parent's working copy, not to storage — the trip page
  // now saves explicitly.
  function mutate(fn: (t: SavedTripLite) => void) {
    onEdit(fn);
  }

  return (
    <>
    {/* Also at the top, not only after the list. Stops expand into the full
        destination guide by default, so with even one stop the button below
        the list is a couple of screens down — which reads as "there's no way
        to add another". */}
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-slate-500">
        {resolved.length} {resolved.length === 1 ? "stop" : "stops"} · expand a
        stop for its full guide
      </p>
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="rounded-lg bg-sky-800 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-900"
      >
        + Add destination
      </button>
    </div>
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
                  {region.country} · {formatStay(s.duration)}
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
                  stayRange={rangeByRegion.get(region.id) ?? null}
                  stayLabel={booked ? "your booked stay" : "your planned stay"}
                  onSetExactDates={booked ? undefined : onLockInDates}
                  reservationSlot={
                    <ReservationsBlock
                      tripId={trip.id}
                      regionId={region.id}
                      reservations={reservationsByRegion.get(region.id) ?? []}
                      onChanged={(rid) => onReservationChanged?.(rid)}
                      onUseDates={(range) =>
                        mutate((t) => {
                          // Committing dates from a booking implies the trip is
                          // on real dates — otherwise they'd be written and
                          // then ignored, since tripLegs dispatches on mode.
                          t.mode = "booked";
                          setStopDates(t, s.stopIndex, range);
                        })
                      }
                    />
                  }
                />
              </div>
            )}

            {/* Controls row — always visible */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-white px-4 py-2">
              {booked ? (
                <BookedDates
                  range={trip.bookedDates?.[s.stopIndex] ?? null}
                  onChange={(next) =>
                    mutate((t) => setStopDates(t, s.stopIndex, next))
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
                  aria-pressed={sameStay(s.duration, d)}
                  className={`rounded-md border px-2 py-0.5 text-xs font-medium transition ${
                    sameStay(s.duration, d)
                      ? "border-amber-300 bg-amber-100 text-amber-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {formatStay(d)}
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
            {(issuesByStop.get(s.stopIndex) ?? []).map((issue) => (
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
              for (const id of ids) t.stops.push([id, 1]);
            });
          }
        }}
      />
    )}
  </>
  );
}
