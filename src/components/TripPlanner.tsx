"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Continent } from "@/types";
import { REGIONS } from "@/data/regions";
import { SeasonStrip } from "@/components/SeasonStrip";
import { buildBookingUrl } from "@/lib/booking";
import {
  MONTH_NAMES,
  MONTH_NAMES_LONG,
  SEASON_META,
  datesForMonth,
  fitQuality,
  planItinerary,
} from "@/lib/season";

const CONTINENT_ORDER: Continent[] = [
  "Southeast Asia",
  "South America",
  "Europe",
];

const EXAMPLE_IDS = [
  "brazil-rio",
  "thailand-bangkok",
  "philippines-palawan",
  "vietnam-hoian",
];

function fmtMonths(months: number[]): string {
  if (months.length === 1) return MONTH_NAMES[months[0] - 1];
  return `${MONTH_NAMES[months[0] - 1]}–${MONTH_NAMES[months[months.length - 1] - 1]}`;
}

export function TripPlanner({ initialMonth }: { initialMonth: number }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [startMonth, setStartMonth] = useState(initialMonth);
  const [monthsPerStop, setMonthsPerStop] = useState(2);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const legs = useMemo(() => {
    const chosen = REGIONS.filter((r) => selected.has(r.id));
    return planItinerary(chosen, startMonth, monthsPerStop);
  }, [selected, startMonth, monthsPerStop]);

  const tripSpan = useMemo(() => {
    if (legs.length === 0) return null;
    const first = legs[0].months[0];
    const lastLeg = legs[legs.length - 1];
    const last = lastLeg.months[lastLeg.months.length - 1];
    const totalMonths = legs.length * monthsPerStop;
    return {
      label: `${MONTH_NAMES[first - 1]} → ${MONTH_NAMES[last - 1]}`,
      totalMonths,
    };
  }, [legs, monthsPerStop]);

  const hasRisky = legs.some((l) => l.fit < 50);

  return (
    <div className="space-y-8">
      {/* ── Controls ── */}
      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">1. Pick destinations</h2>
            <button
              onClick={() => setSelected(new Set(EXAMPLE_IDS))}
              className="text-xs font-medium text-amber-600 hover:underline"
            >
              Try an example
            </button>
          </div>
          <div className="space-y-3">
            {CONTINENT_ORDER.map((continent) => (
              <div key={continent}>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {continent}
                </p>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.filter((r) => r.continent === continent).map((r) => {
                    const on = selected.has(r.id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => toggle(r.id)}
                        className={`rounded-full border px-3 py-1 text-sm transition ${
                          on
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {r.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-2 font-semibold text-slate-900">2. Start month</h2>
            <div className="grid grid-cols-6 gap-1.5">
              {MONTH_NAMES.map((label, i) => {
                const value = i + 1;
                const active = value === startMonth;
                return (
                  <button
                    key={label}
                    onClick={() => setStartMonth(value)}
                    className={`rounded-lg py-1.5 text-sm font-medium transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-2 font-semibold text-slate-900">3. Time per stop</h2>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
              {[1, 2].map((m) => (
                <button
                  key={m}
                  onClick={() => setMonthsPerStop(m)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                    monthsPerStop === m
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {m} month{m > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      {legs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Pick a few destinations above and your season-optimized route appears
          here.
        </p>
      ) : (
        <div>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Your route, in season order
            </h2>
            {tripSpan && (
              <p className="text-sm text-slate-500">
                {tripSpan.label} · {tripSpan.totalMonths} month
                {tripSpan.totalMonths > 1 ? "s" : ""}
              </p>
            )}
          </div>

          {hasRisky && (
            <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
              Some stops land in wet season — there&apos;s no dry/shoulder slot
              for them in this sequence. Try a different start month, fewer
              stops, or drop the flagged ones.
            </p>
          )}

          <ol className="space-y-4">
            {legs.map((leg) => {
              const quality = fitQuality(leg.fit);
              const meta = SEASON_META[quality.season];
              const { checkin, checkout } = datesForMonth(leg.months[0]);
              const bookingUrl = buildBookingUrl({
                dest: leg.region.bookingDest,
                checkin,
                checkout,
                lat: leg.region.lat,
                lng: leg.region.lng,
              });
              return (
                <li
                  key={leg.region.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {leg.position + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <div>
                          <Link
                            href={`/regions/${leg.region.id}`}
                            className="font-semibold text-slate-900 hover:text-amber-600"
                          >
                            {leg.region.name}
                          </Link>
                          <span className="text-sm text-slate-500">
                            {" "}
                            · {leg.region.country}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {fmtMonths(leg.months)}
                        </span>
                      </div>

                      <span
                        className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.chip}`}
                      >
                        <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                        {quality.label}
                      </span>

                      <div className="mt-3">
                        <SeasonStrip
                          region={leg.region}
                          highlightMonths={leg.months}
                          showLegend={false}
                        />
                      </div>

                      <a
                        href={bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block text-sm font-medium text-[#003580] hover:underline"
                      >
                        Search {MONTH_NAMES_LONG[leg.months[0] - 1]} stays on
                        Booking.com ↗
                      </a>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
