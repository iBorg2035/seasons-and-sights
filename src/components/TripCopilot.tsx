"use client";

import { useState } from "react";
import { AssistantChat } from "@/components/AssistantChat";
import type { TripContextPayload } from "@/lib/assistant/types";
import type { SightType } from "@/types";

export function TripCopilot({
  trip,
}: {
  trip: {
    id: string;
    name: string;
    start: number;
    stops: [string, number][];
    interests?: SightType[];
  };
}) {
  const [open, setOpen] = useState(true);

  const tripContext: TripContextPayload = {
    id: trip.id,
    name: trip.name,
    start: trip.start,
    stops: trip.stops,
    interests: trip.interests,
  };

  return (
    <section
      id="copilot"
      className="scroll-mt-32 rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/80 to-white p-4 dark:border-teal-900 dark:from-teal-950/40 dark:to-zinc-950"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Trip co-pilot
          </h2>
          <p className="text-xs text-slate-500">
            Season fit, packing, visas, and route advice for this trip — powered
            by Grok.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-zinc-700 dark:text-slate-200"
          aria-expanded={open}
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open && (
        <AssistantChat tripContext={tripContext} compact className="bg-white/90" />
      )}
    </section>
  );
}
