/**
 * Where "near me" means, when the browser won't say.
 *
 * Geolocation is the right answer and the one we ask for first, but it fails
 * in all the ordinary ways — permission dismissed months ago, location off to
 * save battery, indoors with no fix, an airline's captive wifi. A trip already
 * knows which country you're standing in, so the stop you're on is a perfectly
 * good fallback and keeps the feature useful with location switched off
 * entirely.
 */

import type { SlimRegion } from "@/data/regions-slim";
import type { ItineraryLeg } from "@/lib/season";
import type { DateRange } from "@/lib/season";

export interface NearbyOrigin {
  lat: number;
  lng: number;
  label: string;
  source: "gps" | "stop";
}

/**
 * Index of the leg today falls inside, or -1.
 *
 * Two passes, because the two trip modes disagree about `end`. A planned leg's
 * range is end-EXCLUSIVE (see season.ts) and legs run back to back, so on a
 * hand-off day only `t < end` picks the leg you're arriving at rather than the
 * one you left. A booked leg's `end` is the departure date parsed to midnight,
 * so the same strict test says you are nowhere at all on the day you check out
 * — which is precisely a day you want coffee recommendations.
 *
 * So: strict first, and only if nothing contains today, accept the end day
 * itself. Ordering it this way means the boundary never resolves to two legs.
 */
export function currentLegIndex(
  ranges: (DateRange | null)[],
  now: Date = new Date()
): number {
  const t = now.getTime();
  const startOf = (d: Date) => new Date(d).setHours(0, 0, 0, 0);
  const endOf = (d: Date) => new Date(d).setHours(23, 59, 59, 999);

  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (!r) continue;
    if (t >= startOf(r.start) && t < r.end.getTime()) return i;
  }
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (!r) continue;
    if (t >= startOf(r.start) && t <= endOf(r.end)) return i;
  }
  return -1;
}

/**
 * The best non-GPS guess at where the traveler is.
 *
 * Prefers the stop whose dates contain today — the whole point of the feature
 * is being on the ground somewhere. Falls back to the first stop so a trip
 * that hasn't started yet still shows something real rather than an empty
 * section; `source` stays "stop" either way so the UI can say which it used.
 */
export function fallbackOrigin(
  legs: ItineraryLeg<SlimRegion>[],
  ranges: (DateRange | null)[],
  now: Date = new Date()
): NearbyOrigin | null {
  if (legs.length === 0) return null;
  const idx = currentLegIndex(ranges, now);
  const leg = legs[idx >= 0 ? idx : 0];
  if (!leg?.region) return null;
  return {
    lat: leg.region.lat,
    lng: leg.region.lng,
    label: leg.region.name,
    source: "stop",
  };
}
