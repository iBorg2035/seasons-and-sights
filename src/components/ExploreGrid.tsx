"use client";

import { useMemo, useState } from "react";
import type { Continent, Season } from "@/types";
import { REGIONS } from "@/data/regions";
import { RegionCard } from "@/components/RegionCard";
import { WorldMap } from "@/components/WorldMap";
import {
  monthOf,
  seasonFitScore,
  SEASON_META,
  MONTH_NAMES_LONG,
} from "@/lib/season";

type Filter = "all" | Continent;
type View = "grid" | "map";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Southeast Asia", label: "SE Asia" },
  { value: "South Asia", label: "South Asia" },
  { value: "East Asia", label: "East Asia" },
  { value: "South America", label: "South America" },
  { value: "North America", label: "N. America" },
  { value: "Europe", label: "Europe" },
  { value: "Africa", label: "Africa" },
];

const LEGEND: Season[] = ["dry", "shoulder", "wet"];

export function ExploreGrid() {
  const [filter, setFilter] = useState<Filter>("all");
  const [goodNow, setGoodNow] = useState(false);
  const [view, setView] = useState<View>("grid");
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

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-slate-400">
            {regions.length} destination{regions.length === 1 ? "" : "s"}
          </span>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            {(["grid", "map"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  view === v
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {v === "grid" ? "List" : "Map"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {regions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Nothing in a good season right now for this filter. Try the{" "}
          <span className="font-medium">When to go</span> planner.
        </p>
      ) : view === "map" ? (
        <div>
          <div className="h-[520px] w-full overflow-hidden rounded-2xl border border-slate-200">
            <WorldMap regions={regions} month={currentMonth} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {LEGEND.map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${SEASON_META[s].dot}`} />
                {SEASON_META[s].label}
              </span>
            ))}
            <span className="text-slate-400">
              pins colored by {MONTH_NAMES_LONG[currentMonth - 1]}&apos;s season ·
              click a pin to open it
            </span>
          </div>
        </div>
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
