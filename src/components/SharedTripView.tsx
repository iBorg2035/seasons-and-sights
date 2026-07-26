"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchSharedTrip } from "@/lib/supabase/trips";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { climateForMonth } from "@/lib/season";
import { tripDateRanges } from "@/lib/trip-plan";
import { tripSlimLegs } from "@/lib/trip-plan-slim";
import { SeasonBadge } from "@/components/SeasonBadge";
import { DestinationImage } from "@/components/DestinationImage";
import { createTrip } from "@/lib/saved-trips";
import { setActiveTripId } from "@/lib/active-trip";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Exactly what fetchSharedTrip returns, so nothing is quietly dropped on the
 *  way to createTrip. */
type Loaded = NonNullable<Awaited<ReturnType<typeof fetchSharedTrip>>>;

export function SharedTripView({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<
    "loading" | "missing" | "error" | Loaded
  >("loading");
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState("missing");
      return;
    }
    fetchSharedTrip(token)
      .then((t) => setState(t ?? "missing"))
      // A rejected fetch (offline, Supabase down) is not the same as a bad
      // link — show a retryable error instead of a forever-loading skeleton.
      .catch(() => setState("error"));
  }, [token]);

  /** Import the shared trip as a new trip in this user's list and open it. */
  function importToMyTrips() {
    if (state === "loading" || state === "missing" || state === "error") return;
    // Carry everything the share holds — a booked trip should arrive booked,
    // with its dates and interests, not silently downgraded to a bare plan.
    const trip = createTrip(state.name, {
      start: state.start,
      stops: state.stops,
      interests: state.interests,
      mode: state.mode,
      bookedDates: state.bookedDates,
    });
    if (!trip) {
      setSaveError(true);
      return;
    }
    setSaveError(false);
    setActiveTripId(trip.id);
    router.push(`/trips/${trip.id}`);
  }

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
          href="/trips"
          className="mt-4 inline-block rounded-xl bg-sky-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-900"
        >
          Plan your own trip →
        </Link>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
        <p className="text-slate-600">
          Couldn&apos;t load this shared trip — check your connection and try
          again.
        </p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="mt-4 inline-block rounded-xl bg-sky-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-900"
        >
          Retry
        </button>
      </div>
    );
  }

  // tripSlimLegs/tripDateRanges both normalise the start month internally, so
  // a trip shared with a flexible start (`start: 0`) is handled for free.
  const legs = tripSlimLegs(state);
  const ranges = tripDateRanges(state, legs);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            Shared trip
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {state.name}
          </h1>
        </div>
        <button
          type="button"
          onClick={importToMyTrips}
          className="rounded-xl bg-sky-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-900"
        >
          Copy to my trips →
        </button>
      </div>
      {saveError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Couldn&apos;t copy this trip. Check that browser storage is enabled
          and try again.
        </p>
      )}

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
                      className="font-semibold text-slate-900 hover:text-teal-700"
                    >
                      {i + 1}. {leg.region.name}
                    </Link>
                    <SeasonBadge season={season} />
                  </div>
                  <p className="text-sm text-slate-500">
                    {leg.region.country} ·{" "}
                    {ranges[i]
                      ? `${fmtDate(ranges[i]!.start)} → ${fmtDate(new Date(ranges[i]!.end.getTime() - 86400000))}`
                      : "Dates TBD"}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-sm text-slate-500">
        Want your own?{" "}
        <Link href="/trips" className="font-medium text-teal-700 hover:underline">
          Build a season-optimized trip
        </Link>
        .
      </p>
    </div>
  );
}
