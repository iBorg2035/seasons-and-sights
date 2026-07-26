/**
 * Storage for per-trip, id-keyed rows — journal entries and expenses today,
 * anything of the same shape later.
 *
 * Both entities are "a row, scoped to a trip, edited on more than one device",
 * so the store, the tombstones and the merge live here once instead of being
 * written per entity. Domain modules (`journal.ts`, `expenses.ts`) own only
 * their own shape.
 */

export const TRIP_RECORDS_EVENT = "seasons-trip-records-change";

/** Tombstones older than this are dropped, so localStorage can't grow forever.
 *  Far beyond any realistic offline gap — a device that hasn't synced in six
 *  months would resurrect rows deleted elsewhere, which is the tradeoff. */
const TOMBSTONE_TTL_MS = 180 * 24 * 60 * 60 * 1000;

export interface TripRecord {
  id: string;
  /** Epoch ms of the last edit; drives last-write-wins on sync. */
  updatedAt: number;
  /** Epoch ms of deletion. Present means this is a tombstone, not a row. */
  deletedAt?: number;
}

/**
 * Keyed by trip id, always. This repo already shipped a cross-trip data leak
 * from a bare global key (the checklist bug), and journal text is the same
 * risk with far more personal content.
 */
export function recordsKey(entity: string, tripId: string): string {
  return `seasons-${entity}:${tripId}`;
}

/** Broadcast that a trip's records changed, so open views refresh. */
export function notifyTripRecordsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TRIP_RECORDS_EVENT));
  }
}

/**
 * Every row for a trip, tombstones included. Sync and data export need the
 * tombstones; the UI wants `loadRecords` instead.
 */
export function loadRecordsRaw<T extends TripRecord>(
  entity: string,
  tripId: string
): T[] {
  try {
    const arr = JSON.parse(localStorage.getItem(recordsKey(entity, tripId)) || "[]");
    return Array.isArray(arr) ? (arr as T[]) : [];
  } catch {
    return [];
  }
}

/** The trip's live rows — tombstones filtered out. */
export function loadRecords<T extends TripRecord>(
  entity: string,
  tripId: string
): T[] {
  return loadRecordsRaw<T>(entity, tripId).filter((r) => !r.deletedAt);
}

/**
 * Write the full row set, expiring old tombstones on the way through. Does not
 * stamp `updatedAt` — callers that are replaying merged or remote rows must
 * keep the timestamps they arrived with, or last-write-wins breaks.
 */
export function saveRecords<T extends TripRecord>(
  entity: string,
  tripId: string,
  rows: T[],
  now: number = Date.now()
): boolean {
  const kept = rows.filter(
    (r) => !r.deletedAt || r.deletedAt > now - TOMBSTONE_TTL_MS
  );
  try {
    localStorage.setItem(recordsKey(entity, tripId), JSON.stringify(kept));
    notifyTripRecordsChanged();
    return true;
  } catch {
    return false;
  }
}

/**
 * Insert or replace one row, stamping `updatedAt` so callers can't forget to.
 * Replaces by id rather than merging fields — a row is small and always
 * written whole, so a partial update would just be a way to lose a field.
 */
export function upsertRecord<T extends TripRecord>(
  entity: string,
  tripId: string,
  row: Omit<T, "updatedAt"> & { updatedAt?: number },
  now: number = Date.now()
): boolean {
  const rows = loadRecordsRaw<T>(entity, tripId).filter((r) => r.id !== row.id);
  rows.push({ ...row, updatedAt: now } as T);
  return saveRecords(entity, tripId, rows, now);
}

/**
 * Delete a row by writing a tombstone in its place.
 *
 * `trips` has no tombstones, and `deleteRemoteTrip` documents the cost: a
 * failed remote delete lets the row reappear on the next merge. For a trip
 * that's rare and visible; for journal rows it would be routine — delete on
 * your phone, open the laptop, and it's back.
 *
 * The tombstone keeps only id/timestamps. Dropping the payload means deleting
 * a diary entry actually discards its text rather than parking it in
 * localStorage indefinitely.
 */
export function deleteRecord(
  entity: string,
  tripId: string,
  id: string,
  now: number = Date.now()
): boolean {
  const rows = loadRecordsRaw(entity, tripId).filter((r) => r.id !== id);
  rows.push({ id, updatedAt: now, deletedAt: now });
  return saveRecords(entity, tripId, rows, now);
}

/** Drop every row for a trip — used when the trip itself is deleted. */
export function clearRecords(entity: string, tripId: string): boolean {
  try {
    localStorage.removeItem(recordsKey(entity, tripId));
    notifyTripRecordsChanged();
    return true;
  } catch {
    return false;
  }
}

/**
 * Union local + remote by id with last-write-wins, mirroring `mergeTrips` in
 * supabase/trips.ts deliberately — same `>=` tie-break, so a timestamp tie
 * keeps the local copy *and* pushes it rather than silently dropping it.
 *
 * Tombstones take part as ordinary rows: a delete that is newer than a remote
 * edit wins, and an edit newer than a delete resurrects the row. That's the
 * same rule applied consistently, not a special case.
 */
export function mergeRecords<T extends TripRecord>(
  local: T[],
  remote: T[]
): { merged: T[]; toPush: T[] } {
  const byId = new Map<string, T>();
  for (const r of remote) byId.set(r.id, r);

  const toPush: T[] = [];
  for (const l of local) {
    const r = byId.get(l.id);
    if (!r || l.updatedAt >= r.updatedAt) {
      byId.set(l.id, l);
      toPush.push(l);
    }
  }

  return { merged: [...byId.values()], toPush };
}
