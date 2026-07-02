import type { Season } from "@/types";

// Configurable tile source. Defaults to Carto's no-key basemap CDN, which
// (unlike osm.org's public tiles) is intended to serve real sites —
// attribution required. Set NEXT_PUBLIC_MAP_TILE_URL to a keyed provider
// (MapTiler, Stadia…) if traffic outgrows Carto's fair-use tier.
export const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

export const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Season → hex fill, for Leaflet markers (mirrors SEASON_META's Tailwind dots). */
export const SEASON_HEX: Record<Season, string> = {
  dry: "#f59e0b",
  wet: "#38bdf8",
  shoulder: "#10b981",
};
