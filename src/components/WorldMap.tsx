"use client";

import dynamic from "next/dynamic";
import type { Region } from "@/types";

// Leaflet touches `window`, so the map only loads on the client.
const Inner = dynamic(() => import("./WorldMapInner"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
  ),
});

export function WorldMap({
  regions,
  month,
}: {
  regions: Region[];
  month: number;
}) {
  return <Inner regions={regions} month={month} />;
}
