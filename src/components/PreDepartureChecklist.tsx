"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Region } from "@/types";
import { buildChecklistItems } from "@/lib/checklist";
import { loadTicks, setTick } from "@/lib/checklist-progress";
import { TRIP_RECORDS_EVENT } from "@/lib/trip-records";

export function PreDepartureChecklist({
  tripId,
  regions,
}: {
  tripId: string;
  regions: Region[];
}) {
  const items = useMemo(() => buildChecklistItems(regions), [regions]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  // Progress is scoped to this trip (by id), so ticking an item on one trip
  // doesn't show up checked on another — even two trips with identical stops.
  const reload = useCallback(() => {
    setDone(loadTicks(tripId));
    setReady(true);
  }, [tripId]);

  // Reload on trip change AND whenever records change, so a tick pulled down
  // from another device appears without a refresh — same subscription the
  // journal and reservations use.
  useEffect(() => {
    setReady(false);
    reload();
    window.addEventListener(TRIP_RECORDS_EVENT, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(TRIP_RECORDS_EVENT, reload);
      window.removeEventListener("storage", reload);
    };
  }, [reload]);

  function toggle(key: string) {
    // Write first, then read back, rather than toggling local state and
    // persisting inside the updater: unticking is a tombstone, not a removal,
    // so storage is the only thing that knows the real post-write state.
    setTick(tripId, key, !done.has(key));
    reload();
  }

  const completed = items.filter((i) => done.has(i.key)).length;
  const pct = Math.round((completed / items.length) * 100);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900">Before you go</h3>
        <span className="text-xs font-medium text-slate-500">
          {ready ? `${completed} of ${items.length} done` : "…"}
        </span>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${ready ? pct : 0}%` }}
        />
      </div>
      <ul className="space-y-1">
        {items.map((item) => {
          const checked = done.has(item.key);
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => toggle(item.key)}
                aria-pressed={checked}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50"
              >
                <span
                  className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border text-[11px] ${
                    checked
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-300 text-transparent"
                  }`}
                  aria-hidden
                >
                  ✓
                </span>
                <span aria-hidden>{item.icon}</span>
                <span
                  className={`text-sm ${
                    checked ? "text-slate-400 line-through" : "text-slate-700"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
