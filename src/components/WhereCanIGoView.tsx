"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { REGIONS_SLIM } from "@/data/regions-slim";
import { CONTINENT_ORDER, CONTINENT_LABEL } from "@/lib/continents";
import { SeasonBadge } from "@/components/SeasonBadge";
import { AddToTripButton } from "@/components/AddToTripButton";
import {
  MONTH_NAMES,
  MONTH_NAMES_LONG,
  seasonFitScore,
  climateForMonth,
  bestMonths,
  formatUsd,
} from "@/lib/season";
import type { Continent } from "@/types";

export function WhereCanIGoView({
  initialMonth,
}: {
  initialMonth: number;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [maxBudget, setMaxBudget] = useState<number | "">(100);
  const [continent, setContinent] = useState<"any" | Continent>("any");

  const results = useMemo(() => {
    const budget = typeof maxBudget === "number" ? maxBudget : Infinity;
    return REGIONS_SLIM
      .filter(
        (r) =>
          (r.dailyBudget ?? 0) <= budget &&
          (continent === "any" || r.continent === continent)
      )
      .map((r) => ({
        region: r,
        fit: seasonFitScore(r, month),
        season: climateForMonth(r, month).season,
      }))
      .sort((a, b) => b.fit - a.fit);
  }, [month, maxBudget, continent]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            When are you free?
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            {MONTH_NAMES_LONG.map((name, i) => (
              <option key={i} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Max budget ($/day)
          </label>
          <input
            type="number"
            min={10}
            step={10}
            value={maxBudget}
            onChange={(e) => {
              const v = e.target.value;
              setMaxBudget(v === "" ? "" : Number(v));
            }}
            placeholder="any"
            className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Region
          </label>
          <select
            value={continent}
            onChange={(e) =>
              setContinent(e.target.value as "any" | Continent)
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          >
            <option value="any">Anywhere</option>
            {CONTINENT_ORDER.map((c) => (
              <option key={c} value={c}>
                {CONTINENT_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        {results.length} destination{results.length !== 1 ? "s" : ""} in{" "}
        {MONTH_NAMES_LONG[month - 1]}
        {typeof maxBudget === "number" ? ` under ${formatUsd(maxBudget)}/day` : ""}
        , ranked by season fit.
      </p>

      {/* Results */}
      <ol className="space-y-2">
        {results.map(({ region, fit, season }) => (
          <li
            key={region.id}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
              fit >= 80
                ? "border-amber-200 bg-amber-50/60"
                : fit >= 50
                  ? "border-emerald-200 bg-emerald-50/50"
                  : "border-slate-200 bg-white"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/regions/${region.id}`}
                  className="font-semibold text-slate-900 hover:text-amber-600"
                >
                  {region.name}
                </Link>
                <SeasonBadge season={season} />
              </div>
              <p className="text-sm text-slate-500">
                {region.country} · {MONTH_NAMES[month - 1]}: {Math.round(fit)}%
                fit · best {bestMonths(region)}
                {region.dailyBudget ? ` · ~${formatUsd(region.dailyBudget)}/day` : ""}
              </p>
            </div>
            <AddToTripButton
              regionId={region.id}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-amber-400 hover:text-amber-700"
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
