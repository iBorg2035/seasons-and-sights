// Named trips the user has saved. The single source of truth for a user's
// trips, read/written by the trips list, trip page, calendar, and nav badge,
// kept in sync across views via SAVED_TRIPS_EVENT.
export const SAVED_TRIPS_KEY = "seasons-saved-trips";
export const SAVED_TRIPS_EVENT = "seasons-saved-trips-change";

export interface SavedTripLite {
  id: string;
  name: string;
  start: number;
  stops: [string, number][];
  updatedAt?: number;
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

/** Create a fresh empty trip, persist it, and return it. */
export function createTrip(name = "Untitled trip"): SavedTripLite {
  const trip: SavedTripLite = {
    id: crypto.randomUUID(),
    name,
    start: 0, // 0 = unset; the trip page falls back to the current month
    stops: [],
    updatedAt: Date.now(),
  };
  const next = [trip, ...getSavedTrips()];
  writeSavedTrips(next);
  return trip;
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
export function updateTrip(
  id: string,
  mutate: (trip: SavedTripLite) => void
): boolean {
  const trips = getSavedTrips();
  const i = trips.findIndex((t) => t.id === id);
  if (i === -1) return false;
  mutate(trips[i]);
  trips[i].updatedAt = Date.now();
  return writeSavedTrips(trips);
}
