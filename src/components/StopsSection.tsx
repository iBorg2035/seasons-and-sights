"use client";

import { useState } from "react";
import Link from "next/link";
import { updateTrip, type SavedTripLite } from "@/lib/saved-trips";
import { getSlimRegion } from "@/data/regions-slim";
import {
  planItinerary,
  fitQuality,
  climateForMonth,
  SEASON_META,
  type PlannerStop,
  type ItineraryLeg,
} from "@/lib/season";

const DURATIONS = [1, 2, 3] as const;

export function StopsSection({
  trip,
  onChange,
}: {
  trip: SavedTripLite;
  /** Re-read the trip after a mutation so the parent stays in sync. */
  onChange: () => void;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  // Resolve stops to slim regions + planner stops, planning so we know each
  // leg's start month for the season-fit label.
  const stops: PlannerStop[] = [];
  const resolved = trip.stops
    .map(([id, duration]) => {
      const region = getSlimRegion(id);
      if (region) stops.push({ region, durationMonths: duration });
      return region ? { id, duration, region } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const start = trip.start || new Date().getMonth() + 1;
  const legs: ItineraryLeg[] = planItinerary(stops, start);
  // planItinerary reorders for best fit; map region id → leg for the label.
  const legByRegion = new Map(legs.map((l) => [l.region.id, l]));

  if (resolved.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        No stops yet. Add destinations from any region page.
      </div>
    );
  }

  function mutate(fn: (t: SavedTripLite) => void) {
    updateTrip(trip.id, fn);
    onChange();
  }

  return (
    <ul className="space-y-2">
      {resolved.map((s, i) => {
        const { region } = s;
        const leg = legByRegion.get(region.id);
        const isOpen = openIdx === i;
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
              onClick={() => setOpenIdx(isOpen ? null : i)}
              aria-expanded={isOpen}
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
              <div className="space-y-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
                <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {region.info?.visa && (
                    <p>
                      <span className="font-medium text-slate-700">Visa:</span>{" "}
                      {region.info.visa}
                    </p>
                  )}
                  {typeof region.dailyBudget === "number" && (
                    <p>
                      <span className="font-medium text-slate-700">
                        Daily cost:
                      </span>{" "}
                      ~${region.dailyBudget}/day
                    </p>
                  )}
                  {region.sightCount > 0 && (
                    <p>
                      <span className="font-medium text-slate-700">
                        Highlights:
                      </span>{" "}
                      {region.sightCount} sight
                      {region.sightCount === 1 ? "" : "s"}
                      {region.sightTypes.length
                        ? ` · ${region.sightTypes.join(", ")}`
                        : ""}
                    </p>
                  )}
                  {region.info?.health && (
                    <p>
                      <span className="font-medium text-slate-700">Health:</span>{" "}
                      {region.info.health}
                    </p>
                  )}
                </div>
                {region.climateBlurb && (
                  <p className="text-slate-500">{region.climateBlurb}</p>
                )}
                <Link
                  href={`/regions/${region.id}`}
                  className="inline-block font-medium text-amber-600 hover:underline"
                >
                  Full guide →
                </Link>
              </div>
            )}

            {/* Controls row — always visible */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-2">
              <span className="text-xs font-medium text-slate-500">Stay:</span>
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
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {d}m
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-slate-200" aria-hidden />
              <button
                type="button"
                onClick={() =>
                  mutate((t) => {
                    const idx = t.stops.findIndex(([id]) => id === region.id);
                    if (idx > 0)
                      [t.stops[idx - 1], t.stops[idx]] = [
                        t.stops[idx],
                        t.stops[idx - 1],
                      ];
                  })
                }
                disabled={i === 0}
                aria-label="Move up"
                className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() =>
                  mutate((t) => {
                    const idx = t.stops.findIndex(([id]) => id === region.id);
                    if (idx >= 0 && idx < t.stops.length - 1)
                      [t.stops[idx + 1], t.stops[idx]] = [
                        t.stops[idx],
                        t.stops[idx + 1],
                      ];
                  })
                }
                disabled={i === resolved.length - 1}
                aria-label="Move down"
                className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() =>
                  mutate((t) => {
                    t.stops = t.stops.filter(([id]) => id !== region.id);
                  })
                }
                aria-label={`Remove ${region.name}`}
                className="ml-auto rounded-md border border-rose-200 bg-white px-2 py-0.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
              >
                ✕ Remove
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
