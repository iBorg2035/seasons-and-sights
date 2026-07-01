"use client";

import { useEffect, useMemo, useState } from "react";
import type { Region } from "@/types";
import { buildChecklistItems, checklistStorageKey } from "@/lib/checklist";

export function PreDepartureChecklist({ regions }: { regions: Region[] }) {
  const items = useMemo(() => buildChecklistItems(regions), [regions]);
  // Progress is scoped to this trip's destinations, so ticking an item on one
  // trip doesn't show up checked on another.
  const storageKey = useMemo(
    () => checklistStorageKey(regions.map((r) => r.id)),
    [regions]
  );
  const [done, setDone] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  // (Re)load this trip's checked state whenever the trip changes.
  useEffect(() => {
    setReady(false);
    let loaded = new Set<string>();
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) loaded = new Set(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
    setDone(loaded);
    setReady(true);
  }, [storageKey]);

  function toggle(key: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      // Persist on toggle (keyed to the current trip) rather than in an effect,
      // so switching trips reloads state without ever writing one trip's ticks
      // under another's key. localStorage writes are idempotent → StrictMode-safe.
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
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
