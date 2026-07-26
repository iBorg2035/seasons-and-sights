"use client";

/**
 * /trips — the home base for the user's trips.
 *
 * Lists every saved trip as a card (newest first) and offers a "New trip"
 * affordance. Because trips live in localStorage, this is a client component:
 * on mount it reads the saved trips + active-trip pointer and re-syncs on the
 * three storage events (SAVED_TRIPS_EVENT, ACTIVE_TRIP_EVENT, "storage").
 *
 * This is the target of the trip page's "← Trips" back-link and the header
 * badge. No metadata export is possible from a client page, so the browser tab
 * falls back to the default title.
 */

import { useCallback, useEffect, useState } from "react";
import {
  createTrip,
  getSavedTrips,
  SAVED_TRIPS_EVENT,
  type SavedTripLite,
} from "@/lib/saved-trips";
import {
  ACTIVE_TRIP_EVENT,
  ensureActiveTripId,
} from "@/lib/active-trip";
import { TripCard } from "@/components/TripCard";
import { useRouter } from "next/navigation";

export default function TripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<SavedTripLite[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);

  // Re-read both stores; gated on `window` so SSR never touches localStorage.
  // ensureActiveTripId (not getActiveTripId) repairs the pointer if the active
  // trip was deleted, so the "Active" tag tracks the newest remaining trip.
  const sync = useCallback(() => {
    setTrips(getSavedTrips());
    setActiveId(ensureActiveTripId());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener(SAVED_TRIPS_EVENT, sync);
    window.addEventListener(ACTIVE_TRIP_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SAVED_TRIPS_EVENT, sync);
      window.removeEventListener(ACTIVE_TRIP_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  /**
   * Two ways in, because the app had only one and it was the wrong one for
   * half the cases: month-planning is right when you're choosing *when* to go,
   * and pure friction when you've already booked. A dates-first trip starts in
   * booked mode, so stops get arrive/leave pickers immediately instead of
   * being planned by month and converted afterwards.
   */
  const handleNew = (mode?: "booked") => {
    const t = createTrip(undefined, mode ? { mode } : {});
    if (!t) {
      setSaveError(true);
      return;
    }
    setSaveError(false);
    router.push(`/trips/${t.id}`);
  };

  const count = trips.length;

  return (
    <div>
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            My trips
          </h1>
          <p className="mt-1 text-slate-600">
            {count === 0
              ? "Plan and save your trips here."
              : `${count} ${count === 1 ? "trip" : "trips"}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleNew()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
          >
            <span aria-hidden>＋</span> Plan by season
          </button>
          <button
            onClick={() => handleNew("booked")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <span aria-hidden>📅</span> I know my dates
          </button>
        </div>
      </section>
      {saveError && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Couldn&apos;t save a new trip. Check that browser storage is enabled
          and try again.
        </p>
      )}

      {count === 0 ? (
        // Empty state: a dashed-border card inviting creation, echoing
        // RegionCard's visual language.
        <div className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">
          <span className="text-4xl" aria-hidden>
            🧳
          </span>
          <span className="text-lg font-semibold text-slate-700">
            Start your first trip
          </span>
          <span className="text-sm">
            Not sure when to go? We&apos;ll line each stop up with its best
            season. Already booked? Start from your real dates.
          </span>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => handleNew()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              <span aria-hidden>＋</span> Plan by season
            </button>
            <button
              onClick={() => handleNew("booked")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <span aria-hidden>📅</span> I know my dates
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} active={trip.id === activeId} />
          ))}
        </div>
      )}
    </div>
  );
}
