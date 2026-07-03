import Link from "next/link";
import type { Region } from "@/types";
import { SeasonBadge } from "@/components/SeasonBadge";
import { SeasonStrip } from "@/components/SeasonStrip";
import { DestinationImage } from "@/components/DestinationImage";
import { AddToTripButton } from "@/components/AddToTripButton";
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
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      {/* Stretched-link overlay: makes the whole card the navigation target so
          the Add-to-trip button can be a real sibling button (interactive
          content nested inside an <a> is invalid HTML) while staying clickable
          via z-index. The overlay sits above the static content (z-10) and the
          add button above the overlay (z-20). */}
      <span className="absolute inset-0 z-10" aria-hidden="true" />
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
        <AddToTripButton
          regionId={region.id}
          className="absolute left-2 top-2 z-20 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
        />
      </div>

      <div className="relative flex flex-col gap-3 p-5">
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
