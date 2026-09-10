"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SavedTripLite } from "@/lib/saved-trips";
import { tripDateRanges } from "@/lib/trip-plan";
import { tripSlimLegs } from "@/lib/trip-plan-slim";
import { fallbackOrigin, type NearbyOrigin } from "@/lib/nearby-origin";
import { useGeolocation } from "@/lib/use-geolocation";
import {
  NEARBY_CATEGORIES,
  type NearbyCategory,
  type NearbyPlace,
} from "@/lib/places";
import {
  nearbyCacheKey,
  readNearbyCache,
  writeNearbyCache,
  STALE_AFTER,
} from "@/lib/nearby-cache";

/** Metres. "Walk" is the honest default; "wider" covers a scooter ride. */
const RADII = [
  { m: 1500, label: "Walk" },
  { m: 5000, label: "Wider" },
] as const;

const PRICE: Record<string, string> = {
  PRICE_LEVEL_FREE: "",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function formatAge(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

interface Loaded {
  places: NearbyPlace[];
  ts: number;
  /** True when these came from storage and nothing newer could be fetched. */
  stale: boolean;
}

/**
 * "What's good right here" — the on-the-ground half of the app.
 *
 * Everything else in a trip is planned in advance from curated seasonal data.
 * This is the one section that only makes sense once you've arrived, so it is
 * built for arrival conditions: it works with location permission refused (it
 * falls back to the stop you're on), and it works with no signal at all (the
 * last results for that spot are kept in localStorage and shown, labelled, as
 * stale). A blank section on a bad connection would make it useless exactly
 * when it is needed.
 */
export function NearbySection({ trip }: { trip: SavedTripLite }) {
  const [category, setCategory] = useState<NearbyCategory>("coffee");
  const [radiusM, setRadiusM] = useState<number>(RADII[0].m);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "off">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const geo = useGeolocation();

  const stopOrigin = useMemo(() => {
    const legs = tripSlimLegs(trip);
    const ranges = tripDateRanges(trip, legs);
    return fallbackOrigin(legs, ranges);
  }, [trip]);

  const origin: NearbyOrigin | null =
    geo.status === "ok" && geo.coords
      ? { ...geo.coords, label: "your location", source: "gps" }
      : stopOrigin;

  const lat = origin?.lat;
  const lng = origin?.lng;

  const load = useCallback(
    async (force: boolean) => {
      if (lat == null || lng == null) return;
      const key = nearbyCacheKey(lat, lng, category, radiusM);
      const cached = readNearbyCache(key);

      // A fresh local hit answers without a network round trip *or* a billed
      // API call. Only an explicit refresh looks past it.
      if (!force && cached && Date.now() - cached.ts < STALE_AFTER) {
        setLoaded({ places: cached.places, ts: cached.ts, stale: false });
        setStatus("idle");
        return;
      }

      setStatus("loading");
      setErrorMsg(null);
      try {
        const res = await fetch(
          `/api/places?lat=${lat}&lng=${lng}&category=${category}&radius=${radiusM}`
        );
        const data = (await res.json()) as {
          configured?: boolean;
          places?: NearbyPlace[];
          error?: string;
        };

        if (data.configured === false) {
          setStatus("off");
          setLoaded(null);
          return;
        }
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

        const ts = Date.now();
        const places = data.places ?? [];
        setLoaded({ places, ts, stale: false });
        setStatus("idle");
        writeNearbyCache(key, {
          places,
          ts,
          center: { lat, lng },
          radiusM,
        });
      } catch (err) {
        // Offline or upstream down. Anything previously seen for this exact
        // spot beats an error message, as long as we say how old it is.
        if (cached) {
          setLoaded({ places: cached.places, ts: cached.ts, stale: true });
          setStatus("idle");
        } else {
          setLoaded(null);
          setStatus("error");
          setErrorMsg(
            err instanceof Error ? err.message : "Couldn't load nearby places."
          );
        }
      }
    },
    [lat, lng, category, radiusM]
  );

  // Re-runs whenever the point, category or radius changes — which is also
  // what clears results when the trip switches underneath this component
  // (Next reuses it across /trips/[id] navigations, so stale places from the
  // previous trip would otherwise sit there looking current).
  useEffect(() => {
    setLoaded(null);
    void load(false);
  }, [load]);

  if (!origin) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Add a stop to see what&apos;s good nearby.
      </div>
    );
  }

  const meta = NEARBY_CATEGORIES[category];

  return (
    <div className="space-y-4">
      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(NEARBY_CATEGORIES) as NearbyCategory[]).map((c) => {
          const m = NEARBY_CATEGORIES[c];
          const active = c === category;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-teal-300 bg-teal-50 text-teal-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span aria-hidden>{m.icon}</span> {m.label}
            </button>
          );
        })}
      </div>

      {/* Where we're searching from */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm">
        <span className="text-slate-600">
          Near <span className="font-medium text-slate-900">{origin.label}</span>
          {origin.source === "stop" && (
            <span className="text-slate-400"> · your trip stop</span>
          )}
        </span>

        {geo.status !== "ok" && (
          <button
            type="button"
            onClick={geo.request}
            disabled={geo.status === "locating"}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {geo.status === "locating" ? "Locating…" : "📍 Use my location"}
          </button>
        )}

        <div className="flex gap-1">
          {RADII.map((r) => (
            <button
              key={r.m}
              type="button"
              aria-pressed={r.m === radiusM}
              onClick={() => setRadiusM(r.m)}
              // globals.css remaps a specific set of Tailwind classes for dark
              // mode; `bg-slate-900 text-white` is the app's vocabulary for a
              // selected pill (it inverts to light-on-black). Off-vocabulary
              // shades like slate-800/100 don't invert, which read as the
              // selection being on the wrong button.
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                r.m === radiusM
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void load(true)}
          className="ml-auto text-xs font-medium text-teal-700 hover:underline"
        >
          Refresh
        </button>
      </div>

      {geo.status === "denied" && (
        <p className="text-xs text-slate-400">
          Location is blocked for this site, so results are centred on your trip
          stop. Allow location in your browser&apos;s site settings to search
          from where you actually are.
        </p>
      )}

      {status === "off" && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Nearby search isn&apos;t configured on this deployment. Set{" "}
          <code className="rounded bg-slate-200 px-1 text-xs">
            GOOGLE_PLACES_API_KEY
          </code>{" "}
          to turn it on — see .env.example.
        </p>
      )}

      {status === "loading" && !loaded && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      )}

      {status === "error" && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMsg}
        </p>
      )}

      {loaded && loaded.places.length === 0 && status !== "loading" && (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          No {meta.label.toLowerCase()} found within{" "}
          {radiusM >= 1000 ? `${radiusM / 1000} km` : `${radiusM} m`}. Try a
          wider radius.
        </p>
      )}

      {loaded && loaded.places.length > 0 && (
        <>
          {loaded.stale && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Offline — showing the last results saved for this spot (
              {formatAge(loaded.ts)}). Opening hours may be out of date.
            </p>
          )}
          <ol className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {loaded.places.map((p, i) => (
              <li key={p.id} className="flex gap-3 px-4 py-3">
                <span className="w-5 flex-none pt-0.5 text-sm font-semibold text-slate-400">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium text-slate-900">{p.name}</span>
                    {p.rating != null && (
                      <span className="text-sm text-slate-600">
                        <span aria-hidden>★</span> {p.rating.toFixed(1)}
                        {p.reviewCount != null && (
                          <span className="text-slate-400">
                            {" "}
                            ({p.reviewCount.toLocaleString()})
                          </span>
                        )}
                      </span>
                    )}
                    {p.priceLevel && PRICE[p.priceLevel] && (
                      <span className="text-xs text-slate-400">
                        {PRICE[p.priceLevel]}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                    <span>{formatDistance(p.distanceKm)}</span>
                    {p.openNow != null && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span
                          className={
                            p.openNow ? "text-emerald-600" : "text-slate-400"
                          }
                        >
                          {p.openNow ? "Open now" : "Closed"}
                        </span>
                      </>
                    )}
                    {p.address && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="truncate">{p.address}</span>
                      </>
                    )}
                  </div>
                </div>
                {p.mapsUrl && (
                  <a
                    href={p.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-none self-center rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-teal-700 transition hover:bg-slate-50"
                  >
                    Map ↗
                  </a>
                )}
              </li>
            ))}
          </ol>
          <p className="text-xs text-slate-400">
            Ranked by rating weighted for review count, so a single five-star
            review doesn&apos;t outrank a well-reviewed favourite. Ratings from
            Google.
          </p>
        </>
      )}
    </div>
  );
}
