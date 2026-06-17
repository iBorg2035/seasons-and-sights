"use client";

import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { publishShare } from "@/lib/supabase/trips";

/**
 * Publishes the current trip to a public short link. Only rendered when the
 * backend is configured; the planner's "Copy link" still covers URL sharing.
 */
export function ShareTripButton({
  trip,
}: {
  trip: { name: string; start: number; stops: [string, number][] };
}) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">(
    "idle"
  );

  if (!isSupabaseConfigured) return null;

  async function share() {
    if (!trip.stops.length) return;
    setState("working");
    const token = await publishShare(trip);
    if (!token) {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
      return;
    }
    const url = `${window.location.origin}/trip/${token}`;
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
