"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getSavedTrips,
  loadSavedTripToDraft,
  SAVED_TRIPS_EVENT,
} from "@/lib/saved-trips";
import { getDraft, DRAFT_EVENT } from "@/lib/trip-draft";
import { getSlimRegion } from "@/data/regions-slim";
import {
  planItinerary,
  climateForMonth,
  wrapMonth,
  monthOf,
  MONTH_NAMES,
  SEASON_META,
} from "@/lib/season";
import type { Season } from "@/types";

interface Row {
  id: string;
  name: string;
  isDraft: boolean;
  /** 1-based start month used for the span label. */
  start: number;
  totalMonths: number;
  stopCount: number;
  /** Per calendar month (index 0 = Jan): the season if the trip covers it, else null. */
  seasonByMonth: (Season | null)[];
  /** Payload to re-load this trip into the draft (null for the draft row itself). */
  trip: {
    id: string;
    name: string;
    start: number;
    stops: [string, number][];
  } | null;
}

function buildRow(
  id: string,
  name: string,
  start: number,
  stops: [string, number][],
  isDraft: boolean,
  trip: Row["trip"]
): Row | null {
  const chosen = stops
    .map(([sid, dur]) => {
      const region = getSlimRegion(sid);
      return region ? { region, durationMonths: dur } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
  if (chosen.length === 0) return null;

  const effectiveStart = start >= 1 && start <= 12 ? start : monthOf();
  const legs = planItinerary(chosen, effectiveStart);

  const seasonByMonth: (Season | null)[] = Array(12).fill(null);
  for (const leg of legs) {
    for (const m of leg.months) {
      seasonByMonth[m - 1] = climateForMonth(leg.region, m).season;
    }
  }
  const totalMonths = chosen.reduce((n, s) => n + s.durationMonths, 0);
  return {
    id,
    name,
    isDraft,
    start: effectiveStart,
    totalMonths,
    stopCount: chosen.length,
    seasonByMonth,
    trip,
  };
}

function useRows(): Row[] {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    const sync = () => {
      const out: Row[] = [];
      const draft = getDraft();
      if (draft.stops.length > 0) {
        const draftRow = buildRow(
          "__draft__",
          "Current trip",
          draft.start,
          draft.stops.map((s) => [s.id, s.duration]),
          true,
          null
        );
        if (draftRow) out.push(draftRow);
      }
      for (const t of getSavedTrips()) {
        const row = buildRow(t.id, t.name, t.start, t.stops, false, {
          id: t.id,
          name: t.name,
          start: t.start,
          stops: t.stops,
        });
        if (row) out.push(row);
      }
      setRows(out);
    };
    sync();
    for (const evt of [SAVED_TRIPS_EVENT, DRAFT_EVENT, "storage"]) {
      window.addEventListener(evt, sync);
    }
    return () => {
      for (const evt of [SAVED_TRIPS_EVENT, DRAFT_EVENT, "storage"]) {
        window.removeEventListener(evt, sync);
      }
    };
  }, []);
  return rows;
}

export function CalendarView() {
  const rows = useRows();
  const router = useRouter();
  const nowMonth = useMemo(() => monthOf(), []);

  function open(row: Row) {
    if (row.trip) loadSavedTripToDraft(row.trip);
    router.push("/planner");
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
        <p className="text-slate-600">No trips to show on the calendar yet.</p>
        <Link
          href="/planner"
          className="mt-4 inline-block rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Plan a trip →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        {(["dry", "shoulder", "wet"] as Season[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${SEASON_META[s].dot}`} />
            {SEASON_META[s].label}
          </span>
        ))}
        <span className="text-slate-400">· bars show each stop&apos;s season by month</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="min-w-[680px]">
          {/* Month header */}
          <div
            className="grid items-center gap-1 pb-2"
            style={{ gridTemplateColumns: "11rem repeat(12, 1fr)" }}
          >
            <div />
            {MONTH_NAMES.map((m, i) => (
              <div
                key={m}
                className={`text-center text-xs ${
                  i + 1 === nowMonth
                    ? "font-semibold text-amber-600"
                    : "text-slate-400"
                }`}
              >
                {m}
              </div>
            ))}
          </div>

          {/* Trip rows */}
          <div className="space-y-1.5">
            {rows.map((row) => {
              const end = wrapMonth(row.start + row.totalMonths - 1);
              const span = `${MONTH_NAMES[row.start - 1]}–${MONTH_NAMES[end - 1]}`;
              return (
                <button
                  key={row.id}
                  onClick={() => open(row)}
                  className="grid w-full items-center gap-1 rounded-lg px-1 py-1 text-left transition hover:bg-slate-50"
                  style={{ gridTemplateColumns: "11rem repeat(12, 1fr)" }}
                  title={`Open ${row.name}`}
                >
                  <div className="min-w-0 pr-2">
                    <span className="flex items-center gap-1.5">
                      {row.isDraft && (
                        <span className="h-2 w-2 flex-none rounded-full bg-amber-500" />
                      )}
                      <span className="truncate text-sm font-medium text-slate-900">
                        {row.name}
                      </span>
                    </span>
                    <span className="block text-xs text-slate-400">
                      {span} · {row.totalMonths} mo · {row.stopCount} stop
                      {row.stopCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  {row.seasonByMonth.map((season, i) => (
                    <div
                      key={i}
                      className={`h-6 rounded ${
                        season ? SEASON_META[season].dot : "bg-slate-100"
                      } ${
                        i + 1 === nowMonth ? "ring-2 ring-inset ring-amber-400" : ""
                      }`}
                    />
                  ))}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Tap a trip to open it in the planner. Bars span the months each trip
        covers, coloured by that stop&apos;s season.
      </p>
    </div>
  );
}
