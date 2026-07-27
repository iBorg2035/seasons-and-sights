import {
  bookedLegs,
  fitQuality,
  formatDay,
  legDateRanges,
  monthOf,
  parseDay,
  planItinerary,
  type ClimateRegion,
  type DateRange,
  type ItineraryLeg,
  type PlannerStop,
} from "@/lib/season";
import type { IcsEvent } from "@/lib/ics";
import {
  isBooked,
  type BookedRange,
  type DayStamp,
  type SavedTripLite,
} from "@/lib/saved-trips";

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

/** Shortest stay the planner will accept, in months — a single day. */
const MIN_DURATION_MONTHS = 1 / 30;

/**
 * Sanitise a stored stay length.
 *
 * No longer rounds to whole months: stays can now be a week or a fortnight,
 * and rounding would turn every one of them into a month. Still rejects the
 * shapes a corrupt row can produce — NaN, zero, negatives — by falling back to
 * one day rather than letting them reach the date arithmetic.
 */
function clampDuration(duration: number): number {
  // A corrupt value falls back to a month, not a day: one day is small enough
  // to be invisible in the UI, so a broken row would silently vanish from the
  // itinerary instead of showing up as obviously wrong.
  if (!Number.isFinite(duration) || duration <= 0) return 1;
  return Math.max(MIN_DURATION_MONTHS, duration);
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
    stops.push({ region, durationMonths: clampDuration(duration) });
  }
  return stops;
}

/**
 * The trip's itinerary legs. Note `planItinerary` reorders stops for best
 * season fit, so leg order is not `trip.stops` order — match on `region.id`.
 */
export function tripLegs<R extends ClimateRegion & { id: string }>(
  trip: PlannableTrip,
  lookup: (id: string) => R | undefined,
  now: Date = new Date()
): ItineraryLeg<R>[] {
  const stops = tripToStops(trip, lookup);
  if (isBooked(trip)) return bookedLegs(stops, bookedRangesFor(trip, stops));
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
 * The committed ranges lined up with a FILTERED sequence — resolved stops or
 * legs — rather than with `trip.stops`.
 *
 * This distinction is load-bearing. `tripToStops` drops region ids the dataset
 * no longer knows, so the moment a trip references a retired destination the
 * stops array is shorter than `bookedDates`, and pairing them positionally
 * hands every leg the dates belonging to a different one. Matching on region
 * id fixes that; the per-id queue keeps it correct even if the same
 * destination were ever listed twice.
 */
function bookedRangesFor(
  trip: PlannableTrip,
  items: { region: { id: string } }[]
): (DateRange | null)[] {
  const queues = new Map<string, (DateRange | null)[]>();
  trip.stops.forEach(([id], i) => {
    const r = trip.bookedDates?.[i];
    const range = r ? { start: parseDay(r.start), end: parseDay(r.end) } : null;
    const q = queues.get(id) ?? [];
    q.push(range);
    queues.set(id, q);
  });
  return items.map((it) => queues.get(it.region.id)?.shift() ?? null);
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
  legs: ItineraryLeg<ClimateRegion & { id: string }>[],
  from: Date = new Date()
): (DateRange | null)[] {
  if (isBooked(trip)) return bookedRangesFor(trip, legs);
  return legDateRanges(resolveStartMonth(trip.start, from), legs, from);
}

/**
 * Turn a planned trip into a booked one: commit the derived dates.
 *
 * The subtlety worth naming — `planItinerary` REORDERS stops for season fit,
 * so `ranges[i]` belongs to `legs[i]`, not to `stops[i]`. Seeding
 * index-aligned against the raw stops would hang every date on the wrong
 * destination. So the stops are rewritten into the planner's order, which is
 * also the honest reading of "lock in this plan": the order IS part of what
 * was planned. Callers must make that visible rather than silent — see
 * `wouldReorder`.
 *
 * Durations are carried across so switching back to planning restores the
 * original month-based trip intact.
 */
export function seedBookedDates<R extends ClimateRegion & { id: string }>(
  stops: [string, number][],
  legs: ItineraryLeg<R>[],
  ranges: DateRange[]
): { stops: [string, number][]; bookedDates: BookedRange[] } {
  const durationById = new Map(stops);
  const nextStops: [string, number][] = [];
  const bookedDates: BookedRange[] = [];

  legs.forEach((leg, i) => {
    const id = leg.region.id;
    nextStops.push([id, durationById.get(id) ?? leg.months.length ?? 1]);
    const r = ranges[i];
    if (r) {
      bookedDates.push({ start: formatDay(r.start), end: formatDay(r.end) });
    }
  });

  return { stops: nextStops, bookedDates };
}

/** Whether committing the plan would visibly rearrange the user's stop list. */
export function wouldReorder<R extends ClimateRegion & { id: string }>(
  stops: [string, number][],
  legs: ItineraryLeg<R>[]
): boolean {
  if (legs.length !== stops.length) return false;
  return legs.some((leg, i) => leg.region.id !== stops[i][0]);
}

/**
 * Calendar events for a trip's stays, one per dated leg.
 *
 * Works in both modes: planning exports the derived month ranges (genuinely
 * useful for blocking out a rough trip), booked exports the committed dates.
 * Undated stops are skipped — there's nothing to put on a calendar — so the
 * export can be shorter than the stop list, which is correct rather than an
 * error worth surfacing.
 *
 * `buildIcs` already emits end-exclusive all-day events, matching DateRange,
 * so no date translation happens here.
 */
export function tripIcsEvents<
  R extends ClimateRegion & { name: string; country: string },
>(legs: ItineraryLeg<R>[], ranges: (DateRange | null)[]): IcsEvent[] {
  const events: IcsEvent[] = [];
  legs.forEach((leg, i) => {
    const range = ranges[i];
    if (!range) return;
    events.push({
      title: `${leg.region.name}, ${leg.region.country}`,
      start: range.start,
      end: range.end,
      description: fitQuality(leg.fit).label,
    });
  });
  return events;
}

/**
 * Which destination the trip was in on a given day, or null if that day falls
 * outside every stay (a gap between stays, or before/after the trip).
 *
 * Ranges are half-open — `[start, end)` — matching legDateRanges, bookedLegs
 * and buildIcs, so the day you fly out belongs to the next stop rather than
 * being counted twice.
 *
 * `legs` and `ranges` must come from the same trip, via tripLegs/tripDateRanges.
 */
export function stopOnDay<R extends ClimateRegion>(
  legs: ItineraryLeg<R>[],
  ranges: (DateRange | null)[],
  day: DayStamp
): R | null {
  const target = parseDay(day).getTime();
  if (!Number.isFinite(target)) return null;

  for (let i = 0; i < legs.length; i++) {
    const range = ranges[i];
    if (!range) continue;
    if (target >= range.start.getTime() && target < range.end.getTime()) {
      return legs[i].region;
    }
  }
  return null;
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
