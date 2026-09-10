/**
 * The Google Places (New) call behind the Nearby section. Server-only — the
 * key never reaches the browser, and everything degrades to
 * `configured: false` when it's absent, exactly like the Tripadvisor route, so
 * a fork without billing set up still builds and runs.
 */

import { haversineKm } from "@/lib/transport";
import {
  NEARBY_CATEGORIES,
  rankPlaces,
  type NearbyCategory,
  type NearbyPlace,
} from "@/lib/places";

const ENDPOINT = "https://places.googleapis.com/v1/places:searchNearby";

/**
 * Read at call time, not module load. A serverless instance can be built
 * before the environment is attached, and reading it lazily is also what lets
 * a test toggle the key between cases without re-importing the module.
 */
function apiKey(): string | undefined {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || undefined;
}

/** Whether the server has a key at all. Callers branch on this, not on errors. */
export function placesConfigured(): boolean {
  return !!apiKey();
}

/** Only what we render — the field mask is also what Google bills on. */
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.rating",
  "places.userRatingCount",
  "places.location",
  "places.shortFormattedAddress",
  "places.currentOpeningHours.openNow",
  "places.googleMapsUri",
  "places.priceLevel",
].join(",");

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  location?: { latitude?: number; longitude?: number };
  shortFormattedAddress?: string;
  currentOpeningHours?: { openNow?: boolean };
  googleMapsUri?: string;
  priceLevel?: string;
}

export class PlacesError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "PlacesError";
  }
}

/**
 * One Places call, normalised and ranked.
 *
 * `rankPreference: POPULARITY` decides which 20 places come back; our own
 * ranking decides the order they're shown in. Asking for DISTANCE instead
 * would fill the list with whatever happens to be closest, which for "top
 * rated" is the wrong 20 to start from.
 */
export async function searchNearby({
  lat,
  lng,
  category,
  radiusM,
  limit = 20,
}: {
  lat: number;
  lng: number;
  category: NearbyCategory;
  radiusM: number;
  limit?: number;
}): Promise<NearbyPlace[]> {
  const key = apiKey();
  if (!key) throw new PlacesError(503, "Places API is not configured");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: NEARBY_CATEGORIES[category].types,
      maxResultCount: Math.min(20, Math.max(1, limit)),
      rankPreference: "POPULARITY",
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusM,
        },
      },
    }),
    // Places pricing is per call, so never let Next revalidate this on its own
    // schedule; the route's own cache decides when we spend again.
    cache: "no-store",
  });

  if (!res.ok) {
    // Upstream detail goes to the server log, never to the client: a bad or
    // unbilled key makes Google explain the account's configuration, which is
    // not something a visitor should be reading off a failed request.
    const detail = await res.text().catch(() => "");
    console.error(
      `[places] Google responded ${res.status}${detail ? `: ${detail.slice(0, 500)}` : ""}`
    );
    throw new PlacesError(
      res.status === 429 ? 429 : 502,
      res.status === 429
        ? "Nearby search is busy — try again shortly."
        : "Nearby search is unavailable right now."
    );
  }

  const data = (await res.json()) as { places?: RawPlace[] };
  const origin = { lat, lng };

  const places: NearbyPlace[] = (data.places ?? [])
    .map((p): NearbyPlace | null => {
      const plat = p.location?.latitude;
      const plng = p.location?.longitude;
      const name = p.displayName?.text;
      // A place with no id, name or position can't be listed, mapped, or
      // deduped — drop it rather than render a blank row.
      if (!p.id || !name || plat == null || plng == null) return null;
      return {
        id: p.id,
        name,
        rating: typeof p.rating === "number" ? p.rating : null,
        reviewCount:
          typeof p.userRatingCount === "number" ? p.userRatingCount : null,
        lat: plat,
        lng: plng,
        address: p.shortFormattedAddress ?? null,
        openNow: p.currentOpeningHours?.openNow ?? null,
        mapsUrl: p.googleMapsUri ?? null,
        priceLevel: p.priceLevel ?? null,
        distanceKm:
          Math.round(haversineKm(origin, { lat: plat, lng: plng }) * 100) / 100,
      };
    })
    .filter((p): p is NearbyPlace => p !== null);

  return rankPlaces(places);
}
