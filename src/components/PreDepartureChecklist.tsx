"use client";

import { useEffect, useMemo, useState } from "react";
import type { Region } from "@/types";

const KEY = "seasons-checklist";

interface Item {
  key: string;
  icon: string;
  label: string;
}

/** Build a trip-specific prep list from the destinations' essentials data. */
function buildItems(regions: Region[]): Item[] {
  const items: Item[] = [
    { key: "passport", icon: "🛂", label: "Passport valid 6+ months beyond your return date" },
    { key: "insurance", icon: "🛡️", label: "Travel insurance arranged" },
    { key: "copies", icon: "📄", label: "Photos/copies of passport, cards & bookings (offline + cloud)" },
    { key: "bank", icon: "💳", label: "Tell your bank & phone carrier you're travelling" },
  ];

  // Visas / eVisas for any destination that isn't visa-free.
  const needVisa = uniq(
    regions
      .filter((r) => r.info && !/^visa-free/i.test(r.info.visa.trim()))
      .map((r) => r.country)
  );
  if (needVisa.length) {
    items.push({
      key: "visas",
      icon: "📝",
      label: `Sort visas / eVisas: ${needVisa.join(", ")}`,
    });
  }

  // Health prep — surface any flagged risks across the trip.
  const flags = uniq(
    regions.flatMap((r) => {
      const t = `${r.info?.health ?? ""}`.toLowerCase();
      const f: string[] = [];
      if (t.includes("malaria")) f.push("malaria");
      if (t.includes("yellow fever")) f.push("yellow fever");
      if (t.includes("dengue")) f.push("dengue");
      if (t.includes("altitude")) f.push("altitude");
      return f;
    })
  );
  items.push({
    key: "health",
    icon: "💉",
    label: flags.length
      ? `Check vaccinations & meds (${flags.join(", ")})`
      : "Check routine vaccinations are up to date",
  });

  // Power adapters — list the distinct plug notes on the route.
  const plugs = uniq(regions.map((r) => r.info?.plugs).filter(Boolean) as string[]);
  if (plugs.length) {
    items.push({
      key: "adapters",
      icon: "🔌",
      label: `Pack power adapters — ${plugs.join(" · ")}`,
    });
  }

  // Cash & cards for each currency on the trip.
  const codes = uniq(
    regions
      .map((r) => r.info?.currency?.match(/\(([A-Z]{3})\)/)?.[1])
      .filter(Boolean) as string[]
  );
  if (codes.length) {
    items.push({
      key: "cash",
      icon: "💱",
      label: `Cash / cards for: ${codes.join(", ")}`,
    });
  }

  items.push(
    { key: "esim", icon: "📶", label: "Sort an eSIM or local SIM for data" },
    { key: "offline", icon: "📴", label: "Download offline maps & save this app for offline use" },
  );

  return items;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function PreDepartureChecklist({ regions }: { regions: Region[] }) {
  const items = useMemo(() => buildItems(regions), [regions]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setDone(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify([...done]));
  }, [done, ready]);

  function toggle(key: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
