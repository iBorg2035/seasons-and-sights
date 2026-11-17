import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { REGIONS } from "@/data/regions";
import { advisoryFor } from "@/data/advisories";
import { RegionCard } from "@/components/RegionCard";
import { SafetyNote } from "@/components/SafetyNote";
import { VisaByNationality } from "@/components/VisaByNationality";
import { countrySlug } from "@/lib/countries";
import { MONTH_NAMES, climateForMonth, monthOf } from "@/lib/season";
import { SITE_URL } from "@/lib/site";
import type { Region } from "@/types";

// Regenerate daily so each card's "now" season badge stays current.
export const revalidate = 86400;

function regionsBySlug(): Map<string, Region[]> {
  const map = new Map<string, Region[]>();
  for (const region of REGIONS) {
    const slug = countrySlug(region.country);
    map.set(slug, [...(map.get(slug) ?? []), region]);
  }
  return map;
}

export function generateStaticParams() {
  return [...regionsBySlug().keys()].map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const regions = regionsBySlug().get(slug);
  if (!regions) return { title: "Not found" };
  const country = regions[0].country;
  const names = regions.map((r) => r.name).join(", ");
  return {
    title: `${country} — when to go`,
    description: `Dry and wet seasons for ${regions.length} ${
      regions.length === 1 ? "destination" : "destinations"
    } in ${country}: ${names}.`,
    alternates: { canonical: `${SITE_URL}/countries/${slug}` },
  };
}

/**
 * How many of the country's destinations are in their dry season each month.
 * A country page can't have one season strip — Koh Samui and Phuket are wet
 * at opposite ends of the year — so it shows where the dry weather is instead.
 */
function dryCounts(regions: Region[]): number[] {
  return MONTH_NAMES.map(
    (_, i) =>
      regions.filter((r) => climateForMonth(r, i + 1).season === "dry").length
  );
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const regions = regionsBySlug().get(slug);
  if (!regions) notFound();

  const country = regions[0].country;
  const info = regions[0].info;
  const advisory = advisoryFor(country);
  const counts = dryCounts(regions);
  const now = monthOf();
  const total = regions.length;

  return (
    <div>
      <Link
        href="/"
        className="mb-3 inline-block text-sm font-medium text-stone-500 hover:text-stone-900"
      >
        ← All destinations
      </Link>

      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {country}
        </h1>
        <p className="mt-1 text-slate-600">
          {total} {total === 1 ? "destination" : "destinations"} ·{" "}
          {regions[0].continent}
        </p>
      </header>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Know before you go</h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {info && (
            <>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  🛂 Visa
                </dt>
                <dd className="text-sm text-slate-700">
                  <VisaByNationality country={country} fallback={info.visa} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  💱 Currency
                </dt>
                <dd className="text-sm text-slate-700">{info.currency}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  🗣️ Language
                </dt>
                <dd className="text-sm text-slate-700">{info.language}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  🔌 Plugs
                </dt>
                <dd className="text-sm text-slate-700">{info.plugs}</dd>
              </div>
            </>
          )}
        </dl>
        <div className="mt-4">
          <SafetyNote advisory={advisory} />
        </div>
      </section>

      {total > 1 && (
        <section className="mb-8">
          <h2 className="mb-1 font-semibold text-slate-900">
            Where it&apos;s dry, month by month
          </h2>
          <p className="mb-3 text-sm text-slate-500">
            How many of the {total} destinations are in their dry season.
          </p>
          <ol className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
            {counts.map((count, i) => (
              <li
                key={MONTH_NAMES[i]}
                aria-label={`${MONTH_NAMES[i]}: ${count} of ${total} dry`}
                aria-current={i + 1 === now ? "date" : undefined}
                className={`rounded-lg border px-1 py-2 text-center ${
                  i + 1 === now
                    ? "border-teal-500 ring-1 ring-teal-500"
                    : "border-slate-200"
                }`}
                style={{
                  backgroundColor: `rgba(245, 158, 11, ${(
                    (count / total) *
                    0.45
                  ).toFixed(2)})`,
                }}
              >
                <div className="text-xs font-medium text-slate-600">
                  {MONTH_NAMES[i]}
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {count}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section>
        <h2 className="mb-4 font-semibold text-slate-900">Destinations</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {regions.map((region) => (
            <RegionCard key={region.id} region={region} />
          ))}
        </div>
      </section>
    </div>
  );
}
