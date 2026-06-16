import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { REGIONS, getRegion } from "@/data/regions";
import { SeasonBadge } from "@/components/SeasonBadge";
import { DestinationImage } from "@/components/DestinationImage";
import { WeatherNow } from "@/components/WeatherNow";
import { SightsList } from "@/components/SightsList";
import { RegionMap } from "@/components/RegionMap";
import { RegionPlanner } from "@/components/RegionPlanner";
import { TravelEssentials } from "@/components/TravelEssentials";
import { TravelToolkit } from "@/components/TravelToolkit";
import { AddToTripButton } from "@/components/AddToTripButton";
import { getCurrentSeason, monthOf } from "@/lib/season";

// Regenerate each page in the background ~daily so the "current season"
// badge and "now" marker stay accurate as the calendar month rolls over.
export const revalidate = 86400;

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
  const title = `${region.name}, ${region.country}`;
  return {
    title,
    description: region.climateBlurb,
    openGraph: {
      title: `${title} — when to go`,
      description: region.climateBlurb,
      type: "article",
    },
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
        className="mb-3 inline-block text-sm font-medium text-stone-500 hover:text-stone-900"
      >
        ← All destinations
      </Link>

      <header className="relative mb-6 overflow-hidden rounded-3xl">
        <DestinationImage
          src={region.photo}
          alt={`${region.name}, ${region.country}`}
          className="h-56 w-full sm:h-72"
          sizes="(max-width: 1024px) 100vw, 1024px"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white drop-shadow sm:text-4xl">
              {region.name}
            </h1>
            <p className="text-white/85">
              {region.country} · {region.continent}
            </p>
          </div>
          <SeasonBadge season={current.season} suffix="now" />
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <p className="max-w-3xl text-stone-600">{region.climateBlurb}</p>
      </div>
      <div className="mb-6">
        <AddToTripButton
          regionId={region.id}
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
        />
      </div>

      <RegionPlanner
        region={region}
        initialMonth={monthOf()}
        weatherSlot={<WeatherNow lat={region.lat} lng={region.lng} />}
        mapSlot={<RegionMap region={region} />}
        sightsSlot={<SightsList sights={region.sights} />}
      />

      {region.info && (
        <TravelEssentials info={region.info} country={region.country} />
      )}
      {region.toolkit && (
        <TravelToolkit toolkit={region.toolkit} currency={region.info?.currency} />
      )}
    </div>
  );
}
