"use client";

import { useState } from "react";
import { isBooked, type SavedTripLite } from "@/lib/saved-trips";
import { wouldReorder } from "@/lib/trip-plan";
import { tripSlimLegs } from "@/lib/trip-plan-slim";

/**
 * Switch a trip between month-based planning and committed real dates.
 *
 * Locking in is a confirmed action, not a silent toggle, because committing
 * the plan also adopts the planner's ORDER — it optimises stop sequence for
 * season fit, so "these are my dates" can mean "and my stops moved". The
 * confirm says so, and only mentions reordering when it would actually
 * happen.
 *
 * Going back to planning keeps the dates in storage, so the switch is
 * reversible and re-locking restores what you entered rather than
 * regenerating from the plan.
 */
export function TripModeToggle({
  trip,
  onSwitch,
}: {
  trip: SavedTripLite;
  onSwitch: (mode: "planning" | "booked") => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const booked = isBooked(trip);

  if (trip.stops.length === 0) return null;

  if (booked) {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5">
        <span className="text-sm font-medium text-teal-800">
          📅 Dates locked in
        </span>
        <span className="text-xs text-teal-700">
          Stays use real dates. Season fit still applies.
        </span>
        <button
          type="button"
          onClick={() => onSwitch("planning")}
          className="ml-auto rounded-lg border border-teal-300 bg-white px-3 py-1 text-xs font-medium text-teal-800 transition hover:bg-teal-100"
        >
          Back to planning
        </button>
      </div>
    );
  }

  // Only compute the plan when it's needed for the confirm.
  const reorders = confirming
    ? wouldReorder(trip.stops, tripSlimLegs(trip))
    : false;

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
      {!confirming ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700">
            Planning by month
          </span>
          <span className="text-xs text-slate-500">
            Booked your dates? Lock them in to track the real trip.
          </span>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Lock in dates
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-700">
            Set real arrival and departure dates for each stop, starting from
            the dates this plan suggests. You can edit them afterwards, or
            switch back to planning at any time.
          </p>
          {reorders && (
            <p className="text-sm font-medium text-amber-800">
              This will also reorder your stops into the sequence the planner
              recommends for season fit.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onSwitch("booked");
              }}
              className="rounded-lg bg-sky-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-900"
            >
              Lock in dates
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
