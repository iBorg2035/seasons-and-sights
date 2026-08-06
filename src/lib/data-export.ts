import { getSavedTrips } from "@/lib/saved-trips";
import { listEntries, type JournalEntry } from "@/lib/journal";
import { listExpenses, type Expense } from "@/lib/expenses";
import { listReservations, type Reservation } from "@/lib/reservations";
import { loadTicks } from "@/lib/checklist-progress";
import { loadPacked } from "@/lib/packing-progress";
import { loadRates } from "@/lib/fx";

/**
 * Everything this device holds for the user, in one file.
 *
 * Kept in step with what the app stores: an export that silently omitted
 * journal entries would be worse than no export, since it reads as "this is
 * all of it". Whenever a new per-trip entity is added, it belongs here too.
 *
 * Tombstones are excluded — a deleted entry isn't the user's data any more,
 * and the store already discarded its text.
 */
export interface ExportPayload {
  exportedAt: string;
  trips: ReturnType<typeof getSavedTrips>;
  /** Keyed by trip id; a trip with nothing logged is simply absent. */
  journal: Record<string, JournalEntry[]>;
  expenses: Record<string, Expense[]>;
  reservations: Record<string, Reservation[]>;
  /** Ticked pre-departure checklist item keys, by trip id. */
  checklist: Record<string, string[]>;
  /** Ticked packing-list keys ("<regionId>::<item>"), by trip id. */
  packing: Record<string, string[]>;
  /** Exchange rates the traveller confirmed, as units per USD, by trip id. */
  rates: Record<string, Partial<Record<string, number>>>;
}

export const EXPORT_FILENAME = "seasons-and-sights-data.json";

/**
 * Serialize and download the export. The DOM work lives here rather than in
 * the menu component so it can be tested — otherwise the only thing standing
 * between the user and a silently empty file is untested wiring.
 *
 * Returns false if the payload couldn't be built, so the caller can say so
 * instead of handing over an empty download.
 */
export function downloadExport(now: Date = new Date()): boolean {
  let json: string;
  try {
    json = JSON.stringify(buildExportPayload(now), null, 2);
  } catch {
    return false;
  }

  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = EXPORT_FILENAME;
  // Same handling as the .ics download: Firefox ignores a detached anchor,
  // and revoking synchronously can cancel the download before it starts.
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function buildExportPayload(now: Date = new Date()): ExportPayload {
  const trips = getSavedTrips();
  const journal: Record<string, JournalEntry[]> = {};
  const expenses: Record<string, Expense[]> = {};
  const reservations: Record<string, Reservation[]> = {};
  const checklist: Record<string, string[]> = {};
  const packing: Record<string, string[]> = {};
  const rates: Record<string, Partial<Record<string, number>>> = {};

  for (const trip of trips) {
    const entries = listEntries(trip.id);
    if (entries.length) journal[trip.id] = entries;
    const spend = listExpenses(trip.id);
    if (spend.length) expenses[trip.id] = spend;
    const booked = listReservations(trip.id);
    if (booked.length) reservations[trip.id] = booked;
    const ticked = [...loadTicks(trip.id)];
    if (ticked.length) checklist[trip.id] = ticked;
    const packedItems = [...loadPacked(trip.id)];
    if (packedItems.length) packing[trip.id] = packedItems;
    const tripRates = loadRates(trip.id);
    if (Object.keys(tripRates).length) rates[trip.id] = tripRates;
  }

  return {
    exportedAt: now.toISOString(),
    trips,
    journal,
    expenses,
    reservations,
    checklist,
    packing,
    rates,
  };
}
