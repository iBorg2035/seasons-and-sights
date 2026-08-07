"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import type { Region, SightType } from "@/types";
import { TILE_ATTRIBUTION, tileUrlFor } from "@/lib/map";
import { useDarkTheme } from "@/lib/use-dark-theme";
import { MapInteraction } from "@/components/MapInteraction";

const TYPE_COLORS: Record<SightType, string> = {
  nature: "#10b981",
  culture: "#f59e0b",
  city: "#6366f1",
  beach: "#06b6d4",
  wildlife: "#ec4899",
};

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  // Keyed on the coordinates, not the array. `points` is rebuilt on every
  // render — and StopDetail passes a fresh `{...region, sights}` object, so
  // renders are frequent — which made this refit constantly: pan the map and
  // it snapped straight back, which reads as "the map is static". The other
  // two maps already keyed on a string for exactly this reason.
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length < 1) return;
    map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 11 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export default function RegionMapInner({ region }: { region: Region }) {
  const tileUrl = tileUrlFor(useDarkTheme());
  const points: [number, number][] = [
    [region.lat, region.lng],
    ...region.sights.map((s) => [s.lat, s.lng] as [number, number]),
  ];

  // scrollWheelZoom starts off so the wheel doesn't swallow page scroll;
  // MapInteraction turns it on once the map is clicked or focused.
  return (
    <MapContainer
      center={[region.lat, region.lng]}
      zoom={9}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer key={tileUrl} attribution={TILE_ATTRIBUTION} url={tileUrl} />
      <MapInteraction />
      {region.sights.map((sight) => (
        <CircleMarker
          key={sight.name}
          center={[sight.lat, sight.lng]}
          radius={8}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: TYPE_COLORS[sight.type],
            fillOpacity: 1,
          }}
        >
          <Popup>
            <strong>{sight.name}</strong>
            <br />
            {sight.blurb}
          </Popup>
        </CircleMarker>
      ))}
      <FitBounds points={points} />
    </MapContainer>
  );
}
