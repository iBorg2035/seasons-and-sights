"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchSharedTrip } from "@/lib/supabase/trips";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { getRegion } from "@/data/regions";
import { planItinerary, legDateRanges, climateForMonth } from "@/lib/season";
import { SeasonBadge } from "@/components/SeasonBadge";
import { DestinationImage } from "@/components/DestinationImage";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Loaded = { name: string; start: number; stops: [string, number][] };

export function SharedTripView({ token }: { token: string }) {
  const [state, setState] = useState<"loading" | "missing" | Loaded>("loading");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState("missing");
      return;
    }
    fetchSharedTrip(token).then((t) => setState(t ?? "missing"));
  }, [token]);

  if (state === "loading") {
    return <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />;
  }

  if (state === "missing") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
        <p className="text-slate-600">
          This shared trip couldn&apos;t be found — the link may be invalid or
          removed.
        </p>
        <Link
          href="/planner"
          className="mt-4 inline-block rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Plan your own trip →
        </Link>
      </div>
    );
  }

  const chosen = state.stops
    .map(([id, durationMonths]) => {
      const region = getRegion(id);
      return region ? { region, durationMonths } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const legs = planItinerary(chosen, state.start);
  const ranges = legDateRanges(state.start, legs);

  const importHref = `/planner?start=${state.start}&stops=${state.stops
    .map(([id, d]) => `${id}:${d}`)
    .join(",")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            Shared trip
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {state.name}
          </h1>
        </div>
        <Link
          href={importHref}
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Open in planner →
        </Link>
      </div>

      <ol className="space-y-3">
        {legs.map((leg, i) => {
          const season = climateForMonth(leg.region, leg.months[0]).season;
          return (
            <li
              key={leg.region.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-28 flex-none">
                  <DestinationImage
                    src={leg.region.photo}
                    alt={leg.region.name}
                    className="h-20 w-28"
                    sizes="112px"
                  />
                </div>
                <div className="min-w-0 flex-1 py-2 pr-4">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/regions/${leg.region.id}`}
                      className="font-semibold text-slate-900 hover:text-amber-600"
                    >
                      {i + 1}. {leg.region.name}
                    </Link>
                    <SeasonBadge season={season} />
                  </div>
                  <p className="text-sm text-slate-500">
                    {leg.region.country} ·{" "}
                    {fmtDate(ranges[i].start)} →{" "}
                    {fmtDate(new Date(ranges[i].end.getTime() - 86400000))}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-sm text-slate-500">
        Want your own? Build a season-optimized trip on the{" "}
        <Link href="/planner" className="font-medium text-amber-600 hover:underline">
          planner
        </Link>
        .
      </p>
    </div>
  );
}
