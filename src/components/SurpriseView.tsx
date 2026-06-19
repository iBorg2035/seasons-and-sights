"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Continent, Region } from "@/types";
import { REGIONS } from "@/data/regions";
import { CONTINENT_ORDER } from "@/lib/continents";
import { SeasonBadge } from "@/components/SeasonBadge";
import { buildFlightsUrl } from "@/lib/booking";
import {
  MONTH_NAMES,
  MONTH_NAMES_LONG,
  bestMonths,
  climateForMonth,
  seasonFitScore,
} from "@/lib/season";

const CONTINENTS: (Continent | "any")[] = ["any", ...CONTINENT_ORDER];

export function SurpriseView({ initialMonth }: { initialMonth: number }) {
  const [month, setMonth] = useState(initialMonth);
  const [continent, setContinent] = useState<Continent | "any">("any");
  const [pick, setPick] = useState<Region | null>(null);
  const [rollCount, setRollCount] = useState(0);

  // Destinations in dry/shoulder season this month, best first.
  const candidates = useMemo(() => {
    return REGIONS.filter(
      (r) => continent === "any" || r.continent === continent
    )
      .filter((r) => seasonFitScore(r, month) >= 60)
      .sort((a, b) => seasonFitScore(b, month) - seasonFitScore(a, month));
  }, [month, continent]);

  // Re-roll whenever the filters change or the user shuffles.
  useEffect(() => {
    const dry = candidates.filter(
      (r) => climateForMonth(r, month).season === "dry"
    );
    const pool = dry.length ? dry : candidates;
    setPick(pool.length ? pool[Math.floor(Math.random() * pool.length)] : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, rollCount]);

  const others = candidates.filter((r) => r.id !== pick?.id).slice(0, 6);
  const monthName = MONTH_NAMES_LONG[month - 1];

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            When are you free?
          </p>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {MONTH_NAMES.map((label, i) => {
              const value = i + 1;
              return (
                <button
                  key={label}
                  onClick={() => setMonth(value)}
                  className={`rounded-lg py-1.5 text-sm font-medium transition ${
                    value === month
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

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Region:</span>
          {CONTINENTS.map((c) => (
            <button
              key={c}
              onClick={() => setContinent(c)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                continent === c
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {c === "any" ? "Anywhere" : c}
            </button>
          ))}
        </div>

        <button
          onClick={() => setRollCount((n) => n + 1)}
          className="w-full rounded-xl bg-amber-500 px-4 py-2.5 font-semibold text-white transition hover:bg-amber-600"
        >
          🎲 Surprise me
        </button>
      </div>

      {pick ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-amber-600">
            In {monthName}, go to…
          </p>
          <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{pick.name}</h2>
              <p className="text-slate-500">
                {pick.country} · {pick.continent}
              </p>
            </div>
            <SeasonBadge
              season={climateForMonth(pick, month).season}
              suffix={`in ${MONTH_NAMES[month - 1]}`}
            />
          </div>
          <p className="mt-3 text-slate-600">{pick.climateBlurb}</p>
          <p className="mt-2 text-sm text-slate-500">
            <span className="font-medium text-slate-700">Best time:</span>{" "}
            {bestMonths(pick)} · {pick.sights.length} sights
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
            <Link
              href={`/regions/${pick.id}`}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-white transition hover:bg-slate-700"
            >
              View destination →
            </Link>
            <a
              href={buildFlightsUrl(pick.bookingDest)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 transition hover:bg-slate-100"
            >
              Find flights ↗
            </a>
            <button
              onClick={() => setRollCount((n) => n + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 transition hover:bg-slate-100"
            >
              Shuffle again
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Nothing's in a great season {continent === "any" ? "" : `in ${continent} `}
          in {monthName}. Try another month or region.
        </p>
      )}

      {others.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold text-slate-900">
            Other great picks in {monthName}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((r) => (
              <Link
                key={r.id}
                href={`/regions/${r.id}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <span>
                  <span className="font-medium text-slate-900">{r.name}</span>
                  <span className="block text-xs text-slate-500">
                    {r.country}
                  </span>
                </span>
                <SeasonBadge season={climateForMonth(r, month).season} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
