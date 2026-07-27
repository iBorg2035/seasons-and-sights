"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getSavedTrips,
  deleteSavedTrip,
  SAVED_TRIPS_EVENT,
} from "@/lib/saved-trips";
import { useAuth } from "@/lib/contexts/auth-context";
import { deleteRemoteTrip } from "@/lib/supabase/trips";
import { eventsInMonthForRegions } from "@/data/events-slim";
import {
  climateForMonth,
  formatStay,
  wrapMonth,
  monthOf,
  MONTH_NAMES,
  MONTH_NAMES_LONG,
  SEASON_META,
} from "@/lib/season";
import { resolveStartMonth } from "@/lib/trip-plan";
import { tripSlimLegs, tripToSlimStops } from "@/lib/trip-plan-slim";
import type { Season } from "@/types";

const SEASON_BAR: Record<Season, string> = {
  dry: "bg-amber-400",
  shoulder: "bg-emerald-400",
  wet: "bg-sky-400",
};

interface MonthCell {
  season: Season;
  regionName: string;
  festivals: string[];
}

interface Row {
  id: string;
  name: string;
  start: number;
  totalMonths: number;
  stopCount: number;
  /** Index 0 = Jan; null where the trip isn't travelling. */
  cells: (MonthCell | null)[];
  trip: {
    id: string;
    ownerId?: string;
    name: string;
    start: number;
    stops: [string, number][];
    updatedAt?: number;
  } | null;
}

/** Contiguous covered runs as [startIdx, endIdx] pairs (0-based, inclusive). */
function coveredRuns(cells: (MonthCell | null)[]): [number, number][] {
  const runs: [number, number][] = [];
  let start = -1;
  for (let i = 0; i < 12; i++) {
    if (cells[i] && start === -1) start = i;
    if ((!cells[i] || i === 11) && start !== -1) {
      runs.push([start, cells[i] && i === 11 ? i : i - 1]);
      start = -1;
    }
  }
  return runs;
}

function buildRow(
  id: string,
  name: string,
  start: number,
  stops: [string, number][],
  trip: Row["trip"]
): Row | null {
  const chosen = tripToSlimStops({ start, stops });
  if (chosen.length === 0) return null;

  const effectiveStart = resolveStartMonth(start);
  const legs = tripSlimLegs({ start, stops });

  const cells: (MonthCell | null)[] = Array(12).fill(null);
  for (const leg of legs) {
    for (const m of leg.months) {
      cells[m - 1] = {
        season: climateForMonth(leg.region, m).season,
        regionName: leg.region.name,
        festivals: eventsInMonthForRegions([leg.region.id], m).map(
          (f) => f.event.name
        ),
      };
    }
  }
  return {
    id,
    name,
    start: effectiveStart,
    totalMonths: chosen.reduce((n, s) => n + s.durationMonths, 0),
    stopCount: chosen.length,
    cells,
    trip,
  };
}

function useRows(): Row[] {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    const sync = () => {
      const out: Row[] = [];
      for (const t of getSavedTrips()) {
        const row = buildRow(t.id, t.name, t.start, t.stops, { ...t });
        if (row) out.push(row);
      }
      setRows(out);
    };
    sync();
    for (const evt of [SAVED_TRIPS_EVENT, "storage"]) {
      window.addEventListener(evt, sync);
    }
    return () => {
      for (const evt of [SAVED_TRIPS_EVENT, "storage"]) {
        window.removeEventListener(evt, sync);
      }
    };
  }, []);
  return rows;
}

export function CalendarView() {
  const rows = useRows();
  const router = useRouter();
  const { user } = useAuth();
  const nowMonth = useMemo(() => monthOf(), []);
  const [deleteError, setDeleteError] = useState(false);

  function open(row: Row) {
    router.push(`/trips/${row.id}`);
  }

  function remove(row: Row) {
    if (!row.trip) return;
    if (!deleteSavedTrip(row.trip.id)) {
      setDeleteError(true);
      return;
    }
    setDeleteError(false);
    if (user && (!row.trip.ownerId || row.trip.ownerId === user.id)) {
      void deleteRemoteTrip(row.trip.id);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
        <p className="text-slate-600">No trips to show on the calendar yet.</p>
        <Link
          href="/trips"
          className="mt-4 inline-block rounded-xl bg-sky-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-900"
        >
          Plan a trip →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {deleteError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Couldn&apos;t delete that trip. Check that browser storage is enabled
          and try again.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        {(["dry", "shoulder", "wet"] as Season[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${SEASON_META[s].dot}`} />
            {SEASON_META[s].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-white ring-1 ring-slate-300" />
          festival
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex min-w-[640px] gap-4">
          {/* Labels */}
          <div className="w-44 flex-none">
            <div className="h-6" />
            {rows.map((row) => (
              <div key={row.id} className="group flex h-9 items-center gap-1">
                <button
                  onClick={() => open(row)}
                  title={`${row.name}: ${MONTH_NAMES[row.start - 1]} start · ${formatStay(row.totalMonths)} · ${row.stopCount} ${row.stopCount === 1 ? "stop" : "stops"}. Open trip.`}
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-800 transition hover:text-teal-700"
                >
                  {row.name}
                </button>
                <span className="flex flex-none opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    onClick={() => remove(row)}
                    aria-label={`Delete ${row.name}`}
                    title="Delete"
                    className="rounded px-1 text-xs text-slate-400 hover:text-rose-600"
                  >
                    ✕
                  </button>
                </span>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="relative min-w-0 flex-1">
            {/* Today guide */}
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-0 top-6 w-px bg-amber-400/60"
              style={{ left: `${((nowMonth - 0.5) / 12) * 100}%` }}
            />
            {/* Month header */}
            <div className="flex h-6">
              {MONTH_NAMES.map((m, i) => (
                <div
                  key={m}
                  className={`flex-1 text-center text-[11px] leading-6 ${
                    i + 1 === nowMonth
                      ? "font-semibold text-teal-700"
                      : "text-slate-400"
                  }`}
                >
                  {m}
                </div>
              ))}
            </div>
            {/* Bars */}
            {rows.map((row) => (
              <div key={row.id} className="relative h-9">
                <button
                  onClick={() => open(row)}
                  aria-label={`Open ${row.name}`}
                  className="absolute inset-y-2 left-0 right-0 rounded-full bg-slate-400/10 transition hover:bg-slate-400/20"
                />
                {coveredRuns(row.cells).map(([a, b]) => (
                  <div
                    key={a}
                    className="pointer-events-none absolute inset-y-2 flex overflow-hidden rounded-full"
                    style={{
                      left: `${(a / 12) * 100}%`,
                      width: `${((b - a + 1) / 12) * 100}%`,
                    }}
                  >
                    {row.cells.slice(a, b + 1).map((cell, k) => (
                      <div
                        key={k}
                        title={
                          cell
                            ? `${MONTH_NAMES_LONG[a + k]} — ${cell.regionName} (${SEASON_META[cell.season].short.toLowerCase()})${
                                cell.festivals.length
                                  ? ` · 🎉 ${cell.festivals.join(", ")}`
                                  : ""
                              }`
                            : undefined
                        }
                        className={`pointer-events-auto relative flex-1 ${
                          cell ? SEASON_BAR[cell.season] : ""
                        }`}
                      >
                        {cell && cell.festivals.length > 0 && (
                          <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Click a trip or its bar to open it · hover a bar for the stop and season
        that month · white dots mark festivals · ✕ delete.
      </p>
    </div>
  );
}
