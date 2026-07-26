import {
  bookedLegs,
  legDateRanges,
  monthOf,
  parseDay,
  planItinerary,
  type ClimateRegion,
  type DateRange,
  type ItineraryLeg,
  type PlannerStop,
} from "@/lib/season";
import { isBooked, type SavedTripLite } from "@/lib/saved-trips";

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
export type PlannableTrip = Pick<SavedTripLite, "start" | "stops"> &
  Partial<Pick<SavedTripLite, "mode" | "bookedDates">>;

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
  const stops = tripToStops(trip, lookup);
  if (isBooked(trip)) return bookedLegs(stops, bookedRanges(trip));
  return planItinerary(stops, resolveStartMonth(trip.start, now));
}

/** The trip's committed ranges as Dates, index-aligned with its stops. */
function bookedRanges(trip: PlannableTrip): (DateRange | null)[] {
  return trip.stops.map((_, i) => {
    const r = trip.bookedDates?.[i];
    if (!r) return null;
    return { start: parseDay(r.start), end: parseDay(r.end) };
  });
}

/**
 * Per-leg calendar ranges, whichever mode the trip is in.
 *
 * Planning: derived back-to-back from the start month — byte-identical to
 * calling legDateRanges directly, and never null.
 * Booked: the committed ranges, in stops order. These may contain nulls
 * (undated stops) and, unlike planning ranges, are NOT guaranteed contiguous
 * or non-overlapping — real trips have gaps between stays.
 *
 * `legs` must be the output of tripLegs for the same trip.
 */
export function tripDateRanges(
  trip: PlannableTrip,
  legs: ItineraryLeg<ClimateRegion>[],
  from: Date = new Date()
): (DateRange | null)[] {
  if (isBooked(trip)) return bookedRanges(trip);
  return legDateRanges(resolveStartMonth(trip.start, from), legs, from);
}

export type BookingIssue = {
  /** Index into the trip's stops. */
  index: number;
  kind: "overlap" | "gap" | "inverted";
};

/**
 * Non-blocking warnings about a booked trip's dates: a stay that ends before
 * it starts, a gap between consecutive stays, or two stays that overlap.
 *
 * Deliberately advisory rather than enforced — overlapping stays are real
 * (you keep the flat in Lisbon three days into the Porto trip), and so are
 * gaps (you're going home in between). The UI surfaces these; it doesn't
 * block saving.
 */
export function bookingIssues(trip: PlannableTrip): BookingIssue[] {
  if (!isBooked(trip)) return [];
  const ranges = bookedRanges(trip);
  const issues: BookingIssue[] = [];

  ranges.forEach((r, i) => {
    if (r && r.end.getTime() <= r.start.getTime()) {
      issues.push({ index: i, kind: "inverted" });
    }
  });

  // Compare each dated stay against the next dated one, skipping undated
  // stops so a hole in the middle doesn't manufacture a false gap.
  const dated = ranges
    .map((r, i) => ({ r, i }))
    .filter((x): x is { r: DateRange; i: number } => x.r !== null);

  for (let k = 0; k < dated.length - 1; k++) {
    const cur = dated[k];
    const next = dated[k + 1];
    if (next.r.start.getTime() < cur.r.end.getTime()) {
      issues.push({ index: next.i, kind: "overlap" });
    } else if (next.r.start.getTime() > cur.r.end.getTime()) {
      issues.push({ index: next.i, kind: "gap" });
    }
  }

  return issues;
}
