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
import { monthOf, MONTH_NAMES } from "@/lib/season";
import type { Sight, TravelToolkit } from "@/types";

interface RegionDetail {
  sights: Sight[];
  events: { name: string; month: number; blurb: string }[];
  toolkit: TravelToolkit;
  advisory: { level: "low" | "moderate" | "high"; text: string };
}

function Skeleton({ label }: { label: string }) {
  return (
    <div className="h-16 animate-pulse rounded-lg bg-slate-100" aria-label={label} />
  );
}

/**
 * Everything an expanded stop shows. Client-safe fields come from the slim
 * region; the heavy server-only data (sights, toolkit, events, advisory)
 * arrives via a lazy fetch of /api/region-detail — never a client import.
 */
export function StopDetail({
  region,
  prevStop,
}: {
  region: SlimRegion;
  /** The previous stop's region (for the getting-there line), or undefined. */
  prevStop?: SlimRegion;
}) {
  const [detail, setDetail] = useState<RegionDetail | null>(null);
  const now = monthOf();
  const destination = `${region.name}, ${region.country}`;

  useEffect(() => {
    let active = true;
    setDetail(null);
    fetch(`/api/region-detail?id=${encodeURIComponent(region.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: RegionDetail | null) => {
        if (active && d) setDetail(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [region.id]);

  return (
    <div className="space-y-5 border-t border-slate-100 bg-slate-50/40 px-4 py-4 text-sm text-slate-700">
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
        ) : (
          <Skeleton label="Safety" />
        )}
      </div>

      {/* Getting there */}
      <GettingThere
        isFirst={!prevStop}
        from={
          prevStop
            ? { lat: prevStop.lat, lng: prevStop.lng, name: prevStop.name }
            : undefined
        }
        to={{ lat: region.lat, lng: region.lng, name: region.name }}
        regionName={region.name}
        note={region.info?.gettingThere}
      />

      {/* When to go: season calendar + crowds */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          When to go
        </h4>
        <SeasonStrip region={region} highlightMonth={now} showLegend={false} />
        <div className="mt-2">
          <CrowdStrip region={region} showLegend={false} />
        </div>
        {region.climateBlurb && (
          <p className="mt-2 text-slate-500">{region.climateBlurb}</p>
        )}
      </div>

      {/* Climate + live weather */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          See
        </h4>
        {detail ? (
          detail.sights.length > 0 ? (
            <SightsList sights={detail.sights} />
          ) : (
            <p className="text-slate-500">
              No curated sights for this destination yet.
            </p>
          )
        ) : (
          <Skeleton label="Sights" />
        )}
      </div>

      {/* Festivals */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Festivals
        </h4>
        {detail ? (
          detail.events.length > 0 ? (
            <ul className="space-y-1">
              {detail.events.map((e) => (
                <li key={e.name}>
                  <span className="font-medium">{e.name}</span>{" "}
                  <span className="text-slate-400">
                    ({MONTH_NAMES[e.month - 1]})
                  </span>
                  <br />
                  <span className="text-slate-500">{e.blurb}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">No major festivals listed.</p>
          )
        ) : (
          <Skeleton label="Festivals" />
        )}
      </div>

      {/* Arrive prepared */}
      {detail ? (
        <ArrivePrepared toolkit={detail.toolkit} plug={region.info?.plugs} />
      ) : (
        <Skeleton label="Arrive prepared" />
      )}

      <Link
        href={`/regions/${region.id}`}
        className="inline-block font-medium text-amber-600 hover:underline"
      >
        Full guide →
      </Link>
    </div>
  );
}
