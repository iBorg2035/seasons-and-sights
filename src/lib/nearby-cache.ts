/**
 * Last-known nearby results, kept in localStorage.
 *
 * The moment this feature is most useful is the moment the network is least
 * likely to work: standing on a street in a country whose SIM you don't have.
 * So every successful lookup is written down, and a failed one falls back to
 * whatever was last seen for that point.
 *
 * Keyed by rounded coordinates + category, NOT by trip id. That looks like it
 * breaks the per-entity storage rule, but the rule exists to stop one trip
 * reading another trip's state — and this is not per-trip state at all. Two
 * trips standing on the same corner want the same cafes, and keying by trip
 * would just pay for the same call twice. The coordinates ARE the scope.
 */

import type { NearbyPlace, NearbyCategory } from "@/lib/places";

const PREFIX = "seasons-nearby:";

/** Matches the API route's rounding, so client and server agree on a cache hit. */
const COORD_PRECISION = 3;

/** Older than this and we show it as stale rather than current. */
export const STALE_AFTER = 24 * 60 * 60 * 1000;

export interface CachedNearby {
  places: NearbyPlace[];
  /** Epoch ms the results were fetched. */
  ts: number;
  center: { lat: number; lng: number };
  radiusM: number;
}

export function nearbyCacheKey(
  lat: number,
  lng: number,
  category: NearbyCategory,
  radiusM: number
): string {
  const rLat = lat.toFixed(COORD_PRECISION);
  const rLng = lng.toFixed(COORD_PRECISION);
  return `${PREFIX}${rLat},${rLng},${category},${radiusM}`;
}

export function readNearbyCache(key: string): CachedNearby | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedNearby;
    // A hand-edited or half-written entry must not crash the section.
    if (!Array.isArray(parsed?.places) || typeof parsed?.ts !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeNearbyCache(key: string, value: CachedNearby): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — the feature still works online.
  }
}
