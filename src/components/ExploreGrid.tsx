"use client";

import { useMemo, useState } from "react";
import type { Continent, Season, SightType } from "@/types";
import { REGIONS_SLIM } from "@/data/regions-slim";
import { CONTINENT_ORDER, CONTINENT_LABEL } from "@/lib/continents";
import { RegionCard } from "@/components/RegionCard";
import { WorldMap } from "@/components/WorldMap";
import {
  monthOf,
  seasonFitScore,
  SEASON_META,
  MONTH_NAMES_LONG,
} from "@/lib/season";

type Filter = "all" | Continent;
type StyleFilter = "all" | SightType;
type View = "grid" | "map";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  ...CONTINENT_ORDER.map((c) => ({ value: c, label: CONTINENT_LABEL[c] })),
];

const STYLES: { value: StyleFilter; label: string }[] = [
  { value: "all", label: "Any style" },
  { value: "beach", label: "🏖️ Beaches" },
  { value: "nature", label: "🏔️ Outdoors" },
  { value: "wildlife", label: "🦜 Wildlife" },
  { value: "culture", label: "🏛️ Culture" },
  { value: "city", label: "🏙️ Cities" },
];

const LEGEND: Season[] = ["dry", "shoulder", "wet"];

export function ExploreGrid() {
  const [filter, setFilter] = useState<Filter>("all");
  const [style, setStyle] = useState<StyleFilter>("all");
  const [query, setQuery] = useState("");
  const [goodNow, setGoodNow] = useState(false);
  const [view, setView] = useState<View>("grid");
  const currentMonth = monthOf();

  const regions = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = REGIONS_SLIM.filter(
      (r) => filter === "all" || r.continent === filter
    )
      .filter((r) => style === "all" || r.sightTypes.includes(style))
      .filter(
        (r) =>
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.country.toLowerCase().includes(q)
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
  }, [filter, style, query, goodNow, currentMonth]);

  return (
    <div>
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search destinations or countries…"
          aria-label="Search destinations"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400"
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {STYLES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStyle(s.value)}
            aria-pressed={style === s.value}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              style === s.value
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
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
          aria-pressed={goodNow}
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
                aria-pressed={view === v}
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
          No destinations match. Try clearing the search or filters.
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
