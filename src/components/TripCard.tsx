"use client";

import Link from "next/link";
import type { Season } from "@/types";
import type { SlimRegion } from "@/data/regions-slim";
import { getSlimRegion } from "@/data/regions-slim";
import type { SavedTripLite } from "@/lib/saved-trips";
import {
  MONTH_NAMES_LONG,
  climateForMonth,
  wrapMonth,
} from "@/lib/season";
import { isFlexibleStart, resolveStartMonth } from "@/lib/trip-plan";

/**
 * Season → brand hex used for the card's gradient header and the proportional
 * season timeline. Matches the palette called out in the /trips design.
 */
const SEASON_HEX: Record<Season, string> = {
  dry: "#f59e0b", // amber-500
  shoulder: "#10b981", // emerald-500
  wet: "#38bdf8", // sky-400
};

const NEUTRAL_GRADIENT = "linear-gradient(135deg, #94a3b8, #cbd5e1)";

/** Coarse relative-time label with no date library. */
function relativeTime(ts?: number): string {
  if (!ts) return "earlier";
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return "older";
}

interface StopSegment {
  duration: number;
  season: Season;
  region?: SlimRegion;
}

export function TripCard({ trip, active }: { trip: SavedTripLite; active: boolean }) {
  // A trip with a flexible start has no fixed departure; colour by the current
  // month so the card still reflects "right now" seasonally.
  const startMonth = resolveStartMonth(trip.start);

  // Walk the stops month-by-month, recording each leg's season so the timeline
  // can be coloured and the header gradient can be derived from the first legs.
  // Accumulated as a float and only rounded at lookup. Wrapping the running
  // total directly would leave it fractional after any sub-month stay, and
  // `region.months[9.47]` is undefined — so every stop after the first
  // week-long one would silently render as "shoulder".
  let cursor = startMonth;
  const segments: StopSegment[] = trip.stops.map(([id, duration]) => {
    const region = getSlimRegion(id);
    const season = region
      ? climateForMonth(region, wrapMonth(Math.round(cursor))).season
      : "shoulder";
    cursor += duration;
    return { duration, season, region };
  });

  const totalDuration = trip.stops.reduce((sum, [, d]) => sum + d, 0);

  // Header gradient: from the first 1-2 stops' seasons. Falls back to a neutral
  // slate gradient when there are no stops (or the first region is missing).
  const colors = segments.slice(0, 2).map((s) => SEASON_HEX[s.season]);
  const headerGradient =
    colors.length > 0
      ? `linear-gradient(135deg, ${colors[0]}, ${colors[colors.length - 1]})`
      : NEUTRAL_GRADIENT;

  // Meta line: unique countries of resolved stops, then start month + duration.
  const countries = Array.from(
    new Set(
      segments
        .map((s) => s.region?.country)
        .filter((c): c is string => Boolean(c))
    )
  );
  const startLabel = isFlexibleStart(trip.start)
    ? "Flexible"
    : MONTH_NAMES_LONG[trip.start - 1];
  const metaParts: string[] = [];
  if (countries.length) metaParts.push(countries.join(" · "));
  metaParts.push(startLabel);
  if (totalDuration > 0) {
    metaParts.push(
      `${totalDuration} ${totalDuration === 1 ? "month" : "months"}`
    );
  }

  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-md"
    >
      {/* Gradient thumbnail derived from the first stop(s)' season. */}
      <div className="relative h-24 w-full" style={{ background: headerGradient }}>
        <span className="absolute right-2 top-2 inline-flex items-center rounded-full bg-white/85 px-2 py-0.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
          {trip.stops.length} {trip.stops.length === 1 ? "stop" : "stops"}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-5">
        <div>
          <h3 className="font-semibold text-slate-900 group-hover:text-teal-700">
            {trip.name}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {metaParts.join(" · ") || "No stops yet"}
          </p>
        </div>

        {/* Mini season timeline: each stop sized by duration, coloured by season. */}
        <div className="flex h-[7px] w-full overflow-hidden rounded-full bg-slate-100">
          {segments.length > 0 &&
            segments.map((seg, i) => (
              <span
                key={i}
                style={{
                  flexGrow: seg.duration,
                  backgroundColor: SEASON_HEX[seg.season],
                }}
              />
            ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Last edited {relativeTime(trip.updatedAt)}
          </span>
          {active && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              Active
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
