"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getTrip, type DayStamp, type SavedTripLite } from "@/lib/saved-trips";
import { SAVED_TRIPS_EVENT } from "@/lib/saved-trips";
import { TRIP_RECORDS_EVENT } from "@/lib/trip-records";
import { listEntries, type JournalEntry } from "@/lib/journal";
import { listExpenses, type Expense } from "@/lib/expenses";
import { stopOnDay, tripDateRanges } from "@/lib/trip-plan";
import { currencyFromInfo } from "@/lib/money";
import { tripSlimLegs } from "@/lib/trip-plan-slim";
import { findActiveLeg, formatDay } from "@/lib/season";
import { JournalSection } from "@/components/JournalSection";
import { ExpenseSection } from "@/components/ExpenseSection";
import { useAuth } from "@/lib/contexts/auth-context";
import { JOURNAL_ENTITY } from "@/lib/journal";
import { EXPENSE_ENTITY } from "@/lib/expenses";
import { FX_ENTITY } from "@/lib/fx";
import { mirrorRecord, syncRecords } from "@/lib/supabase/trip-records";

/**
 * The day a new entry should default to: today while the trip is under way,
 * otherwise its first dated day. Someone logging an expense mid-trip should
 * not have to fix the date first; someone writing up a finished trip is
 * better served starting at its beginning than at today's unrelated date.
 */
function defaultDayFor(
  ranges: ({ start: Date; end: Date } | null)[],
  now: Date
): DayStamp {
  if (findActiveLeg(ranges, now)) return formatDay(now);
  const firstDated = ranges.find((r) => r != null);
  return firstDated ? formatDay(firstDated.start) : formatDay(now);
}

export function TripJournalView({ tripId }: { tripId: string }) {
  const { user } = useAuth();
  const [trip, setTrip] = useState<SavedTripLite | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const reloadRecords = useCallback(() => {
    setEntries(listEntries(tripId));
    setExpenses(listExpenses(tripId));
  }, [tripId]);

  /**
   * A local write already succeeded before this runs, so the cloud push is
   * fire-and-forget: a failure shows on the sync badge rather than blocking
   * the entry or rolling it back. Signed out, it's a no-op and the journal
   * simply stays on this device.
   */
  const onRecordChanged = useCallback(
    (entity: string) => (id: string) => {
      reloadRecords();
      if (user) void mirrorRecord(user.id, tripId, entity, id);
    },
    [reloadRecords, tripId, user]
  );

  useEffect(() => {
    setTrip(getTrip(tripId));
    setLoaded(true);
    reloadRecords();

    const onTrips = () => setTrip(getTrip(tripId));
    // `storage` catches another tab editing the same trip's journal.
    window.addEventListener(SAVED_TRIPS_EVENT, onTrips);
    window.addEventListener(TRIP_RECORDS_EVENT, reloadRecords);
    window.addEventListener("storage", reloadRecords);
    return () => {
      window.removeEventListener(SAVED_TRIPS_EVENT, onTrips);
      window.removeEventListener(TRIP_RECORDS_EVENT, reloadRecords);
      window.removeEventListener("storage", reloadRecords);
    };
  }, [tripId, reloadRecords]);

  // On sign-in (and on arriving signed in), reconcile both entities with the
  // cloud: pull, last-write-wins merge including tombstones, write back, push
  // whatever local won. Keyed on user.id so a token refresh doesn't re-run it.
  useEffect(() => {
    if (!user) return;
    const userId = user.id;
    let cancelled = false;
    (async () => {
      // FX rates ride along: a rate confirmed on the phone should not have
      // to be re-entered on the laptop.
      for (const entity of [JOURNAL_ENTITY, EXPENSE_ENTITY, FX_ENTITY]) {
        await syncRecords(userId, tripId, entity);
        if (cancelled) return;
      }
      reloadRecords();
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, tripId, reloadRecords]);

  // Slim regions only — this is a client route, per the bundle-hygiene rule.
  const { ranges, placeFor } = useMemo(() => {
    if (!trip) {
      return { ranges: [], placeFor: () => null };
    }
    const legs = tripSlimLegs(trip);
    const r = tripDateRanges(trip, legs);
    return {
      ranges: r,
      placeFor: (day: DayStamp) => stopOnDay(legs, r, day),
    };
  }, [trip]);

  const defaultDay = useMemo(() => defaultDayFor(ranges, new Date()), [ranges]);

  // What you were most likely paying in on a given day. Reuses placeFor rather
  // than re-deriving the itinerary, and reads the currency off the slim
  // region's practical info — no heavy dataset reaches this route.
  const currencyForDay = useCallback(
    (day: DayStamp) => currencyFromInfo(placeFor(day)?.info?.currency),
    [placeFor]
  );

  if (!loaded) {
    return <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />;
  }

  if (!trip) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
        <p className="text-slate-600">This trip couldn&apos;t be found.</p>
        <Link
          href="/trips"
          className="mt-4 inline-block rounded-xl bg-sky-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-900"
        >
          ← Back to trips
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
      <header>
        <Link
          href={`/trips/${tripId}`}
          className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
        >
          ← {trip.name}
        </Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Journal
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Notes and spending for this trip. Stored on this device, and synced to
          your account when you&apos;re signed in.
        </p>
      </header>

      <JournalSection
        tripId={tripId}
        entries={entries}
        expenses={expenses}
        defaultDay={defaultDay}
        placeFor={placeFor}
        onChanged={onRecordChanged(JOURNAL_ENTITY)}
      />

      <ExpenseSection
        tripId={tripId}
        expenses={expenses}
        defaultDay={defaultDay}
        onChanged={onRecordChanged(EXPENSE_ENTITY)}
        currencyForDay={currencyForDay}
      />
    </div>
  );
}
