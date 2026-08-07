"use client";

import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";

/**
 * Scroll-to-zoom, but only once you've engaged with the map.
 *
 * The maps sit inline in long scrolling pages, so scroll-zoom cannot simply be
 * on: the wheel would swallow page scroll every time the cursor crossed a map.
 * The previous answer was `scrollWheelZoom={false}` everywhere, which fixed
 * that and made the map feel dead — the wheel is the first thing anyone tries.
 *
 * So: click (or tab to) the map to activate the wheel, move away to release
 * it. Dragging and the +/- buttons work regardless; this only governs the
 * wheel, which is the one interaction that competes with the page.
 */
export function MapInteraction() {
  const map = useMap();
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    const engage = () => {
      map.scrollWheelZoom.enable();
      setEngaged(true);
    };
    const release = () => {
      map.scrollWheelZoom.disable();
      setEngaged(false);
    };

    map.on("click", engage);
    map.on("focus", engage);
    map.on("mouseout", release);
    map.on("blur", release);
    return () => {
      map.off("click", engage);
      map.off("focus", engage);
      map.off("mouseout", release);
      map.off("blur", release);
    };
  }, [map]);

  if (engaged) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[400] flex justify-center pb-1">
      <span className="rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white/90">
        Click the map to zoom with the wheel
      </span>
    </div>
  );
}
