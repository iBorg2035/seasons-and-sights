"use client";

import { useMemo, useState } from "react";
import type { Continent } from "@/types";
import { REGIONS } from "@/data/regions";
import { RegionCard } from "@/components/RegionCard";
import { monthOf, seasonFitScore, MONTH_NAMES_LONG } from "@/lib/season";

type Filter = "all" | Continent;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Southeast Asia", label: "SE Asia" },
  { value: "South America", label: "South America" },
  { value: "Europe", label: "Europe" },
];

export function ExploreGrid() {
  const [filter, setFilter] = useState<Filter>("all");
  const [goodNow, setGoodNow] = useState(false);
  const currentMonth = monthOf();

  const regions = useMemo(() => {
    let list = REGIONS.filter(
      (r) => filter === "all" || r.continent === filter
    );
    if (goodNow) {
      list = list
        .filter((r) => seasonFitScore(r, currentMonth) >= 60)
        .sort(
          (a, b) =>
            seasonFitScore(b, currentMonth) - seasonFitScore(a, currentMonth)
        );
    }
    return list;
  }, [filter, goodNow, currentMonth]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === f.value
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setGoodNow((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
            goodNow
              ? "border-amber-300 bg-amber-100 text-amber-800"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${goodNow ? "bg-amber-500" : "bg-slate-300"}`} />
          Good to visit now ({MONTH_NAMES_LONG[currentMonth - 1]})
        </button>

        <span className="ml-auto text-sm text-slate-400">
          {regions.length} destination{regions.length === 1 ? "" : "s"}
        </span>
      </div>

      {regions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Nothing in a good season right now for this filter. Try the{" "}
          <span className="font-medium">When to go</span> planner.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {regions.map((region) => (
            <RegionCard key={region.id} region={region} />
          ))}
        </div>
      )}
    </div>
  );
}
