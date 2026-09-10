/**
 * Nearby places — the shared, client-safe half.
 *
 * The app's own dataset answers "where should I go this season". Nearby
 * answers the other question, the one you only ask once you've landed: "what's
 * good within walking distance of me, right now". That needs live ratings,
 * which is why it's the one part of the app backed by a paid API rather than
 * curated data.
 *
 * The API call itself lives in places-google.ts, which is server-only. This
 * module holds the category catalogue, the result shape and the ranking, all
 * of which the browser needs too — keeping them apart is what stops the key
 * lookup and the fetch code being bundled into a client route.
 */

export type NearbyCategory =
  | "coffee"
  | "food"
  | "atm"
  | "pharmacy"
  | "laundry";

/**
 * Category → the Places types it searches.
 *
 * Coffee takes both `coffee_shop` and `cafe`: the newer `coffee_shop` type is
 * more precise but unevenly applied outside big Western cities, and dropping
 * `cafe` loses most of the good places in exactly the countries this app is
 * about.
 */
export const NEARBY_CATEGORIES: Record<
  NearbyCategory,
  { label: string; icon: string; types: string[] }
> = {
  coffee: { label: "Coffee", icon: "☕", types: ["coffee_shop", "cafe"] },
  food: { label: "Food", icon: "🍜", types: ["restaurant"] },
  atm: { label: "ATM", icon: "🏧", types: ["atm"] },
  pharmacy: { label: "Pharmacy", icon: "💊", types: ["pharmacy"] },
  laundry: { label: "Laundry", icon: "🧺", types: ["laundry"] },
};

export function isNearbyCategory(v: string): v is NearbyCategory {
  return Object.prototype.hasOwnProperty.call(NEARBY_CATEGORIES, v);
}

export interface NearbyPlace {
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  lat: number;
  lng: number;
  address: string | null;
  /** Null when the place publishes no opening hours, not "closed". */
  openNow: boolean | null;
  mapsUrl: string | null;
  /** Google's enum, e.g. "PRICE_LEVEL_INEXPENSIVE". Null when unrated. */
  priceLevel: string | null;
  /** Great-circle km from the search point. */
  distanceKm: number;
}

/**
 * Bayesian-weighted rating, so "top rated" doesn't mean "one five-star review".
 *
 * A place with 3 perfect reviews and a place with 900 at 4.6 are not
 * comparable on raw average, and the raw average is what almost every "best
 * of" list gets wrong. Pulling each score toward a prior in proportion to how
 * little evidence backs it fixes that without hard-dropping new places — a
 * genuinely good new cafe still climbs as reviews arrive.
 *
 * score = (v / (v + m)) * R + (m / (v + m)) * C
 */
export const RATING_PRIOR_MEAN = 4.0;
export const RATING_PRIOR_WEIGHT = 25;

export function weightedRating(
  rating: number | null,
  reviewCount: number | null,
  { mean = RATING_PRIOR_MEAN, weight = RATING_PRIOR_WEIGHT } = {}
): number {
  if (rating == null) return 0;
  const v = Math.max(0, reviewCount ?? 0);
  return (v / (v + weight)) * rating + (weight / (v + weight)) * mean;
}

/** Best first, by weighted rating; unrated places sink rather than vanish. */
export function rankPlaces(places: NearbyPlace[]): NearbyPlace[] {
  return [...places].sort((a, b) => {
    const diff =
      weightedRating(b.rating, b.reviewCount) -
      weightedRating(a.rating, a.reviewCount);
    if (Math.abs(diff) > 1e-9) return diff;
    // Same standing on the evidence — the nearer one wins.
    return a.distanceKm - b.distanceKm;
  });
}
