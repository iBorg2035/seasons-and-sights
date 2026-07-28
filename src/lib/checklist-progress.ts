/**
 * Which pre-departure checklist items a trip has ticked off.
 *
 * The checklist was the last per-trip thing still stored as a bare array under
 * its own key, which meant it was the last thing that didn't sync: tick
 * "passport" on your phone and the laptop never heard about it. Journal,
 * expenses and reservations all became trip-records precisely so this wouldn't
 * have to be solved once per entity, so the checklist joins them.
 *
 * One record per ticked item, `id` = the item key. Unticking writes a
 * tombstone rather than dropping the row, so an untick survives the merge
 * instead of the item popping back checked from the other device.
 *
 * There is no payload beyond the id — being present IS the state. That makes
 * last-write-wins exactly right here: the newest device to touch an item wins,
 * per item, so two people packing at once don't clobber each other's ticks.
 */

import {
  deleteRecord,
  loadRecords,
  loadRecordsRaw,
  recordsKey,
  saveRecords,
  upsertRecord,
  type TripRecord,
} from "@/lib/trip-records";

export const CHECKLIST_ENTITY = "checklist";

export type ChecklistTick = TripRecord;

/**
 * Convert the legacy `string[]` of ticked keys into records, in place.
 *
 * This matters more than a normal migration because `recordsKey("checklist",
 * id)` is byte-identical to the key the old format already used —
 * `seasons-checklist:<tripId>`. Left alone, `loadRecordsRaw` would happily
 * parse `["passport"]`, hand back strings where records are expected, and the
 * sync would push rows with `id: undefined` to the cloud. Reusing the key is
 * still the right call — it's the honest name, and migrating in place means no
 * orphaned key and no lost ticks — but it has to be converted before anything
 * else reads it.
 *
 * Idempotent and cheap: after the first run the array holds objects, the type
 * check fails, and it does nothing. Returns true if it converted something.
 */
export function migrateLegacyTicks(tripId: string, now = Date.now()): boolean {
  let raw: unknown;
  try {
    const stored = localStorage.getItem(recordsKey(CHECKLIST_ENTITY, tripId));
    if (!stored) return false;
    raw = JSON.parse(stored);
  } catch {
    return false;
  }

  if (!Array.isArray(raw) || raw.length === 0) return false;
  if (!raw.every((v) => typeof v === "string")) return false;

  // Stamped with "now" rather than 0: these ticks are real and should win over
  // an empty cloud, not be treated as ancient and lost on the first merge.
  const rows: ChecklistTick[] = (raw as string[]).map((id) => ({
    id,
    updatedAt: now,
  }));
  return saveRecords(CHECKLIST_ENTITY, tripId, rows, now);
}

/** The ticked item keys for a trip. */
export function loadTicks(tripId: string): Set<string> {
  migrateLegacyTicks(tripId);
  return new Set(
    loadRecords<ChecklistTick>(CHECKLIST_ENTITY, tripId).map((r) => r.id)
  );
}

/** Tick or untick one item. */
export function setTick(tripId: string, key: string, on: boolean): boolean {
  migrateLegacyTicks(tripId);
  return on
    ? upsertRecord<ChecklistTick>(CHECKLIST_ENTITY, tripId, { id: key })
    : deleteRecord(CHECKLIST_ENTITY, tripId, key);
}

/** Every row including tombstones — for sync and data export. */
export function loadTicksRaw(tripId: string): ChecklistTick[] {
  migrateLegacyTicks(tripId);
  return loadRecordsRaw<ChecklistTick>(CHECKLIST_ENTITY, tripId);
}
