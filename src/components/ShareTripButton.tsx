"use client";

import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { publishShare } from "@/lib/supabase/trips";
import type { SavedTripLite } from "@/lib/saved-trips";

/**
 * One share control for the whole trip. When the backend is configured it
 * publishes a short, read-only /trip/<token> link; otherwise it falls back to
 * copying the current URL (which encodes the trip in its query string).
 */
export function ShareTripButton({
  trip,
}: {
  /**
   * Derived from SavedTripLite rather than re-listed field by field: an
   * enumerated shape is how `interests` silently stopped being shared, so
   * anything added to the trip has to be dealt with here explicitly.
   */
  trip: Pick<
    SavedTripLite,
    "id" | "name" | "start" | "stops" | "interests" | "mode" | "bookedDates"
  >;
}) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">(
    "idle"
  );
  const [manualUrl, setManualUrl] = useState<string | null>(null);

  async function share() {
    if (!trip.stops.length) return;
    setManualUrl(null);
    let url = window.location.href;
    if (isSupabaseConfigured) {
      setState("working");
      const token = await publishShare(trip);
      if (!token) {
        setState("error");
        setTimeout(() => setState("idle"), 2000);
        return;
      }
      url = `${window.location.origin}/trip/${token}`;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      setManualUrl(url);
      setState("idle");
      return;
    }
    setState("done");
    setTimeout(() => setState("idle"), 2500);
  }

  const label =
    state === "working"
      ? "Sharing…"
      : state === "done"
        ? "Link copied!"
        : state === "error"
          ? "Try again"
          : "Share link";

  return (
    <div className="relative inline-flex">
      <button
        onClick={share}
        disabled={state === "working" || !trip.stops.length}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
        title="Create a shareable link to this trip"
      >
        🔗 {label}
      </button>
      {manualUrl && (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <p className="mb-2 text-xs text-slate-500">
            Copy this link manually:
          </p>
          <input
            readOnly
            value={manualUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700"
          />
        </div>
      )}
    </div>
  );
}
