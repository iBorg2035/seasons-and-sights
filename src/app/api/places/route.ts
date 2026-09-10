import { NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";
import { isNearbyCategory, type NearbyPlace } from "@/lib/places";
import {
  placesConfigured,
  searchNearby,
  PlacesError,
} from "@/lib/places-google";

/**
 * GET /api/places?lat=&lng=&category=&radius=
 *
 * Top-rated places near a point. Unlike /api/weather this one costs money per
 * call, so it is defended on three fronts: coordinates are rounded before they
 * become a cache key, results are cached per rounded point, and a per-IP
 * limiter caps how fast one client can spend.
 */

/** Metres. Walking distance by default; capped well under the API's 50km. */
const DEFAULT_RADIUS = 1500;
const MAX_RADIUS = 20000;

/**
 * ~110m at the equator. GPS jitter while you stand still moves the raw
 * coordinate constantly; without this rounding every re-render of the same
 * street corner would be a fresh billed call.
 */
const COORD_PRECISION = 3;

/**
 * Long enough to make a walk around the block free, short enough that
 * "open now" isn't lying by the time you get there.
 */
const TTL = 30 * 60 * 1000;

const cache = new Map<string, { places: NearbyPlace[]; ts: number }>();

/** Same shape as rate-limit's sweep: bound the map on a long-lived instance. */
function pruneCache(now: number) {
  if (cache.size < 500) return;
  for (const [key, entry] of cache) {
    if (now - entry.ts >= TTL) cache.delete(key);
  }
}

const rateLimit = createRateLimiter({ limit: 30, windowMs: 10 * 60 * 1000 });

function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "anonymous";
}

export async function GET(request: Request) {
  // Answer the "is this feature on" question without spending anything, so the
  // client can hide the section instead of showing a broken one.
  if (!placesConfigured()) {
    return NextResponse.json({ configured: false, places: [] }, { status: 200 });
  }

  const { searchParams } = new URL(request.url);
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  const lat = Number(latParam);
  const lng = Number(lngParam);

  if (
    latParam === null ||
    lngParam === null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      {
        error:
          "valid lat (-90..90) and lng (-180..180) query params are required",
      },
      { status: 400 }
    );
  }

  const category = searchParams.get("category") ?? "coffee";
  if (!isNearbyCategory(category)) {
    return NextResponse.json(
      { error: `unknown category "${category.slice(0, 40)}"` },
      { status: 400 }
    );
  }

  const radiusParam = Number(searchParams.get("radius"));
  const radiusM = Number.isFinite(radiusParam)
    ? Math.min(MAX_RADIUS, Math.max(100, radiusParam))
    : DEFAULT_RADIUS;

  const rLat = Number(lat.toFixed(COORD_PRECISION));
  const rLng = Number(lng.toFixed(COORD_PRECISION));
  const key = `${rLat},${rLng},${category},${radiusM}`;

  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < TTL) {
    return NextResponse.json({
      configured: true,
      cached: true,
      center: { lat: rLat, lng: rLng },
      radiusM,
      category,
      places: hit.places,
    });
  }

  // Only rate-limit calls that would actually spend. A client paging back
  // through categories it already loaded shouldn't burn its allowance.
  const limit = rateLimit(clientKey(request), now);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many nearby searches — give it a minute." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  try {
    const places = await searchNearby({
      lat: rLat,
      lng: rLng,
      category,
      radiusM,
    });
    pruneCache(now);
    cache.set(key, { places, ts: now });
    return NextResponse.json({
      configured: true,
      cached: false,
      center: { lat: rLat, lng: rLng },
      radiusM,
      category,
      places,
    });
  } catch (err) {
    // PlacesError messages are written for the traveler; anything else is an
    // unexpected throw whose text could carry internals, so it is logged and
    // replaced rather than forwarded.
    if (err instanceof PlacesError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[places] lookup failed", err);
    return NextResponse.json(
      { error: "Nearby search is unavailable right now." },
      { status: 502 }
    );
  }
}
