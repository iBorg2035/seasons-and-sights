import type { DayStamp } from "@/lib/saved-trips";
import {
  deleteRecord,
  loadRecords,
  upsertRecord,
  type TripRecord,
} from "@/lib/trip-records";

/** Storage entity name — also the localStorage key prefix. */
export const JOURNAL_ENTITY = "journal";

/**
 * Generous enough that no real diary entry hits it (~2,000 words), tight
 * enough that a paste accident can't blow the shared localStorage quota and
 * take the user's trips down with it. Rejected rather than truncated: silently
 * dropping the tail of what someone wrote is worse than refusing the save.
 */
export const MAX_ENTRY_CHARS = 10_000;

export interface JournalEntry extends TripRecord {
  /** The day this entry is about, not when it was written. */
  day: DayStamp;
  text: string;
}

export interface JournalDraft {
  /** Omit to create; pass an existing id to edit in place. */
  id?: string;
  day: DayStamp;
  text: string;
}

/** A trip's entries, newest day first (ties broken by most recently edited). */
export function listEntries(tripId: string): JournalEntry[] {
  return loadRecords<JournalEntry>(JOURNAL_ENTITY, tripId).sort(
    (a, b) => b.day.localeCompare(a.day) || b.updatedAt - a.updatedAt
  );
}

/**
 * Create or update an entry. Returns the saved entry, or null if it was
 * rejected (blank, too long, or storage refused the write) — matching
 * `createTrip`'s null-means-it-didn't-happen contract so the UI can say so
 * instead of pretending the entry was kept.
 */
export function saveEntry(
  tripId: string,
  draft: JournalDraft,
  now: number = Date.now()
): JournalEntry | null {
  const text = draft.text.trim();
  if (!text || text.length > MAX_ENTRY_CHARS) return null;
  if (!draft.day) return null;

  const entry: JournalEntry = {
    id: draft.id || crypto.randomUUID(),
    day: draft.day,
    text,
    updatedAt: now,
  };
  return upsertRecord<JournalEntry>(JOURNAL_ENTITY, tripId, entry, now)
    ? entry
    : null;
}

export function removeEntry(tripId: string, id: string): boolean {
  return deleteRecord(JOURNAL_ENTITY, tripId, id);
}

/** Entries bucketed by day, newest day first — the shape the page renders. */
export function groupByDay(
  entries: JournalEntry[]
): { day: DayStamp; entries: JournalEntry[] }[] {
  const byDay = new Map<DayStamp, JournalEntry[]>();
  for (const e of entries) {
    const bucket = byDay.get(e.day);
    if (bucket) bucket.push(e);
    else byDay.set(e.day, [e]);
  }
  return [...byDay.entries()]
    .map(([day, list]) => ({ day, entries: list }))
    .sort((a, b) => b.day.localeCompare(a.day));
}
