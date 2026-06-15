import Link from "next/link";
import type { Region } from "@/types";
import { SeasonBadge } from "@/components/SeasonBadge";
import { SeasonStrip } from "@/components/SeasonStrip";
import { bestMonths, climateForMonth, monthOf } from "@/lib/season";

export function RegionCard({
  region,
  month,
}: {
  region: Region;
  /** 1-based month the badge/strip should reflect. Defaults to current month. */
  month?: number;
}) {
  const activeMonth = month ?? monthOf();
  const isNow = activeMonth === monthOf();
  const { season } = climateForMonth(region, activeMonth);

  return (
    <Link
      href={`/regions/${region.id}`}
      className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 group-hover:text-amber-600">
            {region.name}
          </h3>
          <p className="text-sm text-slate-500">
            {region.country} · {region.continent}
          </p>
        </div>
        <SeasonBadge season={season} suffix={isNow ? "now" : undefined} />
      </div>

      <SeasonStrip
        region={region}
        highlightMonth={activeMonth}
        showLegend={false}
      />

      <p className="mt-1 text-xs text-slate-500">
        <span className="font-medium text-slate-700">Best time:</span>{" "}
        {bestMonths(region)}
      </p>
    </Link>
  );
}
