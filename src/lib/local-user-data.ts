"use client";

import {
  SAVED_TRIPS_KEY,
  getSavedTrips,
  notifySavedTripsChanged,
} from "@/lib/saved-trips";
import { setActiveTripId } from "@/lib/active-trip";
import {
  clearRecords,
  loadRecordsRaw,
  mergeRecords,
  notifyTripRecordsChanged,
  recordsKey,
} from "@/lib/trip-records";
import { ALL_TRIP_ENTITIES } from "@/lib/trip-entities";
import { migrateLegacyTicks } from "@/lib/checklist-progress";
import { clearAllQueues, clearQueue, listQueue } from "@/lib/receipt-queue";
import { endSessionEpoch } from "@/lib/session-epoch";
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
/** Older names for the checklist ticks, from before they were per-trip
 *  records: one bare key, then one keyed by the trip's region ids. */
const LEGACY_KEYS = ["seasons-checklist"];
/**
 * Removed by prefix rather than per trip in the list: a trip deleted from the
 * calendar, a corrupt trips list, or a pre-records checklist key all leave
 * records whose trip id the list no longer knows. Cached nearby lookups are
 * keyed by where the traveler stood.
 */
const PERSONAL_PREFIXES = [
  "seasons-nearby:",
  "seasons-checklist:",
  ...ALL_TRIP_ENTITIES.map((entity) => recordsKey(entity, "")),
];

/**
 * Push everything on this device to the account, the same way the regular
 * sync does (last write wins, so a newer edit from another device isn't
 * overwritten). Returns false if anything couldn't be read or written — the
 * caller must then not clear the device without asking. Never throws: an
 * unexpected error is reported as "not synced" so the caller still asks.
 */
export async function flushToCloud(userId: string): Promise<boolean> {
  try {
    return await flush(userId);
  } catch (e) {
    console.warn("[local-user-data] flush failed:", e);
    return false;
  }
}

async function flush(userId: string): Promise<boolean> {
  const local = getSavedTrips() as SavedTrip[];
  if (local.length === 0) return true;

  const remote = await fetchRemoteTripsOrNull();
  if (!remote) return false;
  const remoteIds = new Set(remote.map((t) => t.id));

  // A trip carrying an ownerId came from the cloud at some point. If the cloud
  // no longer has it, it was deleted elsewhere or this user lost access (or
  // it's a previous account's leftover): pushing it — or its diary and
  // spending — would resurrect it, or file another account's data under this
  // one. Only trips the cloud still has, plus never-synced local ones, go up.
  const pushable = local.filter((t) => remoteIds.has(t.id) || !t.ownerId);

  let ok = true;
  const { toPush } = mergeTrips(pushable, remote);
  for (const t of toPush) ok = (await upsertRemoteTrip(userId, t)) && ok;

  for (const trip of pushable) {
    // The checklist's pre-July-28 format is a bare string[] under the same
    // key; convert it before reading, or the rows have no id or timestamp.
    migrateLegacyTicks(trip.id);
    for (const entity of ALL_TRIP_ENTITIES) {
      const localRows = loadRecordsRaw(entity, trip.id).filter(isWellFormed);
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

/** A row the cloud can take: anything else would throw in toRow. */
function isWellFormed(r: unknown): r is { id: string; updatedAt: number } {
  if (!r || typeof r !== "object") return false;
  const { id, updatedAt } = r as { id?: unknown; updatedAt?: unknown };
  return typeof id === "string" && Number.isFinite(updatedAt);
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

/**
 * Everything one trip holds on this device: its records and its held receipt
 * photos. Every path that deletes a trip calls this, so none of them can leave
 * a diary or photos behind under a trip id nothing lists any more.
 */
export function clearTripData(tripId: string): void {
  for (const entity of ALL_TRIP_ENTITIES) clearRecords(entity, tripId);
  // Not a trip-record: held photos live in IndexedDB.
  void clearQueue(tripId).catch(() => {});
}

/** Take every trace of the signed-in traveler off this device. */
export async function clearLocalUserData(): Promise<void> {
  // First, so a sync still in flight can't write the account back afterwards.
  endSessionEpoch();
  // Storage before IndexedDB: the synchronous part can't hang, and must
  // happen even if the photo store never answers.
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && PERSONAL_PREFIXES.some((p) => key.startsWith(p))) {
        doomed.push(key);
      }
    }
    // Collected first: removing while indexing can skip keys.
    for (const key of doomed) localStorage.removeItem(key);
    for (const key of [SAVED_TRIPS_KEY, ...PERSONAL_KEYS, ...LEGACY_KEYS]) {
      localStorage.removeItem(key);
    }
  } catch {
    // Storage blocked: there was nothing stored to leave behind.
  }
  setActiveTripId(null);
  notifyTripRecordsChanged();
  notifySavedTripsChanged();
  await clearAllQueues().catch(() => {});
}
