"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import { SEASON_HEX, TILE_ATTRIBUTION, TILE_URL } from "@/lib/map";
import {
  SEASON_META,
  climateForMonth,
  type ItineraryLeg,
} from "@/lib/season";

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 6 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

function numberedIcon(n: number, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:26px;height:26px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:13px;font-family:sans-serif">${n}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export default function RouteMapInner({ legs }: { legs: ItineraryLeg[] }) {
  const points = legs.map(
    (l) => [l.region.lat, l.region.lng] as [number, number]
  );

  return (
    <MapContainer
      center={[20, 10]}
      zoom={2}
      minZoom={1}
      scrollWheelZoom={false}
      worldCopyJump
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} />
      <Polyline
        positions={points}
        pathOptions={{ color: "#334155", weight: 2, dashArray: "4 6", opacity: 0.7 }}
      />
      {legs.map((leg, i) => {
        const season = climateForMonth(leg.region, leg.months[0]).season;
        return (
          <Marker
            key={leg.region.id}
            position={[leg.region.lat, leg.region.lng]}
            icon={numberedIcon(i + 1, SEASON_HEX[season])}
          >
            <Popup>
              <strong>
                {i + 1}. {leg.region.name}
              </strong>
              <br />
              {leg.region.country} · {SEASON_META[season].label}
              <br />
              <a href={`/regions/${leg.region.id}`}>View destination →</a>
            </Popup>
          </Marker>
        );
      })}
      <FitBounds points={points} />
    </MapContainer>
  );
}
