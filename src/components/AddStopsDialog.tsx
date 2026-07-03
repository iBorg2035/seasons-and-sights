"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { REGIONS_SLIM } from "@/data/regions-slim";
import { CONTINENT_ORDER } from "@/lib/continents";
import type { Continent } from "@/types";
import type { SlimRegion } from "@/data/regions-slim";

/**
 * Destination-picker modal. Lets the user add destinations to the trip without
 * leaving the trip page — a search-filterable, continent-grouped list of all
 * regions. Regions already in the trip are shown as selected and can't be
 * re-added. Confirming appends the picked regions to the trip's stops.
 */
export function AddStopsDialog({
  existingIds,
  onClose,
  onAdd,
}: {
  /** Region ids already in the trip (excluded from selection). */
  existingIds: string[];
  onClose: () => void;
  /** Called with the ids the user picked (in the order shown). */
  onAdd: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // Close on Escape, lock background scroll.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const existing = useMemo(() => new Set(existingIds), [existingIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return REGIONS_SLIM;
    return REGIONS_SLIM.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q) ||
        r.continent.toLowerCase().includes(q)
    );
  }, [query]);

  // Group the filtered results by continent, in the canonical order.
  const grouped = useMemo(() => {
    const byContinent = new Map<Continent, SlimRegion[]>();
    for (const r of filtered) {
      const arr = byContinent.get(r.continent) ?? [];
      arr.push(r);
      byContinent.set(r.continent, arr);
    }
    // Preserve canonical continent order (CONTINENT_ORDER already covers all
    // valid continents, so no need to append stragglers).
    return CONTINENT_ORDER.filter((c) => byContinent.has(c)).map((c) => ({
      continent: c,
      regions: byContinent.get(c) ?? [],
    }));
  }, [filtered]);

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    // Preserve the displayed order ( continent order, then REGIONS_SLIM order).
    const ordered = filtered.map((r) => r.id).filter((id) => picked.has(id));
    onAdd(ordered);
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[3000] overflow-y-auto bg-black/40"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add destinations"
          className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h2 className="text-base font-semibold text-slate-900">
              Add destinations
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-slate-400 transition hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          <div className="border-b border-slate-100 px-5 py-3">
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a place, country, or region…"
              aria-label="Search destinations"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-3">
            {grouped.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No destinations match &ldquo;{query}&rdquo;.
              </p>
            ) : (
              grouped.map((g) => (
                <div key={g.continent} className="mb-4 last:mb-0">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {g.continent}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.regions.map((r) => {
                      const isExisting = existing.has(r.id);
                      const isPicked = picked.has(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          disabled={isExisting}
                          onClick={() => toggle(r.id)}
                          aria-pressed={isPicked}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                            isExisting
                              ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
                              : isPicked
                                ? "border-amber-300 bg-amber-100 text-amber-800"
                                : "border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50"
                          }`}
                          title={
                            isExisting ? "Already in your trip" : r.country
                          }
                        >
                          {isExisting && "✓ "}
                          {r.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <span className="text-xs text-slate-500">
              {picked.size > 0
                ? `${picked.size} selected`
                : "Tap destinations to select"}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={picked.size === 0}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-40"
              >
                Add {picked.size > 0 ? picked.size : ""}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
