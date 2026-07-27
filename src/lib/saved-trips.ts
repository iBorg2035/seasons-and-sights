import type { SightType } from "@/types";

// Named trips the user has saved. The single source of truth for a user's
// trips, read/written by the trips list, trip page, calendar, and nav badge,
// kept in sync across views via SAVED_TRIPS_EVENT.
export const SAVED_TRIPS_KEY = "seasons-saved-trips";
export const SAVED_TRIPS_EVENT = "seasons-saved-trips-change";

/**
 * A calendar day, "YYYY-MM-DD", in local wall-clock terms. Deliberately a
 * string rather than a Date or epoch ms: it round-trips through localStorage
 * and the Supabase `data` jsonb column unchanged, and it carries no timezone,
 * which is right for "I arrive on the 3rd" regardless of where you book it.
 */
export type DayStamp = string;

/**
 * A committed stay. `end` is EXCLUSIVE — the day you leave — matching the
 * half-open convention `legDateRanges`, `findActiveLeg` and `buildIcs`
 * already use, so booked ranges drop into those consumers unchanged.
 */
export interface BookedRange {
  start: DayStamp;
  end: DayStamp;
}

export interface SavedTripLite {
  id: string;
  /** Remote owner id for cloud-synced/shared trips. Local-only trips omit it. */
  ownerId?: string;
  name: string;
  start: number;
  stops: [string, number][];
  /** Sight types the traveler is excited about on this trip (e.g. beach,
   *  wildlife); feeds the optional interest-fit dimension in trip-health.ts. */
  interests?: SightType[];
  /**
   * "planning" (the default when absent) keeps the month-granularity model:
   * a start month plus whole-month stays, with dates derived for display.
   * "booked" means the stays below are committed real dates.
   *
   * An explicit flag rather than inferring from whether dates exist — otherwise
   * "I cleared my last date" and "I switched back to planning" are the same
   * state, and a partially-dated trip flickers between modes as you type.
   */
  mode?: "planning" | "booked";
  /**
   * Committed stays, index-aligned with `stops`; null where a stop isn't dated
   * yet (partial booking is normal). INVARIANT: when present, this has the
   * same length as `stops` — `updateTrip` re-establishes that after every
   * mutation, so a caller that splices `stops` can't silently desync them.
   */
  bookedDates?: (BookedRange | null)[];
  updatedAt?: number;
}

/** Whether a trip's stays are committed dates rather than a month-based plan. */
export function isBooked(trip: Pick<SavedTripLite, "mode">): boolean {
  return trip.mode === "booked";
}

export function getSavedTrips(): SavedTripLite[] {
  try {
    const arr = JSON.parse(localStorage.getItem(SAVED_TRIPS_KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** Broadcast that the saved-trips list changed, so open views (nav badge,
 *  trips list, trip page) refresh without a reload. */
export function notifySavedTripsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SAVED_TRIPS_EVENT));
  }
}

function writeSavedTrips(next: SavedTripLite[]): boolean {
  try {
    localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(next));
    notifySavedTripsChanged();
    return true;
  } catch {
    return false;
  }
}

/** Remove a saved trip locally. Callers handle any cloud-side delete. */
export function deleteSavedTrip(id: string): boolean {
  return writeSavedTrips(getSavedTrips().filter((t) => t.id !== id));
}

/** Rename a saved trip locally (bumps updatedAt so cloud last-write-wins picks
 *  it up). Returns the updated trip for callers that mirror it to the cloud. */
export function renameSavedTrip(
  id: string,
  name: string
): SavedTripLite | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  let renamed: SavedTripLite | null = null;
  const next = getSavedTrips().map((t) => {
    if (t.id !== id) return t;
    renamed = { ...t, name: trimmed, updatedAt: Date.now() };
    return renamed;
  });
  if (!renamed || !writeSavedTrips(next)) return null;
  return renamed;
}

/** Create a fresh trip, persist it, and return it only after it sticks. */
export function createTrip(
  name = "Untitled trip",
  initial: Partial<
    Pick<SavedTripLite, "start" | "stops" | "interests" | "mode" | "bookedDates">
  > = {}
): SavedTripLite | null {
  const trip: SavedTripLite = {
    id: crypto.randomUUID(),
    name,
    start: initial.start ?? 0, // 0 = unset; the trip page falls back to the current month
    stops: initial.stops?.map((s) => [s[0], s[1]] as [string, number]) ?? [],
    updatedAt: Date.now(),
  };
  // Only set when actually provided, so a plain trip stays the same shape it
  // has always had — nothing downstream has to cope with new empty fields.
  if (initial.interests?.length) trip.interests = [...initial.interests];
  if (initial.mode) trip.mode = initial.mode;
  if (initial.bookedDates?.some((d) => d != null)) {
    trip.bookedDates = Array.from(
      { length: trip.stops.length },
      (_, k) => initial.bookedDates?.[k] ?? null
    );
  }
  const next = [trip, ...getSavedTrips()];
  if (!writeSavedTrips(next)) return null;
  return trip;
}

/**
 * Move a stop, carrying its committed date with it. Use this rather than
 * splicing `stops` directly: `bookedDates` is index-aligned, so a bare
 * reorder would leave every date attached to the wrong destination.
 * Call inside an `updateTrip` mutation.
 */
export function moveStop(trip: SavedTripLite, from: number, to: number): void {
  const n = trip.stops.length;
  if (from === to || from < 0 || to < 0 || from >= n || to >= n) return;
  const [stop] = trip.stops.splice(from, 1);
  trip.stops.splice(to, 0, stop);
  if (trip.bookedDates) {
    const [date] = trip.bookedDates.splice(from, 1);
    trip.bookedDates.splice(to, 0, date ?? null);
  }
}

/**
 * Set (or clear, with null) one stop's committed dates, materialising the
 * index-aligned array first so callers never build it by hand. Clearing the
 * last remaining date drops the array entirely, via updateTrip's normalise.
 * Call inside an `updateTrip` mutation.
 */
export function setStopDates(
  trip: SavedTripLite,
  index: number,
  range: BookedRange | null
): void {
  if (index < 0 || index >= trip.stops.length) return;
  const next: (BookedRange | null)[] = Array.from(
    { length: trip.stops.length },
    (_, k) => trip.bookedDates?.[k] ?? null
  );
  next[index] = range;
  trip.bookedDates = next;
}

/** Remove a stop and its committed date together. See moveStop. */
export function removeStopAt(trip: SavedTripLite, index: number): void {
  if (index < 0 || index >= trip.stops.length) return;
  trip.stops.splice(index, 1);
  trip.bookedDates?.splice(index, 1);
}

/** Fetch a single trip by id (undefined if missing). */
export function getTrip(id: string): SavedTripLite | undefined {
  return getSavedTrips().find((t) => t.id === id);
}

/**
 * Apply a mutation to a trip in place. Bumps `updatedAt` so cloud
 * last-write-wins picks up the edit. No-op (returns false) if the id is gone.
 * Does NOT auto-sync to the cloud — callers mirror remote if signed in.
 */
/**
 * Apply an edit in memory, with the same invariants updateTrip enforces but
 * no storage write — the working copy behind the trip page's explicit Save.
 *
 * Deliberately does NOT stamp `updatedAt`: that marks when the trip was
 * *saved*, and stamping it per keystroke would also make every draft differ
 * from its saved copy, so nothing could tell whether there were real changes.
 */
export function editedTrip(
  trip: SavedTripLite,
  mutate: (trip: SavedTripLite) => void
): SavedTripLite {
  const next = structuredClone(trip);
  mutate(next);
  normalizeBookedDates(next);
  return next;
}

/** Commit a working copy, stamping the save time for last-write-wins sync. */
export function saveTrip(trip: SavedTripLite): boolean {
  const trips = getSavedTrips();
  const i = trips.findIndex((t) => t.id === trip.id);
  if (i === -1) return false;
  trips[i] = { ...structuredClone(trip), updatedAt: Date.now() };
  return writeSavedTrips(trips);
}

/** Whether a working copy differs from its saved counterpart, ignoring the
 *  save timestamp (which only moves when something is actually saved). */
export function hasUnsavedChanges(
  draft: SavedTripLite,
  saved: SavedTripLite
): boolean {
  const strip = ({ updatedAt: _drop, ...rest }: SavedTripLite) => rest;
  return JSON.stringify(strip(draft)) !== JSON.stringify(strip(saved));
}

export function updateTrip(
  id: string,
  mutate: (trip: SavedTripLite) => void
): boolean {
  const trips = getSavedTrips();
  const i = trips.findIndex((t) => t.id === id);
  if (i === -1) return false;
  mutate(trips[i]);
  normalizeBookedDates(trips[i]);
  trips[i].updatedAt = Date.now();
  return writeSavedTrips(trips);
}

/**
 * Re-establish the stops/bookedDates length invariant after any mutation, so
 * a caller that pushes or splices `stops` can't leave the two arrays
 * misaligned. Callers that reorder or remove a stop must move the matching
 * date themselves — this only guarantees the *length*, since it can't know
 * which date a removed stop owned.
 *
 * Also drops the array entirely when it holds no dates, so a trip that never
 * used booked mode doesn't accumulate a meaningless array of nulls in
 * localStorage and the synced payload.
 */
function normalizeBookedDates(trip: SavedTripLite): void {
  if (!trip.bookedDates) return;
  const n = trip.stops.length;
  if (trip.bookedDates.length !== n) {
    const next: (BookedRange | null)[] = Array.from(
      { length: n },
      (_, k) => trip.bookedDates?.[k] ?? null
    );
    trip.bookedDates = next;
  }
  if (trip.bookedDates.every((d) => d == null)) {
    delete trip.bookedDates;
  }
}
