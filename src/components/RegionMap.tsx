"use client";

import dynamic from "next/dynamic";
import type { Region } from "@/types";

// Leaflet touches `window`, so the map must only load on the client.
const Inner = dynamic(() => import("./RegionMapInner"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />,
});

export function RegionMap({ region }: { region: Region }) {
  return <Inner region={region} />;
}
