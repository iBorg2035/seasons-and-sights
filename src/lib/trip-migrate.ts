import { getSavedTrips, createTrip, updateTrip } from "@/lib/saved-trips";
import { setActiveTripId } from "@/lib/active-trip";

const MIGRATED_FLAG = "seasons-migrated-v2";

/**
 * One-time upgrade: turn the legacy anonymous "draft" into a named trip so it
 * appears in the trips list. Idempotent via a flag. Safe to call on every load.
 */
export function migrateDraftToTrips(): void {
  try {
    if (localStorage.getItem(MIGRATED_FLAG)) return;
  } catch {
    return;
  }

  let draftStops: [string, number][] = [];
  let draftStart = 0;
  try {
    const d = JSON.parse(localStorage.getItem("seasons-draft") || "{}");
    if (Array.isArray(d.stops)) {
      draftStops = d.stops
        .filter(
          (s: unknown): s is { id: string; duration: number } =>
            typeof s === "object" &&
            s !== null &&
            typeof (s as { id: unknown }).id === "string"
        )
        .map((s: { id: string; duration?: number }) => [
          s.id,
          typeof s.duration === "number" ? s.duration : 2,
        ]);
    }
    if (typeof d.start === "number") draftStart = d.start;
  } catch {
    /* malformed draft — ignore, treat as empty */
  }

  if (draftStops.length > 0) {
    // createTrip gives us an id + name; override start/stops with the draft's.
    const trip = createTrip("Untitled trip");
    const start = draftStart;
    const stops = draftStops;
    updateTrip(trip.id, (t) => {
      t.start = start;
      t.stops = stops;
    });
    setActiveTripId(trip.id);
  } else {
    // No draft: if there are saved trips, point active at the newest; else nothing.
    const existing = getSavedTrips();
    if (existing[0]) setActiveTripId(existing[0].id);
  }

  try {
    localStorage.removeItem("seasons-draft");
    localStorage.setItem(MIGRATED_FLAG, "1");
  } catch {
    /* ignore */
  }
}
