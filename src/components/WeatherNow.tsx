"use client";

import { useEffect, useState } from "react";
import type { WeatherSnapshot } from "@/lib/weather";
import { describeWeather } from "@/lib/weather";
import { MONTH_NAMES } from "@/lib/season";

function dayLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}`;
}

function clockTime(iso: string): string {
  // ISO like "2026-06-16T05:12"
  return iso.slice(11, 16);
}

function dayLength(sunrise: string, sunset: string): string {
  const mins =
    (new Date(sunset).getTime() - new Date(sunrise).getTime()) / 60000;
  if (!Number.isFinite(mins) || mins <= 0) return "";
  return `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;
}

export function WeatherNow({ lat, lng }: { lat: number; lng: number }) {
  const [data, setData] = useState<WeatherSnapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(false);
    fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: WeatherSnapshot) => active && setData(d))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [lat, lng]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-900">Weather right now</h3>

      {error && (
        <p className="mt-2 text-sm text-slate-400">Live weather unavailable.</p>
      )}

      {!error && !data && (
        <div className="mt-3 h-20 animate-pulse rounded-lg bg-slate-100" />
      )}

      {data && (
        <>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-4xl" aria-hidden>
              {describeWeather(data.current.weatherCode).icon}
            </span>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {Math.round(data.current.temperature)}°C
              </div>
              <div className="text-sm text-slate-500">
                {describeWeather(data.current.weatherCode).label}
              </div>
            </div>
          </div>

          {data.sunrise && data.sunset && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span aria-hidden>🌅</span>
              <span>
                {clockTime(data.sunrise)} – {clockTime(data.sunset)}
              </span>
              <span className="text-slate-400">
                · {dayLength(data.sunrise, data.sunset)} of daylight
              </span>
            </div>
          )}

          <div className="mt-4 grid grid-cols-5 gap-2">
            {data.daily.slice(0, 5).map((d) => (
              <div
                key={d.date}
                className="rounded-lg bg-slate-50 p-2 text-center"
                title={`${shortDate(d.date)} · ${d.precipitation.toFixed(1)}mm rain`}
              >
                <div className="text-[11px] font-medium text-slate-500">
                  {dayLabel(d.date)}
                </div>
                <div className="text-lg" aria-hidden>
                  {describeWeather(d.weatherCode).icon}
                </div>
                <div className="text-xs font-semibold text-slate-800">
                  {Math.round(d.tempMax)}°
                </div>
                <div className="text-[11px] text-slate-400">
                  {Math.round(d.tempMin)}°
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
