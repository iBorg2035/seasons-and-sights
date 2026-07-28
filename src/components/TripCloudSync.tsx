"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  fetchRemoteTrips,
  upsertRemoteTrip,
  mergeTrips,
  type SavedTrip,
} from "@/lib/supabase/trips";
import {
  SAVED_TRIPS_KEY,
  notifySavedTripsChanged,
} from "@/lib/saved-trips";

/**
 * Pull the signed-in user's cloud trips, merge them into localStorage
 * (last-write-wins) and push any local-only trips up.
 *
 * Headless and mounted once in the root layout, which is the whole point. This
 * effect used to live inside TripView, and there it could never run for the
 * person who needed it most: a new device has no local trips, so it lands on
 * /trips, sees an empty list, and offers no way into /trips/[id] — the only
 * page that would have fetched them. Signing in on a second device looked
 * exactly like having no trips at all. The sync has to be reachable from
 * wherever you land, not from the page you can only open once it has already
 * worked.
 *
 * Deliberately does not delete anything locally. mergeTrips treats absence as
 * "not seen here yet", not as a deletion, so a trip cleared on one device comes
 * back from the cloud rather than being erased everywhere.
 */
export function TripCloudSync() {
  const { user } = useAuth();
  const userId = user?.id;

  // Keyed on the id, not the user object: a token refresh swaps the object
  // identity and would otherwise re-run the whole sync every hour.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const remote = await fetchRemoteTrips();
      if (cancelled) return;

      let local: SavedTrip[] = [];
      try {
        local = JSON.parse(localStorage.getItem(SAVED_TRIPS_KEY) || "[]");
      } catch {
        // A corrupt store shouldn't block the cloud copy from arriving.
      }

      const { merged, toPush } = mergeTrips(local, remote);
      try {
        localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(merged));
        notifySavedTripsChanged();
      } catch {
        // Quota or private mode — the merge is lost, but nothing is corrupted.
      }

      // Outside setState so StrictMode's double-invoke can't double-upload.
      for (const t of toPush) void upsertRemoteTrip(userId, t);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return null;
}
