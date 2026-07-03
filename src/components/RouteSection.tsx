"use client";

import {
  planItinerary,
  legDateRanges,
  fitQuality,
  climateForMonth,
  MONTH_NAMES,
  MONTH_NAMES_LONG,
  SEASON_META,
  type ItineraryLeg,
  type PlannerStop,
} from "@/lib/season";
import { getSlimRegion } from "@/data/regions-slim";
import type { SlimRegion } from "@/data/regions-slim";
import type { SavedTripLite } from "@/lib/saved-trips";

/**
 * Resolve a trip's [id, duration] stops into planner stops using the slim
 * (client-safe) region data, skipping any id that no longer resolves.
 */
export function tripToStops(trip: SavedTripLite): PlannerStop<SlimRegion>[] {
  return trip.stops
    .map(([id, duration]) => {
      const region = getSlimRegion(id);
      return region ? { region, durationMonths: duration } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

/** Plan the itinerary legs for a trip (slim regions, client-safe). */
export function tripLegs(trip: SavedTripLite): ItineraryLeg<SlimRegion>[] {
  const start = trip.start || new Date().getMonth() + 1;
  return planItinerary(tripToStops(trip), start);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RouteSection({
  trip,
  onStartChange,
}: {
  trip: SavedTripLite;
  /** Called when the user picks a new start month (1–12). */
  onStartChange?: (month: number) => void;
}) {
  const stops = tripToStops(trip);
  // `start` is 1-based; 0/unset falls back to the current month for display.
  const currentMonth = new Date().getMonth() + 1;
  const start = trip.start || currentMonth;
  const isFlexible = trip.start === 0;

  if (stops.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        No stops yet. Add destinations from a region page or the planner.
      </div>
    );
  }

  const legs = planItinerary(stops, start);
  const ranges = legDateRanges(start, legs);
  const totalMonths = legs.reduce((sum, l) => sum + l.months.length, 0);
  const fitSummary = legs.every((l) => l.fit >= 80)
    ? "Every stop lands in dry season"
    : legs.some((l) => l.fit < 50)
      ? "Some stops hit wet weather — consider reordering"
      : "Mostly good timing across the route";

  return (
    <div className="space-y-5">
      {/* Stop chips, colored by each leg's season fit */}
      <ol className="flex flex-wrap items-center gap-2">
        {legs.map((leg, i) => {
          const q = fitQuality(leg.fit);
          const meta = SEASON_META[q.season];
          return (
            <li key={leg.region.id} className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${meta.chip}`}
              >
                <span className="text-xs font-bold text-slate-400">
                  {i + 1}
                </span>
                {leg.region.name}
                <span className="text-xs text-slate-500/80">
                  · {leg.months.length}m
                </span>
              </span>
              {i < legs.length - 1 && (
                <span className="text-slate-300" aria-hidden>
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Season timeline: flex row of colored segments by leg duration */}
      <div>
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
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
          {legs.map((leg, i) => (
            <span key={leg.region.id} className="inline-flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${SEASON_META[fitQuality(leg.fit).season].dot}`}
                aria-hidden
              />
              {i + 1}. {leg.region.name} — {fmtDate(ranges[i].start)}
            </span>
          ))}
        </div>
      </div>

      {/* Start month + meta */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-800">
            Start month:
          </span>
          {onStartChange ? (
            <>
              {MONTH_NAMES.map((label, i) => {
                const m = i + 1;
                const isActive = !isFlexible && start === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onStartChange(m)}
                    aria-pressed={isActive}
                    className={`rounded-md border px-2 py-0.5 text-xs font-medium transition ${
                      isActive
                        ? "border-amber-300 bg-amber-100 text-amber-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => onStartChange(0)}
                aria-pressed={isFlexible}
                className={`rounded-md border px-2 py-0.5 text-xs font-medium transition ${
                  isFlexible
                    ? "border-amber-300 bg-amber-100 text-amber-800"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                }`}
                title="Let the season planner pick the best month"
              >
                Flexible
              </button>
            </>
          ) : (
            <span className="text-sm text-slate-600">
              {isFlexible ? "Flexible" : MONTH_NAMES_LONG[start - 1]}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-800">
            {isFlexible ? "Flexible start" : `Starting ${MONTH_NAMES_LONG[start - 1]}`}
          </span>{" "}
          · {totalMonths} month{totalMonths === 1 ? "" : "s"} total ·{" "}
          {fitSummary}
        </p>
      </div>

      {/* Per-leg detail rows */}
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {legs.map((leg, i) => {
          const q = fitQuality(leg.fit);
          const meta = SEASON_META[q.season];
          const end = new Date(ranges[i].end.getTime() - 86400000);
          return (
            <li key={leg.region.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">
                  {leg.region.name}
                  <span className="font-normal text-slate-400">
                    {" "}
                    · {leg.region.country}
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  {fmtDate(ranges[i].start)} → {fmtDate(end)} ·{" "}
                  {leg.months
                    .map((m) => climateForMonth(leg.region, m).season)
                    .join("/")}{" "}
                  season
                </p>
              </div>
              <span
                className={`flex-none rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.chip}`}
              >
                {q.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
