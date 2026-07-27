"use client";

import {
  fitQuality,
  formatStay,
  MONTH_NAMES,
  SEASON_META,
} from "@/lib/season";
import { resolveStartMonth, tripDateRanges } from "@/lib/trip-plan";
import { tripSlimLegs } from "@/lib/trip-plan-slim";
import type { SavedTripLite } from "@/lib/saved-trips";
import { RouteMap } from "@/components/RouteMap";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MapSection({ trip }: { trip: SavedTripLite }) {
  const start = resolveStartMonth(trip.start);
  const legs = tripSlimLegs(trip);
  const ranges = tripDateRanges(trip, legs);
  const totalMonths = legs.reduce((sum, l) => sum + l.months.length, 0);

  if (legs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Add stops to see your route on the map.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-[320px] w-full sm:h-[420px]">
          <RouteMap legs={legs} />
        </div>
      </div>

      {/* Per-trip timeline: colored segments by leg duration/season */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
          {legs.map((leg) => {
            const q = fitQuality(leg.fit);
            const meta = SEASON_META[q.season];
            return (
              <div
                key={leg.region.id}
                className={`${meta.dot}`}
                style={{ flexGrow: leg.months.length }}
                title={`${leg.region.name} · ${q.label}`}
              />
            );
          })}
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {legs.map((leg, i) => (
            <li
              key={leg.region.id}
              className="flex items-center gap-2 text-xs text-slate-600"
            >
              <span
                className={`h-2.5 w-2.5 flex-none rounded-full ${SEASON_META[fitQuality(leg.fit).season].dot}`}
                aria-hidden
              />
              <span className="font-medium text-slate-800">
                {i + 1}. {leg.region.name}
              </span>
              <span className="text-slate-400">·</span>
              <span>
                {ranges[i] ? fmtDate(ranges[i]!.start) : "Dates TBD"} —{" "}
                {leg.months
                  .map((m) => MONTH_NAMES[m - 1])
                  .join("/")}{" "}
                ({formatStay(leg.durationMonths ?? leg.months.length)})
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          {totalMonths} month{totalMonths === 1 ? "" : "s"} · starting{" "}
          {MONTH_NAMES[start - 1]}
        </p>
      </div>
    </div>
  );
}
