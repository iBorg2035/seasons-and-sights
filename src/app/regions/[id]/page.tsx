import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { REGIONS, getRegion } from "@/data/regions";
import { SeasonBadge } from "@/components/SeasonBadge";
import { WeatherNow } from "@/components/WeatherNow";
import { SightsList } from "@/components/SightsList";
import { RegionMap } from "@/components/RegionMap";
import { RegionPlanner } from "@/components/RegionPlanner";
import { getCurrentSeason, monthOf } from "@/lib/season";

export function generateStaticParams() {
  return REGIONS.map((r) => ({ id: r.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const region = getRegion(id);
  if (!region) return { title: "Not found" };
  return {
    title: `${region.name}, ${region.country} — Seasons & Sights`,
    description: region.climateBlurb,
  };
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const region = getRegion(id);
  if (!region) notFound();

  const current = getCurrentSeason(region);

  return (
    <div>
      <Link
        href="/"
        className="text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        ← All destinations
      </Link>

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {region.name}
          </h1>
          <p className="text-slate-500">
            {region.country} · {region.continent}
          </p>
        </div>
        <SeasonBadge season={current.season} suffix="now" className="mt-1" />
      </header>

      <p className="mb-6 mt-4 max-w-3xl text-slate-600">{region.climateBlurb}</p>

      <RegionPlanner
        region={region}
        initialMonth={monthOf()}
        weatherSlot={<WeatherNow lat={region.lat} lng={region.lng} />}
        mapSlot={<RegionMap region={region} />}
        sightsSlot={<SightsList sights={region.sights} />}
      />
    </div>
  );
}
