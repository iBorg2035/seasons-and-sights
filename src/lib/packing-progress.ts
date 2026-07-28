/**
 * Which packing-list items a trip has ticked off.
 *
 * The list itself is derived (region + month → groups of item strings), so
 * there's no id to store against. The key is the region id plus the item text:
 *
 * - Region-scoped, not trip-scoped, because the list is rendered per stop.
 *   Ticking "Rain jacket" under Cusco shouldn't silently tick it under Bangkok,
 *   where it may not even be listed.
 * - NOT month-scoped, deliberately. The list is generated for the month you're
 *   there, so keying by month would wipe every tick the moment you moved the
 *   trip's dates — exactly when you least want to redo it. An item that
 *   disappears from the list keeps a harmless orphaned tick, and gets it back
 *   if the item returns.
 */

import { loadTickRows, loadTickSet, setTickIn, type Tick } from "@/lib/ticks";

export const PACKING_ENTITY = "packing";

export type PackingTick = Tick;

/** Stable key for one item of one stop's list. */
export function packingKey(regionId: string, item: string): string {
  return `${regionId}::${item}`;
}

export function loadPacked(tripId: string): Set<string> {
  return loadTickSet(PACKING_ENTITY, tripId);
}

export function setPacked(
  tripId: string,
  regionId: string,
  item: string,
  on: boolean
): boolean {
  return setTickIn(PACKING_ENTITY, tripId, packingKey(regionId, item), on);
}

/** Every row including tombstones — for sync and data export. */
export function loadPackedRaw(tripId: string): PackingTick[] {
  return loadTickRows(PACKING_ENTITY, tripId);
}
