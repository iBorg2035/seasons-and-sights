"use client";

import { useMemo } from "react";
import { PreDepartureChecklist } from "@/components/PreDepartureChecklist";
import { getSlimRegion } from "@/data/regions-slim";
import type { SavedTripLite } from "@/lib/saved-trips";

/**
 * Pre-departure prep checklist. Resolves the trip's stops to slim regions and
 * hands them to <PreDepartureChecklist>, which builds items from
 * region.info.visa / region.info.health etc. and manages its own per-trip done
 * state. SlimRegion carries the `info` fields REGIONS_CORE provides, so this is
 * client-safe (no heavy sights/toolkit/events data).
 *
 * Note: the section nav's pending-count badge is intentionally omitted for v1 —
 * the checklist self-reports "X of Y done" and lifting its internal done-state
 * up would couple this component to its localStorage key. Minor follow-up.
 */
export function PrepSection({ trip }: { trip: SavedTripLite }) {
  // Stable region list (deduped, undefined ids skipped) so the checklist only
  // rebuilds when the actual destinations change.
  const regions = useMemo(
    () =>
      Array.from(new Set(trip.stops.map(([id]) => id)))
        .map((id) => getSlimRegion(id))
        .filter((r): r is NonNullable<typeof r> => r !== undefined),
    [trip.stops]
  );

  if (regions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Add stops to see a pre-departure checklist (visas, health, docs).
      </div>
    );
  }

  // Key on the resolved region ids so switching trips/stops reloads cleanly.
  const key = regions.map((r) => r.id).join("|");

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Everything to sort before you fly — built from your destinations'
        visa, health, and practical info.
      </p>
      <PreDepartureChecklist key={key} tripId={trip.id} regions={regions} />
    </div>
  );
}
