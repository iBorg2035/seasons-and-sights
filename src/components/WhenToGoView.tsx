"use client";

import { useMemo, useState } from "react";
import type { Season } from "@/types";
import { REGIONS_SLIM } from "@/data/regions-slim";
import { RegionCard } from "@/components/RegionCard";
import {
  MONTH_NAMES,
  MONTH_NAMES_LONG,
  SEASON_META,
  climateForMonth,
  monthOf,
} from "@/lib/season";

const ORDER: Season[] = ["dry", "shoulder", "wet"];

const SECTION_BLURB: Record<Season, string> = {
  dry: "Prime time — dry, clear, and reliable.",
  shoulder: "Transitional — variable but often rewarding (and quieter).",
  wet: "Wet season — expect rain; go in only if you know why.",
};

export function WhenToGoView() {
  const [month, setMonth] = useState(monthOf());

  const groups = useMemo(() => {
    const out: Record<Season, typeof REGIONS_SLIM> = {
      dry: [],
      shoulder: [],
      wet: [],
    };
    for (const region of REGIONS_SLIM) {
      out[climateForMonth(region, month).season].push(region);
    }
    return out;
  }, [month]);

  return (
    <div>
      <div className="mb-8 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
        {MONTH_NAMES.map((label, i) => {
          const value = i + 1;
          const active = value === month;
          return (
            <button
              key={label}
              onClick={() => setMonth(value)}
              className={`rounded-lg py-2 text-sm font-medium transition ${
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

      <div className="space-y-10">
        {ORDER.map((season) => {
          const regions = groups[season];
          if (regions.length === 0) return null;
          const meta = SEASON_META[season];
          return (
            <section key={season}>
              <div className="mb-3 flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${meta.dot}`} />
                <h2 className="font-semibold text-slate-900">
                  {meta.label} in {MONTH_NAMES_LONG[month - 1]}
                </h2>
                <span className="text-sm text-slate-400">
                  ({regions.length})
                </span>
              </div>
              <p className="mb-4 text-sm text-slate-500">
                {SECTION_BLURB[season]}
              </p>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {regions.map((region) => (
                  <RegionCard key={region.id} region={region} month={month} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
