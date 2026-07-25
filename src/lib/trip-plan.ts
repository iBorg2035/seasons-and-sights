import {
  monthOf,
  planItinerary,
  type ClimateRegion,
  type ItineraryLeg,
  type PlannerStop,
} from "@/lib/season";
import type { SavedTripLite } from "@/lib/saved-trips";

/**
 * Turning a saved trip into planner stops and itinerary legs used to be
 * reimplemented at every call site — six copies with four different rules for
 * what a "flexible" start month means, one of which (the public shared-trip
 * view) had no rule at all and fed month `0` straight into the planner.
 *
 * This module is the single implementation. It imports no region data: callers
 * inject their own lookup, so the client views (slim data) and the server-only
 * assistant tools (full dataset) share the logic without sharing an import —
 * the client-bundle-hygiene rule in AGENTS.md. Client callers should use
 * `@/lib/trip-plan-slim` rather than binding a lookup themselves.
 */

/**
 * The minimum a trip needs to be plannable. Deliberately narrower than
 * SavedTripLite so shared-trip payloads (no id/name/ownerId) and the
 * assistant's trip-context payload satisfy it too.
 */
export type PlannableTrip = Pick<SavedTripLite, "start" | "stops">;

/** A start month names a real month; anything else means "flexible". */
export function isFlexibleStart(start: number | undefined): boolean {
  return !Number.isInteger(start) || (start as number) < 1 || (start as number) > 12;
}

/**
 * The one flexible-start rule: a start outside 1-12 (0, 13, NaN, undefined)
 * falls back to the current month, so the planner is never handed a month
 * number it can't index.
 */
export function resolveStartMonth(
  start: number | undefined,
  now: Date = new Date()
): number {
  return isFlexibleStart(start) ? monthOf(now) : (start as number);
}

/**
 * Resolve `[regionId, durationMonths]` pairs against a region lookup, dropping
 * ids the lookup doesn't know (a destination can be retired from the dataset
 * while it's still referenced by a saved trip) and clamping the duration, so a
 * malformed stored row renders a sane trip instead of NaN months.
 */
export function tripToStops<R extends ClimateRegion>(
  trip: PlannableTrip,
  lookup: (id: string) => R | undefined
): PlannerStop<R>[] {
  const stops: PlannerStop<R>[] = [];
  for (const [id, duration] of trip.stops) {
    const region = lookup(id);
    if (!region) continue;
    stops.push({
      region,
      durationMonths: Math.max(1, Math.round(duration) || 1),
    });
  }
  return stops;
}

/**
 * The trip's itinerary legs. Note `planItinerary` reorders stops for best
 * season fit, so leg order is not `trip.stops` order — match on `region.id`.
 */
export function tripLegs<R extends ClimateRegion>(
  trip: PlannableTrip,
  lookup: (id: string) => R | undefined,
  now: Date = new Date()
): ItineraryLeg<R>[] {
  return planItinerary(tripToStops(trip, lookup), resolveStartMonth(trip.start, now));
}
