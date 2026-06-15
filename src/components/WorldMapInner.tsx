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
import type { Region } from "@/types";
import { SEASON_HEX, TILE_ATTRIBUTION, TILE_URL } from "@/lib/map";
import { SEASON_META, climateForMonth } from "@/lib/season";

function FitBounds({ regions }: { regions: Region[] }) {
  const map = useMap();
  const key = regions.map((r) => r.id).join(",");
  useEffect(() => {
    const pts = regions.map((r) => [r.lat, r.lng] as [number, number]);
    if (pts.length) {
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 6 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export default function WorldMapInner({
  regions,
  month,
}: {
  regions: Region[];
  month: number;
}) {
  return (
    <MapContainer
      center={[20, 10]}
      zoom={2}
      minZoom={2}
      scrollWheelZoom={false}
      worldCopyJump
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
      {regions.map((r) => {
        const season = climateForMonth(r, month).season;
        return (
          <CircleMarker
            key={r.id}
            center={[r.lat, r.lng]}
            radius={7}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: SEASON_HEX[season],
              fillOpacity: 1,
            }}
          >
            <Popup>
              <strong>{r.name}</strong>
              <br />
              {r.country} · {SEASON_META[season].label}
              <br />
              <a href={`/regions/${r.id}`}>View destination →</a>
            </Popup>
          </CircleMarker>
        );
      })}
      <FitBounds regions={regions} />
    </MapContainer>
  );
}
