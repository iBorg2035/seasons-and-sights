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

const TYPE_COLORS: Record<SightType, string> = {
  nature: "#10b981",
  culture: "#f59e0b",
  city: "#6366f1",
  beach: "#06b6d4",
  wildlife: "#ec4899",
};

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 1) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });
  }, [map, points]);
  return null;
}

export default function RegionMapInner({ region }: { region: Region }) {
  const points: [number, number][] = [
    [region.lat, region.lng],
    ...region.sights.map((s) => [s.lat, s.lng] as [number, number]),
  ];

  return (
    <MapContainer
      center={[region.lat, region.lng]}
      zoom={9}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
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
