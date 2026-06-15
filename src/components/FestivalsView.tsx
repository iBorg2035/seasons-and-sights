"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getAllEvents } from "@/data/regions";
import { MONTH_NAMES, MONTH_NAMES_LONG } from "@/lib/season";

type MonthFilter = number | "all";

export function FestivalsView({ initialMonth }: { initialMonth: number }) {
  const [month, setMonth] = useState<MonthFilter>("all");
  const all = useMemo(() => getAllEvents(), []);

  const visible = month === "all" ? all : all.filter((e) => e.event.month === month);

  // Group visible events by month for sectioned display.
  const byMonth = useMemo(() => {
    const map = new Map<number, typeof visible>();
    for (const item of visible) {
      const list = map.get(item.event.month) ?? [];
      list.push(item);
      map.set(item.event.month, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [visible]);

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-1.5">
        <button
          onClick={() => setMonth("all")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            month === "all"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
          }`}
        >
          All year
        </button>
        {MONTH_NAMES.map((label, i) => {
          const value = i + 1;
          const isNow = value === initialMonth;
          return (
            <button
              key={label}
              onClick={() => setMonth(value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                month === value
                  ? "bg-slate-900 text-white"
                  : `bg-white ring-1 ring-slate-200 hover:bg-slate-100 ${
                      isNow ? "text-amber-600" : "text-slate-600"
                    }`
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {byMonth.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No festivals tracked for this month yet.
        </p>
      ) : (
        <div className="space-y-8">
          {byMonth.map(([m, items]) => (
            <section key={m}>
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                {MONTH_NAMES_LONG[m - 1]}
                {m === initialMonth && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    this month
                  </span>
                )}
              </h2>
              <ul className="space-y-3">
                {items.map(({ event, region }) => (
                  <li
                    key={`${region.id}-${event.name}`}
                    className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <span className="text-2xl" aria-hidden>
                      🎉
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900">
                        {event.name}
                      </div>
                      <Link
                        href={`/regions/${region.id}`}
                        className="text-sm font-medium text-amber-600 hover:underline"
                      >
                        {region.name}, {region.country}
                      </Link>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {event.blurb}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
