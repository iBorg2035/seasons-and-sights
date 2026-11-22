"use client";

import {
  SAVED_TRIPS_KEY,
  getSavedTrips,
  notifySavedTripsChanged,
} from "@/lib/saved-trips";
import { setActiveTripId } from "@/lib/active-trip";
import { clearRecords, loadRecordsRaw, mergeRecords } from "@/lib/trip-records";
import { ALL_TRIP_ENTITIES } from "@/lib/trip-entities";
import { clearQueue, listQueue } from "@/lib/receipt-queue";
import {
  fetchRemoteTripsOrNull,
  mergeTrips,
  upsertRemoteTrip,
  type SavedTrip,
} from "@/lib/supabase/trips";
import {
  fetchRemoteRecordsOrNull,
  pushRecords,
} from "@/lib/supabase/trip-records";

/**
 * Everything personal this browser holds for whoever is signed in, and the
 * two things done with it when they leave: send it to their account, then
 * take it off the device.
 *
 * Signing out used to end the session and nothing else, so on a shared or
 * borrowed computer the next person opened /trips to someone else's trips,
 * diary and spending — and if they signed in, the sync merged any of those
 * trips not yet in the cloud into THEIR account.
 */

/** Personal keys outside the trips store and per-trip records. */
const PERSONAL_KEYS = ["seasons-passport", "seasons-draft"];
/** Cached nearby lookups — keyed by where the traveler stood. */
const PERSONAL_PREFIXES = ["seasons-nearby:"];

/**
 * Push everything on this device to the account, the same way the regular
 * sync does (last write wins, so a newer edit from another device isn't
 * overwritten). Returns false if anything couldn't be read or written — the
 * caller must then not clear the device without asking.
 */
export async function flushToCloud(userId: string): Promise<boolean> {
  const local = getSavedTrips() as SavedTrip[];
  if (local.length === 0) return true;

  const remote = await fetchRemoteTripsOrNull();
  if (!remote) return false;
  let ok = true;
  const { toPush } = mergeTrips(local, remote);
  for (const t of toPush) ok = (await upsertRemoteTrip(userId, t)) && ok;

  for (const trip of local) {
    for (const entity of ALL_TRIP_ENTITIES) {
      const localRows = loadRecordsRaw(entity, trip.id);
      if (localRows.length === 0) continue;
      const remoteRows = await fetchRemoteRecordsOrNull(trip.id, entity);
      if (!remoteRows) {
        ok = false;
        continue;
      }
      const { toPush: rows } = mergeRecords(localRows, remoteRows);
      ok = (await pushRecords(userId, trip.id, entity, rows)) && ok;
    }
  }
  return ok;
}

/** Receipt photos held on this device for a later scan. They exist only
 *  here — they're never uploaded — so clearing them loses them. */
export async function heldReceiptCount(): Promise<number> {
  let n = 0;
  for (const trip of getSavedTrips()) {
    try {
      n += (await listQueue(trip.id)).length;
    } catch {
      // IndexedDB unavailable: there's nothing held to lose.
    }
  }
  return n;
}

/** Take every trace of the signed-in traveler off this device. */
export async function clearLocalUserData(): Promise<void> {
  for (const trip of getSavedTrips()) {
    for (const entity of ALL_TRIP_ENTITIES) clearRecords(entity, trip.id);
    // Not a trip-record: held photos live in IndexedDB.
    await clearQueue(trip.id).catch(() => {});
  }
  try {
    localStorage.removeItem(SAVED_TRIPS_KEY);
    for (const key of PERSONAL_KEYS) localStorage.removeItem(key);
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && PERSONAL_PREFIXES.some((p) => key.startsWith(p))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Storage blocked: there was nothing stored to leave behind.
  }
  setActiveTripId(null);
  notifySavedTripsChanged();
}
