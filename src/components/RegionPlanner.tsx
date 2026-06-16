"use client";

import { useState, type ReactNode } from "react";
import type { Region } from "@/types";
import { SeasonStrip } from "@/components/SeasonStrip";
import { SeasonBadge } from "@/components/SeasonBadge";
import { CrowdStrip } from "@/components/CrowdStrip";
import { ClimateChart } from "@/components/ClimateChart";
import { PackingList } from "@/components/PackingList";
import { BookingCard } from "@/components/BookingCard";
import {
  CROWD_META,
  MONTH_NAMES,
  MONTH_NAMES_LONG,
  bestMonths,
  climateForMonth,
  crowdForMonth,
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
  const crowdMeta = CROWD_META[crowdForMonth(region, month)];
  const monthName = MONTH_NAMES_LONG[month - 1];
  const { checkin, checkout } = datesForMonth(month);

  const events = region.events ?? [];
  const eventMonths = events.map((e) => e.month);
  const monthEvents = events.filter((e) => e.month === month);
  const sortedEvents = [...events].sort((a, b) => a.month - b.month);

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
          eventMonths={eventMonths}
          onSelectMonth={setMonth}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{monthName}:</span>
          <SeasonBadge season={season} suffix={isNow ? "now" : undefined} />
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${crowdMeta.chip}`}
          >
            <span className={`h-2 w-2 rounded-full ${crowdMeta.dot}`} />
            {crowdMeta.label}
          </span>
          {note && <span>{note}</span>}
          {monthEvents.map((e) => (
            <span key={e.name} className="font-medium text-fuchsia-600">
              🎉 {e.name}
            </span>
          ))}
        </div>

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-slate-700">
            Crowds &amp; prices
          </p>
          <CrowdStrip region={region} highlightMonths={[month]} />
        </div>
      </section>

      {sortedEvents.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-900">
            Festivals &amp; events
          </h2>
          <ul className="divide-y divide-slate-100">
            {sortedEvents.map((e) => {
              const active = e.month === month;
              return (
                <li
                  key={e.name}
                  className={`flex gap-3 py-2.5 ${active ? "rounded-lg bg-fuchsia-50 px-2" : ""}`}
                >
                  <span className="w-9 shrink-0 text-sm font-semibold text-fuchsia-600">
                    {MONTH_NAMES[e.month - 1]}
                  </span>
                  <div>
                    <button
                      onClick={() => setMonth(e.month)}
                      className="text-left font-medium text-slate-900 hover:text-fuchsia-600"
                    >
                      {e.name}
                    </button>
                    <p className="text-sm text-slate-500">{e.blurb}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">
          Historical climate
        </h2>
        <ClimateChart lat={region.lat} lng={region.lng} />
      </section>

      <PackingList region={region} month={month} />

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
