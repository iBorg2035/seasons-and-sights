import { getSupabase } from "@/lib/supabase/client";
import { recordSyncResult } from "@/lib/sync-status";
import {
  loadRecordsRaw,
  mergeRecords,
  saveRecords,
  type TripRecord,
} from "@/lib/trip-records";

/**
 * Cloud mirror for per-trip records (journal entries, expenses).
 *
 * The whole path is generic because the local store is: one table, one policy,
 * one merge, and adding a third entity costs nothing here.
 */

interface RecordRow {
  user_id: string;
  trip_id: string;
  entity: string;
  id: string;
  data: Record<string, unknown>;
  updated_at: string;
  deleted_at: string | null;
}

/** What a read returns — RLS already scoped it, so user_id isn't selected. */
type ReadRow = Omit<RecordRow, "user_id">;

/** Same funnel as trips.ts, so the sync badge sees every outcome. */
function reportSync(
  kind: "read" | "write",
  error: { message: string } | null
): boolean {
  if (error) {
    recordSyncResult({ kind, ok: false, message: error.message });
    console.warn(`[trip-records] cloud ${kind} failed:`, error.message);
    return false;
  }
  recordSyncResult({ kind, ok: true });
  return true;
}

/**
 * Split a record into its key columns and its payload. `updatedAt`/`deletedAt`
 * live in real columns so Postgres can order and index on them; everything
 * else rides in `data`.
 */
function toRow<T extends TripRecord>(
  userId: string,
  tripId: string,
  entity: string,
  record: T
): RecordRow {
  const { id, updatedAt, deletedAt, ...rest } = record;
  return {
    user_id: userId,
    trip_id: tripId,
    entity,
    id,
    // A tombstone carries no payload — the local store already dropped it, and
    // it must not be re-added on the way to the cloud.
    data: deletedAt ? {} : (rest as Record<string, unknown>),
    updated_at: new Date(updatedAt).toISOString(),
    deleted_at: deletedAt ? new Date(deletedAt).toISOString() : null,
  };
}

function fromRow<T extends TripRecord>(row: ReadRow): T {
  const record = {
    ...row.data,
    id: row.id,
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : 0,
  } as T;
  if (row.deleted_at) record.deletedAt = Date.parse(row.deleted_at);
  return record;
}

/** Every remote record for one trip+entity, tombstones included. */
export async function fetchRemoteRecords<T extends TripRecord>(
  tripId: string,
  entity: string
): Promise<T[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("trip_records")
    .select("trip_id, entity, id, data, updated_at, deleted_at")
    .eq("trip_id", tripId)
    .eq("entity", entity);
  if (!reportSync("read", error) || !data) return [];
  return (data as ReadRow[]).map((r) => fromRow<T>(r));
}

/** Push records up. Returns whether every row landed. */
export async function pushRecords<T extends TripRecord>(
  userId: string,
  tripId: string,
  entity: string,
  records: T[]
): Promise<boolean> {
  if (records.length === 0) return true;
  const sb = await getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("trip_records").upsert(
    records.map((r) => toRow(userId, tripId, entity, r)),
    { onConflict: "user_id,trip_id,entity,id" }
  );
  return reportSync("write", error);
}

/**
 * Reconcile one trip+entity between this device and the cloud: pull remote,
 * merge last-write-wins against local (tombstones included), write the result
 * back locally, and push whatever the local side won.
 *
 * Returns the merged rows so a caller can refresh without re-reading storage.
 */
export async function syncRecords<T extends TripRecord>(
  userId: string,
  tripId: string,
  entity: string
): Promise<T[]> {
  const remote = await fetchRemoteRecords<T>(tripId, entity);
  const local = loadRecordsRaw<T>(entity, tripId);
  const { merged, toPush } = mergeRecords(local, remote);

  saveRecords(entity, tripId, merged);
  // Outside any React state update, so StrictMode's double-invoke can't
  // double-upload — same reason the trips sync does it this way.
  await pushRecords(userId, tripId, entity, toPush);
  return merged;
}

/**
 * Mirror one local row to the cloud. Fire-and-forget from the UI: the write
 * already succeeded locally, and a failure surfaces on the sync badge rather
 * than blocking the entry.
 */
export async function mirrorRecord<T extends TripRecord>(
  userId: string,
  tripId: string,
  entity: string,
  id: string
): Promise<boolean> {
  const row = loadRecordsRaw<T>(entity, tripId).find((r) => r.id === id);
  if (!row) return false;
  return pushRecords(userId, tripId, entity, [row]);
}

/**
 * Delete every remote record for a trip — called when the trip itself is
 * deleted. Hard delete rather than tombstones: the trip is gone, so there's
 * nothing left for a tombstone to protect against resurrecting into.
 */
export async function deleteRemoteRecords(tripId: string): Promise<boolean> {
  const sb = await getSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("trip_records")
    .delete()
    .eq("trip_id", tripId);
  return reportSync("write", error);
}
