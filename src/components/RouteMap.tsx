"use client";

import dynamic from "next/dynamic";
import type { ItineraryLeg } from "@/lib/season";

// Leaflet touches `window`, so the map only loads on the client.
const Inner = dynamic(() => import("./RouteMapInner"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />
  ),
});

export function RouteMap({ legs }: { legs: ItineraryLeg[] }) {
  return <Inner legs={legs} />;
}
