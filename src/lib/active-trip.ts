import { getSavedTrips } from "@/lib/saved-trips";

export const ACTIVE_TRIP_KEY = "seasons-active-trip-id";
export const ACTIVE_TRIP_EVENT = "seasons-active-trip-change";

/** The id of the trip the user is currently editing. Null if none chosen. */
export function getActiveTripId(): string | null {
  try {
    const v = localStorage.getItem(ACTIVE_TRIP_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Set the active trip and broadcast so open views (nav badge, trip page) refresh. */
export function setActiveTripId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_TRIP_KEY, id);
    else localStorage.removeItem(ACTIVE_TRIP_KEY);
  } catch {
    // ignore blocked storage
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACTIVE_TRIP_EVENT));
  }
}

/**
 * Return a valid active-trip id, repairing the pointer if it points at a
 * deleted/missing trip and saved trips exist to fall back to: in that case the
 * pointer is repointed to the newest saved trip. When there are no saved trips
 * at all there is nothing to repair toward, so the current pointer (possibly
 * null) is returned untouched.
 */
export function ensureActiveTripId(): string | null {
  const current = getActiveTripId();
  const trips = getSavedTrips();
  // Pointer already references an existing trip — keep it.
  if (current && trips.some((t) => t.id === current)) return current;
  // Nothing to fall back to — leave the pointer as-is.
  if (trips.length === 0) return current;
  // Stale (or missing) pointer with saved trips available: repoint to the
  // newest by updatedAt. (getSavedTrips returns storage order, not sorted, so
  // we compute the max defensively.)
  const newest = trips.reduce((a, b) =>
    (b.updatedAt ?? 0) > (a.updatedAt ?? 0) ? b : a
  ).id;
  setActiveTripId(newest);
  return newest;
}
