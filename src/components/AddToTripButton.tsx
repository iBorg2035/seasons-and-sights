"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ensureActiveTripId,
  setActiveTripId,
  ACTIVE_TRIP_EVENT,
} from "@/lib/active-trip";
import { getTrip, createTrip, SAVED_TRIPS_EVENT } from "@/lib/saved-trips";

/**
 * Adds a destination to the active trip and jumps into the trip page with it
 * staged for confirmation. Ensures there's an active trip (creating one if the
 * user has none), so "Add to trip" always has a concrete target — no more
 * silent appends to invisible draft state.
 */
export function AddToTripButton({
  regionId,
  className = "",
}: {
  regionId: string;
  className?: string;
}) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  // Reflect whether this destination is already in the active trip, so the
  // button can show "✓ In your trip" without a page navigation.
  useEffect(() => {
    const sync = () => {
      const id = ensureActiveTripId();
      setAdded(
        !!id && getTrip(id)?.stops.some(([sid]) => sid === regionId) === true
      );
    };
    sync();
    window.addEventListener(ACTIVE_TRIP_EVENT, sync);
    window.addEventListener(SAVED_TRIPS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACTIVE_TRIP_EVENT, sync);
      window.removeEventListener(SAVED_TRIPS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [regionId]);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let id = ensureActiveTripId();
    if (!id || !getTrip(id)) {
      const t = createTrip();
      if (!t) {
        setSaveFailed(true);
        setTimeout(() => setSaveFailed(false), 2500);
        return;
      }
      id = t.id;
    }
    setActiveTripId(id);
    setSaveFailed(false);
    router.push(`/trips/${id}?add=${regionId}`);
  };

  return (
    <button onClick={onClick} aria-pressed={added} className={className}>
      {saveFailed
        ? "Couldn't save"
        : added
          ? "✓ In your trip"
          : "+ Add to trip"}
    </button>
  );
}
