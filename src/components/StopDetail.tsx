"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SlimRegion } from "@/data/regions-slim";
import { ClimateChart } from "@/components/ClimateChart";
import { WeatherNow } from "@/components/WeatherNow";
import { SightsList } from "@/components/SightsList";
import { TripadvisorRating } from "@/components/TripadvisorRating";
import { SeasonStrip } from "@/components/SeasonStrip";
import { CrowdStrip } from "@/components/CrowdStrip";
import { SafetyNote } from "@/components/SafetyNote";
import { ArrivePrepared } from "@/components/ArrivePrepared";
import { GettingThere } from "@/components/GettingThere";
import { PackingList } from "@/components/PackingList";
import { DestinationImage } from "@/components/DestinationImage";
import { RegionMap } from "@/components/RegionMap";
import { TravelEssentials } from "@/components/TravelEssentials";
import { TravelToolkit } from "@/components/TravelToolkit";
import { BookingCard } from "@/components/BookingCard";
import {
  monthOf,
  MONTH_NAMES,
  MONTH_NAMES_LONG,
  datesForMonth,
  formatDay,
} from "@/lib/season";
import type { Sight, TravelToolkit as Toolkit } from "@/types";

interface RegionDetail {
  sights: Sight[];
  events: { name: string; month: number; blurb: string }[];
  toolkit: Toolkit;
  advisory: { level: "low" | "moderate" | "high"; text: string };
}

function Skeleton({ label }: { label: string }) {
  return (
    <div
      className="h-16 animate-pulse rounded-lg bg-slate-100"
      role="status"
      aria-label={label}
    />
  );
}

// Session-lived cache: collapsing a stop unmounts this component, so without
// it every re-expand refetches. Curated data — safe to keep for the session.
const detailCache = new Map<string, RegionDetail>();

/**
 * Everything an expanded stop shows. Client-safe fields come from the slim
 * region; the heavy server-only data (sights, toolkit, events, advisory)
 * arrives via a lazy fetch of /api/region-detail — never a client import.
 */
export function StopDetail({
  tripId,
  region,
  prevStop,
  stayMonth,
  stayMonths,
  stayRange,
  stayLabel,
  onSetExactDates,
  reservationSlot,
}: {
  /** Trip the packing ticks are saved against. Absent on the region page. */
  tripId?: string;
  region: SlimRegion;
  /** The previous stop's region (for the getting-there line), or undefined. */
  prevStop?: SlimRegion;
  /** 1-based month this stay starts (from the planned leg); defaults to now. */
  stayMonth?: number;
  /** All 1-based months this stay spans (the planned leg's full `months`),
   *  used to highlight festivals that actually fall during the visit. */
  stayMonths?: number[];
  /** This stop's actual window — committed dates when booked, the planned
   *  range otherwise. Absent outside a trip (the region page). */
  stayRange?: { start: Date; end: Date } | null;
  /** How to describe where stayRange came from, e.g. "your booked dates". */
  stayLabel?: string;
  /** Offered when the trip isn't on real dates yet, so "I want to choose the
   *  dates" has an answer on the screen where the question comes up. */
  onSetExactDates?: () => void;
  /** The stop's saved bookings. Passed in rather than fetched here so this
   *  component stays presentational and usable outside a trip. */
  reservationSlot?: React.ReactNode;
}) {
  const [detail, setDetail] = useState<RegionDetail | null>(null);
  // A failed fetch must surface (retryable), never leave skeletons spinning —
  // the infinite-skeleton bug class this codebase has shipped before.
  const [failed, setFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const now = monthOf();
  const destination = `${region.name}, ${region.country}`;

  useEffect(() => {
    let active = true;
    setFailed(false);
    const cached = detailCache.get(region.id);
    if (cached) {
      setDetail(cached);
      return;
    }
    setDetail(null);
    fetch(`/api/region-detail?id=${encodeURIComponent(region.id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: RegionDetail) => {
        detailCache.set(region.id, d);
        if (active) setDetail(d);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [region.id, retryTick]);

  const pending = !detail && !failed;

  return (
    <div className="space-y-5 border-t border-slate-100 bg-white px-4 py-4 text-sm text-slate-800">
      {/* Hero image */}
      {region.photo && (
        <div className="overflow-hidden rounded-xl">
          <DestinationImage
            src={region.photo}
            alt={`${region.name}, ${region.country}`}
            className="h-40 w-full"
            sizes="(max-width: 640px) 100vw, 600px"
          />
        </div>
      )}

      {/* Quick facts */}
      <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {region.info?.visa && (
          <p>
            <span className="font-medium text-slate-700">Visa:</span>{" "}
            {region.info.visa}
          </p>
        )}
        {typeof region.dailyBudget === "number" && (
          <p>
            <span className="font-medium text-slate-700">Daily cost:</span> ~$
            {region.dailyBudget}/day
          </p>
        )}
        {region.info?.plugs && (
          <p>
            <span className="font-medium text-slate-700">Plugs:</span>{" "}
            {region.info.plugs}
          </p>
        )}
        {detail ? (
          <SafetyNote advisory={detail.advisory} />
        ) : pending ? (
          <Skeleton label="Safety" />
        ) : null}
      </div>

      {failed && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700"
        >
          Couldn&apos;t load the full destination details.{" "}
          <button
            type="button"
            onClick={() => setRetryTick((n) => n + 1)}
            className="font-semibold underline"
          >
            Retry
          </button>
        </p>
      )}

      {/* Getting there */}
      <GettingThere
        isFirst={!prevStop}
        from={
          prevStop
            ? {
                lat: prevStop.lat,
                lng: prevStop.lng,
                name: prevStop.name,
                dest: prevStop.bookingDest,
              }
            : undefined
        }
        to={{
          lat: region.lat,
          lng: region.lng,
          name: region.name,
          dest: region.bookingDest,
        }}
        regionName={region.name}
        note={region.info?.gettingThere}
      />

      {/* When to go: season calendar + crowds */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
          When to go
        </h4>
        <SeasonStrip region={region} highlightMonth={now} showLegend={false} />
        <div className="mt-2">
          <CrowdStrip region={region} showLegend={false} />
        </div>
        {region.climateBlurb && (
          <p className="mt-2 text-slate-600">{region.climateBlurb}</p>
        )}
      </div>

      {/* Climate + live weather */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
          Climate &amp; weather
        </h4>
        <ClimateChart lat={region.lat} lng={region.lng} />
        <div className="mt-2">
          <WeatherNow lat={region.lat} lng={region.lng} />
        </div>
        <div className="mt-2">
          <TripadvisorRating destination={destination} />
        </div>
      </div>

      {/* Sights */}
      {(detail || pending) && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
            See
          </h4>
          {detail ? (
            detail.sights.length > 0 ? (
              <SightsList sights={detail.sights} />
            ) : (
              <p className="text-slate-600">
                No curated sights for this destination yet.
              </p>
            )
          ) : (
            <Skeleton label="Sights" />
          )}
        </div>
      )}

      {/* Map with sight pins (needs the fetched sights) */}
      {(detail || pending) && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
            Map
          </h4>
          {detail ? (
            <div className="h-72 w-full overflow-hidden rounded-xl border border-slate-200">
              <RegionMap region={{ ...region, sights: detail.sights }} />
            </div>
          ) : (
            <Skeleton label="Map" />
          )}
        </div>
      )}

      {/* Festivals */}
      {(detail || pending) && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
            Festivals
          </h4>
          {detail ? (
            detail.events.length > 0 ? (
              <ul className="space-y-1">
                {detail.events.map((e) => {
                  const duringStay = stayMonths?.includes(e.month) ?? false;
                  return (
                    <li
                      key={e.name}
                      className={
                        duringStay
                          ? "rounded-lg border border-teal-200 bg-teal-50 px-3 py-2"
                          : undefined
                      }
                    >
                      {duringStay && (
                        <span className="mr-1.5 inline-block rounded-full border border-teal-300 bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800">
                          During your stay
                        </span>
                      )}
                      <span className="font-medium">{e.name}</span>{" "}
                      <span className="text-slate-500">
                        ({MONTH_NAMES[e.month - 1]})
                      </span>
                      <br />
                      <span className="text-slate-600">{e.blurb}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-slate-600">No major festivals listed.</p>
            )
          ) : (
            <Skeleton label="Festivals" />
          )}
        </div>
      )}

      {/* Packing — tailored by the fetched sights (beach/wildlife/culture) */}
      {(detail || pending) &&
        (detail ? (
          <PackingList
            compact
            tripId={tripId}
            region={{ ...region, sights: detail.sights }}
            month={stayMonth ?? now}
          />
        ) : (
          <Skeleton label="Packing" />
        ))}

      {/* Arrive prepared (compact summary) */}
      {detail ? (
        <ArrivePrepared toolkit={detail.toolkit} plug={region.info?.plugs} />
      ) : pending ? (
        <Skeleton label="Arrive prepared" />
      ) : null}

      {/* Full know-before-you-go essentials (passport-aware visa, currency,
          language, plugs, getting-there, health) — same block as the region
          page. info is on SlimRegion, so this renders immediately. */}
      {region.info && (
        <TravelEssentials info={region.info} country={region.country} />
      )}

      {/* Full travel toolkit (phrases, emergency, tipping, water + the live
          currency converter) — same block as the region page. */}
      {detail?.toolkit && (
        <TravelToolkit
          toolkit={detail.toolkit}
          currency={region.info?.currency}
        />
      )}

      {/* Booking link for this stay. Prefers the stop's own dates — committed
          ones when the trip is booked, the planned window otherwise — so the
          card agrees with the rest of the page and reflects the stay length.
          Falls back to a month sample only outside a trip (the region page). */}
      {(() => {
        if (stayRange) {
          return (
            <BookingCard
              region={region}
              checkin={formatDay(stayRange.start)}
              checkout={formatDay(stayRange.end)}
              monthLabel={stayLabel ?? "your stay"}
              onSetExactDates={onSetExactDates}
            />
          );
        }
        const m = stayMonth ?? now;
        const { checkin, checkout } = datesForMonth(m);
        return (
          <BookingCard
            region={region}
            checkin={checkin}
            checkout={checkout}
            monthLabel={MONTH_NAMES_LONG[m - 1]}
            onSetExactDates={onSetExactDates}
          />
        );
      })()}

      {reservationSlot}

      <Link
        href={`/regions/${region.id}`}
        className="inline-block font-medium text-teal-700 hover:underline"
      >
        Full guide →
      </Link>
    </div>
  );
}
