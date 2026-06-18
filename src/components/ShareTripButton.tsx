"use client";

import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { publishShare } from "@/lib/supabase/trips";

/**
 * One share control for the whole trip. When the backend is configured it
 * publishes a short, read-only /trip/<token> link; otherwise it falls back to
 * copying the current URL (which encodes the trip in its query string).
 */
export function ShareTripButton({
  trip,
}: {
  trip: { name: string; start: number; stops: [string, number][] };
}) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">(
    "idle"
  );

  async function share() {
    if (!trip.stops.length) return;
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
      // Clipboard may be blocked; the link still works.
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
    <button
      onClick={share}
      disabled={state === "working" || !trip.stops.length}
      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
      title="Create a shareable link to this trip"
    >
      🔗 {label}
    </button>
  );
}
