import { getSlimRegion, type SlimRegion } from "@/data/regions-slim";
import { tripLegs, tripToStops, type PlannableTrip } from "@/lib/trip-plan";
import type { ItineraryLeg, PlannerStop } from "@/lib/season";

/**
 * Client-safe binding of the trip planner: the same logic as trip-plan.ts,
 * bound to the slim region dataset. Client views must use these rather than
 * calling tripToStops/tripLegs with their own lookup, so the heavy
 * `@/data/regions` module can never reach a client bundle.
 */

export function tripToSlimStops(trip: PlannableTrip): PlannerStop<SlimRegion>[] {
  return tripToStops(trip, getSlimRegion);
}

export function tripSlimLegs(
  trip: PlannableTrip,
  now?: Date
): ItineraryLeg<SlimRegion>[] {
  return tripLegs(trip, getSlimRegion, now);
}
