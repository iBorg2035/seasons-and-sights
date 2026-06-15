import type { Season } from "@/types";

// Configurable tile source. Defaults to OpenStreetMap (fine for development);
// set NEXT_PUBLIC_MAP_TILE_URL to a keyed provider (MapTiler, Stadia, Carto…)
// for production traffic, since OSM's public tiles aren't meant for load.
export const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

export const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Season → hex fill, for Leaflet markers (mirrors SEASON_META's Tailwind dots). */
export const SEASON_HEX: Record<Season, string> = {
  dry: "#f59e0b",
  wet: "#38bdf8",
  shoulder: "#10b981",
};
