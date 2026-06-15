"use client";

import { useState, type ReactNode } from "react";
import type { Region } from "@/types";
import { SeasonStrip } from "@/components/SeasonStrip";
import { SeasonBadge } from "@/components/SeasonBadge";
import { BookingCard } from "@/components/BookingCard";
import {
  MONTH_NAMES_LONG,
  bestMonths,
  climateForMonth,
  datesForMonth,
} from "@/lib/season";

export function RegionPlanner({
  region,
  initialMonth,
  weatherSlot,
  mapSlot,
  sightsSlot,
}: {
  region: Region;
  /** Current month from the server, used as the initial selection and "now". */
  initialMonth: number;
  weatherSlot: ReactNode;
  mapSlot: ReactNode;
  sightsSlot: ReactNode;
}) {
  const [month, setMonth] = useState(initialMonth);
  const isNow = month === initialMonth;
  const { season, note } = climateForMonth(region, month);
  const monthName = MONTH_NAMES_LONG[month - 1];
  const { checkin, checkout } = datesForMonth(month);

  return (
    <div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Season calendar</h2>
          <p className="text-sm text-slate-500">
            <span className="font-medium text-slate-700">Best time:</span>{" "}
            {bestMonths(region)}
          </p>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          Tap a month to plan a trip around it.
        </p>

        <SeasonStrip
          region={region}
          selectedMonth={month}
          nowMonth={initialMonth}
          onSelectMonth={setMonth}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{monthName}:</span>
          <SeasonBadge season={season} suffix={isNow ? "now" : undefined} />
          {note && <span>{note}</span>}
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="h-72 w-full">{mapSlot}</div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 font-semibold text-slate-900">Local sights</h2>
            {sightsSlot}
          </section>
        </div>

        <aside className="space-y-6">
          {weatherSlot}
          <BookingCard
            region={region}
            checkin={checkin}
            checkout={checkout}
            monthLabel={monthName}
          />
        </aside>
      </div>
    </div>
  );
}
