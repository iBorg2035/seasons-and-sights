import { getSavedTrips } from "@/lib/saved-trips";
import { listEntries, type JournalEntry } from "@/lib/journal";
import { listExpenses, type Expense } from "@/lib/expenses";

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
}

export function buildExportPayload(now: Date = new Date()): ExportPayload {
  const trips = getSavedTrips();
  const journal: Record<string, JournalEntry[]> = {};
  const expenses: Record<string, Expense[]> = {};

  for (const trip of trips) {
    const entries = listEntries(trip.id);
    if (entries.length) journal[trip.id] = entries;
    const spend = listExpenses(trip.id);
    if (spend.length) expenses[trip.id] = spend;
  }

  return { exportedAt: now.toISOString(), trips, journal, expenses };
}
