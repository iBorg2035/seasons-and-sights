"use client";

import { useCallback, useEffect, useState } from "react";
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
  /** Trip to save ticks against. Without it the list is read-only. */
  tripId?: string;
}) {
  if (compact) {
    return (
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Pack for {MONTH_NAMES_LONG[month - 1]}
        </h4>
        <Groups region={region} month={month} tripId={tripId} />
      </div>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">Packing list</h2>
      <p className="mb-4 text-xs text-slate-400">
        Tailored to {region.name} in {MONTH_NAMES_LONG[month - 1]}
        {tripId ? " — tick as you pack." : "."}
      </p>
      <Groups region={region} month={month} tripId={tripId} />
    </section>
  );
}
