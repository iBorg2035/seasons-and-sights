"use client";

import { useState } from "react";
import Link from "next/link";
import { REGIONS, getRegion } from "@/data/regions";
import { CONTINENT_ORDER } from "@/lib/continents";
import { SeasonStrip } from "@/components/SeasonStrip";
import { SeasonBadge } from "@/components/SeasonBadge";
import {
  CROWD_META,
  MONTH_NAMES,
  MONTH_NAMES_LONG,
  bestMonths,
  climateForMonth,
  crowdForMonth,
  formatUsd,
} from "@/lib/season";

const MAX = 3;

export function CompareView({ initialMonth }: { initialMonth: number }) {
  const [ids, setIds] = useState<string[]>([]);
  const [month, setMonth] = useState(initialMonth);

  const toggle = (id: string) =>
    setIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < MAX
          ? [...prev, id]
          : prev
    );

  const selected = ids.map((id) => getRegion(id)!).filter(Boolean);
  const monthName = MONTH_NAMES_LONG[month - 1];

  return (
    <div className="space-y-8">
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">
              Pick up to {MAX} destinations
            </h2>
            <span className="text-sm text-slate-400">
              {ids.length}/{MAX} selected
            </span>
          </div>
          <div className="space-y-3">
            {CONTINENT_ORDER.map((continent) => (
              <div key={continent}>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {continent}
                </p>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.filter((r) => r.continent === continent).map((r) => {
                    const on = ids.includes(r.id);
                    const full = ids.length >= MAX && !on;
                    return (
                      <button
                        key={r.id}
                        onClick={() => toggle(r.id)}
                        disabled={full}
                        className={`rounded-full border px-3 py-1 text-sm transition ${
                          on
                            ? "border-slate-900 bg-slate-900 text-white"
                            : full
                              ? "cursor-not-allowed border-slate-100 bg-white text-slate-300"
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

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            Compare for which month?
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
      </div>

      {selected.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Pick two or three destinations to compare them side by side.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {selected.map((r) => {
            const { season } = climateForMonth(r, month);
            const crowd = CROWD_META[crowdForMonth(r, month)];
            return (
              <div
                key={r.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div>
                  <Link
                    href={`/regions/${r.id}`}
                    className="font-semibold text-slate-900 hover:text-amber-600"
                  >
                    {r.name}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {r.country} · {r.continent}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <SeasonBadge season={season} suffix={`in ${MONTH_NAMES[month - 1]}`} />
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${crowd.chip}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${crowd.dot}`} />
                    {crowd.label}
                  </span>
                </div>

                <SeasonStrip
                  region={r}
                  highlightMonths={[month]}
                  showLegend={false}
                />

                <dl className="mt-1 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Best time</dt>
                    <dd className="font-medium text-slate-800">
                      {bestMonths(r)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Budget</dt>
                    <dd className="font-medium text-slate-800">
                      {r.dailyBudget ? `${formatUsd(r.dailyBudget)}/day` : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Sights</dt>
                    <dd className="font-medium text-slate-800">
                      {r.sights.length}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      )}

      {selected.length > 0 && (
        <p className="text-sm text-slate-400">
          Comparing for {monthName}. Pick a different month above to see how the
          seasons shift.
        </p>
      )}
    </div>
  );
}
