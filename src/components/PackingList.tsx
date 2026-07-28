"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Region } from "@/types";
import { packingList } from "@/lib/packing";
import { MONTH_NAMES_LONG } from "@/lib/season";
import {
  PACKING_ENTITY,
  loadPacked,
  packingKey,
  setPacked,
} from "@/lib/packing-progress";
import { useOptionalAuth } from "@/lib/contexts/auth-context";
import { mirrorRecord } from "@/lib/supabase/trip-records";
import { TRIP_RECORDS_EVENT } from "@/lib/trip-records";
import { ACTIVE_TRIP_EVENT, getActiveTripId } from "@/lib/active-trip";
import { SAVED_TRIPS_EVENT, getTrip } from "@/lib/saved-trips";

/**
 * The trip to save ticks against when the caller doesn't name one.
 *
 * The region page has no trip of its own, so its packing list was read-only.
 * Falling back to the active trip makes it work, but the ticks then land
 * somewhere the reader isn't looking — so the name comes back too, and the UI
 * says where they went. Resolved in an effect, not during render: it reads
 * localStorage, which doesn't exist on the server.
 */
function useActiveTrip(enabled: boolean) {
  const [trip, setTrip] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const read = () => {
      const id = getActiveTripId();
      const t = id ? getTrip(id) : undefined;
      setTrip(t ? { id: t.id, name: t.name } : null);
    };
    read();
    window.addEventListener(ACTIVE_TRIP_EVENT, read);
    window.addEventListener(SAVED_TRIPS_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(ACTIVE_TRIP_EVENT, read);
      window.removeEventListener(SAVED_TRIPS_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, [enabled]);

  return trip;
}

/**
 * Now a client component. It was a server component rendering bare uncontrolled
 * checkboxes, which meant "tick as you pack" was a lie: the ticks lived only in
 * the DOM and were gone on the next render, let alone the next visit.
 *
 * Persistence needs a trip to hang off, so `tripId` is optional and the
 * checkboxes are only offered when there is one. On the standalone region page
 * there's nothing to save against, and a checkbox that forgets is worse than no
 * checkbox — the list still reads perfectly well as a list.
 */
function Groups({
  region,
  month,
  tripId,
}: {
  region: Region;
  month: number;
  tripId?: string;
}) {
  const user = useOptionalAuth()?.user;
  const groups = packingList(region, month);
  const [packed, setPackedState] = useState<Set<string>>(new Set());

  const reload = useCallback(() => {
    if (tripId) setPackedState(loadPacked(tripId));
  }, [tripId]);

  // Reload on record changes too, so a tick pulled from another device shows up
  // without a refresh — same subscription the checklist and journal use.
  useEffect(() => {
    reload();
    if (!tripId) return;
    window.addEventListener(TRIP_RECORDS_EVENT, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(TRIP_RECORDS_EVENT, reload);
      window.removeEventListener("storage", reload);
    };
  }, [reload, tripId]);

  function toggle(item: string, checked: boolean) {
    if (!tripId) return;
    setPacked(tripId, region.id, item, checked);
    reload();
    // Push immediately rather than waiting for the next mount-time sync.
    if (user) {
      void mirrorRecord(
        user.id,
        tripId,
        PACKING_ENTITY,
        packingKey(region.id, item)
      );
    }
  }

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
      {groups.map((g) => (
        <div key={g.group}>
          <p className="mb-1.5 text-sm font-medium text-slate-700">{g.group}</p>
          <ul className="space-y-1.5">
            {g.items.map((item) => {
              const checked = packed.has(packingKey(region.id, item));
              return (
                <li key={item}>
                  {tripId ? (
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggle(item, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className={checked ? "text-slate-400 line-through" : ""}>
                        {item}
                      </span>
                    </label>
                  ) : (
                    <span className="flex items-center gap-2 text-sm text-slate-600">
                      <span aria-hidden className="text-slate-300">
                        •
                      </span>
                      {item}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function PackingList({
  region,
  month,
  compact = false,
  tripId,
}: {
  region: Region;
  month: number;
  /** Accordion-embedded variant: h4-style heading, no card chrome. */
  compact?: boolean;
  /** Trip to save ticks against. Falls back to the active trip; without
   *  either (nothing saved yet) the list is read-only. */
  tripId?: string;
}) {
  const active = useActiveTrip(!tripId);
  const saveTo = tripId ?? active?.id;

  if (compact) {
    return (
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Pack for {MONTH_NAMES_LONG[month - 1]}
        </h4>
        <Groups region={region} month={month} tripId={saveTo} />
      </div>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">Packing list</h2>
      <p className="mb-4 text-xs text-slate-400">
        Tailored to {region.name} in {MONTH_NAMES_LONG[month - 1]}
        {saveTo ? " — tick as you pack." : "."}
        {!tripId && active && (
          // Say where the ticks land. Silently writing into a trip the reader
          // isn't looking at is worse than not saving them at all.
          <>
            {" "}
            Saving to{" "}
            <Link
              href={`/trips/${active.id}`}
              className="underline underline-offset-2 hover:text-slate-600"
            >
              {active.name}
            </Link>
            .
          </>
        )}
      </p>
      <Groups region={region} month={month} tripId={saveTo} />
    </section>
  );
}
