import { saveDraft } from "@/lib/trip-draft";

// Named trips the user has explicitly saved (distinct from the working draft).
// Kept here so the planner, the Today dashboard, and the nav badge read/write
// one source of truth and stay in sync via SAVED_TRIPS_EVENT.
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
 *  dashboard) refresh without a reload — same pattern as the draft's event. */
export function notifySavedTripsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SAVED_TRIPS_EVENT));
  }
}

/** Load a saved trip into the working draft so the planner and Today view
 *  reflect it immediately (both read the draft). */
export function loadSavedTripToDraft(t: SavedTripLite) {
  saveDraft({
    start: t.start,
    stops: t.stops.map(([id, duration]) => ({ id, duration })),
  });
}
