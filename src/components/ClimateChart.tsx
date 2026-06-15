"use client";

import { useEffect, useState } from "react";
import type { MonthlyNormal } from "@/lib/weather";
import { MONTH_NAMES } from "@/lib/season";

export function ClimateChart({ lat, lng }: { lat: number; lng: number }) {
  const [normals, setNormals] = useState<MonthlyNormal[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setNormals(null);
    setError(false);
    fetch(`/api/climate?lat=${lat}&lng=${lng}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { normals: MonthlyNormal[] }) => active && setNormals(d.normals))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [lat, lng]);

  if (error) {
    return (
      <p className="text-sm text-slate-400">Historical climate unavailable.</p>
    );
  }
  if (!normals) {
    return <div className="h-40 animate-pulse rounded-lg bg-slate-100" />;
  }

  // Layout.
  const W = 480;
  const H = 170;
  const padL = 30;
  const padR = 30;
  const padT = 12;
  const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const colW = plotW / 12;

  const precipMaxRaw = Math.max(...normals.map((n) => n.avgPrecipMm), 1);
  const precipMax = Math.ceil(precipMaxRaw / 50) * 50 || 50;
  const temps = normals.map((n) => n.avgTempC);
  const tLo = Math.floor(Math.min(...temps) - 2);
  const tHi = Math.ceil(Math.max(...temps) + 2);

  const barX = (i: number) => padL + colW * (i + 0.5);
  const precipY = (mm: number) => padT + plotH - (mm / precipMax) * plotH;
  const tempY = (t: number) => padT + plotH - ((t - tLo) / (tHi - tLo)) * plotH;

  const tempLine = normals
    .map((n, i) => `${barX(i).toFixed(1)},${tempY(n.avgTempC).toFixed(1)}`)
    .join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {/* Axis labels */}
        <text x={padL - 4} y={padT + 4} fontSize="9" fill="#0ea5e9" textAnchor="end">
          {precipMax}
        </text>
        <text x={padL - 4} y={padT + plotH} fontSize="9" fill="#0ea5e9" textAnchor="end">
          0
        </text>
        <text x={W - padR + 4} y={padT + 4} fontSize="9" fill="#f59e0b" textAnchor="start">
          {tHi}°
        </text>
        <text x={W - padR + 4} y={padT + plotH} fontSize="9" fill="#f59e0b" textAnchor="start">
          {tLo}°
        </text>

        {/* Rainfall bars */}
        {normals.map((n, i) => {
          const h = padT + plotH - precipY(n.avgPrecipMm);
          return (
            <rect
              key={n.month}
              x={barX(i) - 8}
              y={precipY(n.avgPrecipMm)}
              width={16}
              height={Math.max(h, 0)}
              rx={2}
              fill="#7dd3fc"
            >
              <title>
                {MONTH_NAMES[i]}: {Math.round(n.avgPrecipMm)}mm,{" "}
                {Math.round(n.avgTempC)}°C
              </title>
            </rect>
          );
        })}

        {/* Temperature line */}
        <polyline
          points={tempLine}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {normals.map((n, i) => (
          <circle
            key={n.month}
            cx={barX(i)}
            cy={tempY(n.avgTempC)}
            r={2.5}
            fill="#f59e0b"
          />
        ))}

        {/* Month labels */}
        {MONTH_NAMES.map((label, i) => (
          <text
            key={label}
            x={barX(i)}
            y={H - 8}
            fontSize="9"
            fill="#64748b"
            textAnchor="middle"
          >
            {label}
          </text>
        ))}
      </svg>

      <p className="mt-1 text-xs text-slate-400">
        <span className="font-medium text-sky-600">Rainfall (bars)</span> &amp;{" "}
        <span className="font-medium text-amber-600">avg temp (line)</span> ·
        2019–2023 normals · Open-Meteo
      </p>
    </div>
  );
}
