/**
 * Per-trip "which of these did I tick" state, over trip-records.
 *
 * Two lists want exactly this — the pre-departure checklist and the packing
 * list — so the store is written once. A tick is a record with an id and no
 * payload: being present IS the state. That makes per-item last-write-wins the
 * right merge rule, and it means unticking has to write a tombstone rather than
 * dropping the row, or the other device's older tick wins and the item comes
 * back checked.
 */

import {
  deleteRecord,
  loadRecords,
  loadRecordsRaw,
  upsertRecord,
  type TripRecord,
} from "@/lib/trip-records";

export type Tick = TripRecord;

/** The ticked keys for one entity on one trip. */
export function loadTickSet(entity: string, tripId: string): Set<string> {
  return new Set(loadRecords<Tick>(entity, tripId).map((r) => r.id));
}

/** Tick or untick one item. */
export function setTickIn(
  entity: string,
  tripId: string,
  key: string,
  on: boolean
): boolean {
  return on
    ? upsertRecord<Tick>(entity, tripId, { id: key })
    : deleteRecord(entity, tripId, key);
}

/** Every row including tombstones — for sync and data export. */
export function loadTickRows(entity: string, tripId: string): Tick[] {
  return loadRecordsRaw<Tick>(entity, tripId);
}
