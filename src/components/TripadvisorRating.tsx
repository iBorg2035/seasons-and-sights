"use client";

import { useEffect, useState } from "react";

interface TaData {
  found: boolean;
  rating: number | null;
  reviewCount: number | null;
  webUrl: string | null;
  ranking: string | null;
}

/**
 * Fetches and displays Tripadvisor rating for a destination. Degrades
 * gracefully — renders nothing if the API key is absent or the lookup fails.
 */
export function TripadvisorRating({ destination }: { destination: string }) {
  const [data, setData] = useState<TaData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tripadvisor?q=${encodeURIComponent(destination)}`)
      .then((r) => r.json())
      .then((d: TaData) => {
        if (!cancelled && d.found) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [destination]);

  if (!data) return null;

  const stars = data.rating
    ? "★".repeat(Math.round(data.rating)) +
      "☆".repeat(5 - Math.round(data.rating))
    : null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-emerald-600">
          {data.rating?.toFixed(1)}
        </span>
        {stars && (
          <span className="text-sm text-amber-500" aria-label={`${data.rating} out of 5`}>
            {stars}
          </span>
        )}
      </div>
      <div className="text-sm text-slate-600">
        {data.reviewCount?.toLocaleString()} reviews on Tripadvisor
        {data.ranking && (
          <span className="ml-1 text-xs text-slate-400">· {data.ranking}</span>
        )}
      </div>
      {data.webUrl && (
        <a
          href={data.webUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-sm font-medium text-emerald-600 hover:underline"
        >
          Read reviews ↗
        </a>
      )}
    </div>
  );
}
