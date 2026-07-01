"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDraft, DRAFT_EVENT, type TripDraft } from "@/lib/trip-draft";
import {
  getSavedTrips,
  loadSavedTripToDraft,
  SAVED_TRIPS_EVENT,
  type SavedTripLite,
} from "@/lib/saved-trips";
import { getSlimRegion } from "@/data/regions-slim";
import { eventsInMonthForRegions } from "@/data/events-slim";
import {
  planItinerary,
  legDateRanges,
  climateForMonth,
  MONTH_NAMES_LONG,
} from "@/lib/season";
import { SeasonBadge } from "@/components/SeasonBadge";
import { WeatherNow } from "@/components/WeatherNow";
import { DestinationImage } from "@/components/DestinationImage";
import { PreDepartureChecklist } from "@/components/PreDepartureChecklist";

function SavedTripsPanel() {
  const [trips, setTrips] = useState<SavedTripLite[]>([]);
  useEffect(() => {
    const sync = () => setTrips(getSavedTrips());
    sync();
    window.addEventListener(SAVED_TRIPS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SAVED_TRIPS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (trips.length === 0) return null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-semibold text-slate-900">Your saved trips</h3>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {trips.map((t) => (
          <li key={t.id}>
            <button
              onClick={() => loadSavedTripToDraft(t)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-amber-300 hover:bg-amber-50"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-900">
                  {t.name}
                </span>
                <span className="text-xs text-slate-500">
                  {t.stops.length}{" "}
                  {t.stops.length === 1 ? "destination" : "destinations"}
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-amber-600">
                Load →
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysFromToday(d: Date): number {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - t.getTime()) / 86400000);
}

export function TodayView({ initialMonth }: { initialMonth: number }) {
  const [draft, setDraft] = useState<TripDraft>({ start: 0, stops: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setDraft(getDraft());
    sync();
    setReady(true);
    window.addEventListener(DRAFT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(DRAFT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />;
  }

  const chosen = draft.stops
    .map((s) => {
      const region = getSlimRegion(s.id);
      return region ? { region, durationMonths: s.duration } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  if (chosen.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <p className="text-slate-600">You don&apos;t have an active trip.</p>
          <Link
            href="/planner"
            className="mt-4 inline-block rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            Plan a trip →
          </Link>
        </div>
        {/* Loading a saved trip seeds the draft, so this view fills in. */}
        <SavedTripsPanel />
      </div>
    );
  }

  const start = draft.start || initialMonth;
  const legs = planItinerary(chosen, start);
  const ranges = legDateRanges(start, legs);
  const today = new Date();

  let focusIdx = ranges.findIndex((r) => today >= r.start && today < r.end);
  let status: "before" | "during" | "after";
  if (focusIdx >= 0) status = "during";
  else if (today < ranges[0].start) {
    status = "before";
    focusIdx = 0;
  } else {
    status = "after";
    focusIdx = legs.length - 1;
  }

  const focus = legs[focusIdx];
  const focusRange = ranges[focusIdx];
  const next = focusIdx + 1 < legs.length ? legs[focusIdx + 1] : null;
  const nextStart = next ? ranges[focusIdx + 1].start : null;
  const season = climateForMonth(focus.region, focus.months[0]).season;

  const headline =
    status === "before"
      ? `Your trip starts in ${daysFromToday(ranges[0].start)} days`
      : status === "after"
        ? "Your trip is complete — plan the next one"
        : `You're in ${focus.region.name}`;

  // Festivals happening this calendar month at any of the trip's destinations.
  const nowMonth = today.getMonth() + 1;
  const festivalsThisMonth = eventsInMonthForRegions(
    legs.map((l) => l.region.id),
    nowMonth
  );

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="relative h-44 w-full">
          <DestinationImage
            src={focus.region.photo}
            alt={focus.region.name}
            className="h-44 w-full"
            sizes="(max-width: 1024px) 100vw, 1024px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
              {status === "before"
                ? "Next up"
                : status === "after"
                  ? "Last stop"
                  : "Right now"}
            </p>
            <h2 className="text-2xl font-semibold text-white drop-shadow">
              {headline}
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <Link
              href={`/regions/${focus.region.id}`}
              className="font-semibold text-slate-900 hover:text-amber-600"
            >
              {focus.region.name}
            </Link>
            <p className="text-sm text-slate-500">
              {fmtDate(focusRange.start)} →{" "}
              {fmtDate(new Date(focusRange.end.getTime() - 86400000))}
            </p>
          </div>
          <SeasonBadge season={season} />
        </div>
      </div>

      <WeatherNow lat={focus.region.lat} lng={focus.region.lng} />

      {next && nextStart && (
        <p className="text-sm text-slate-500">
          Next:{" "}
          <Link
            href={`/regions/${next.region.id}`}
            className="font-medium text-slate-800 hover:text-amber-600"
          >
            {next.region.name}
          </Link>{" "}
          in {daysFromToday(nextStart)} days.
        </p>
      )}

      {festivalsThisMonth.length > 0 && (
        <section className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50/60 p-5">
          <h3 className="mb-3 font-semibold text-slate-900">
            Festivals in {MONTH_NAMES_LONG[nowMonth - 1]}
          </h3>
          <ul className="space-y-3">
            {festivalsThisMonth.map((f) => (
              <li key={`${f.region.id}-${f.event.name}`} className="flex gap-3">
                <span aria-hidden className="text-fuchsia-600">
                  🎉
                </span>
                <div>
                  <p className="font-medium text-slate-900">
                    {f.event.name}{" "}
                    <Link
                      href={`/regions/${f.region.id}`}
                      className="text-sm font-normal text-slate-500 hover:text-fuchsia-600"
                    >
                      · {f.region.name}
                    </Link>
                  </p>
                  <p className="text-sm text-slate-600">{f.event.blurb}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div>
        <h3 className="mb-3 font-semibold text-slate-900">Your itinerary</h3>
        <ol className="space-y-2">
          {legs.map((leg, i) => (
            <li
              key={leg.region.id}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${
                i === focusIdx
                  ? "border-amber-300 bg-amber-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <Link
                href={`/regions/${leg.region.id}`}
                className="font-medium text-slate-900 hover:text-amber-600"
              >
                {i + 1}. {leg.region.name}
              </Link>
              <span className="text-sm text-slate-500">
                {fmtDate(ranges[i].start)}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {status !== "after" && (
        <PreDepartureChecklist regions={legs.map((l) => l.region)} />
      )}

      <SavedTripsPanel />
    </div>
  );
}
