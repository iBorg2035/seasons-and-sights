import Link from "next/link";
import type { Region } from "@/types";
import { SeasonBadge } from "@/components/SeasonBadge";
import { SeasonStrip } from "@/components/SeasonStrip";
import { DestinationImage } from "@/components/DestinationImage";
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
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div className="relative">
        <DestinationImage
          src={region.photo}
          alt={`${region.name}, ${region.country}`}
          className="h-36 w-full"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute right-2 top-2">
          <SeasonBadge season={season} suffix={isNow ? "now" : undefined} />
        </div>
      </div>

      <div className="flex flex-col gap-3 p-5">
        <div>
          <h3 className="font-semibold text-slate-900 group-hover:text-amber-600">
            {region.name}
          </h3>
          <p className="text-sm text-slate-500">
            {region.country} · {region.continent}
          </p>
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
      </div>
    </Link>
  );
}
