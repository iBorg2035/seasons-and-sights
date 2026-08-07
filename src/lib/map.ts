import type { Season } from "@/types";

/**
 * Basemap tiles, chosen to stay out of the way.
 *
 * The map's job here is to show season-coloured markers and route lines. Carto
 * Voyager — the previous default — renders full road casings and land-use
 * tints, which compete with those markers for attention. Positron and Dark
 * Matter are near-monochrome, so the data on top reads as the subject.
 *
 * Two of them because the app is dark BY DEFAULT (see themeScript in
 * layout.tsx: anything other than an explicit "light" gets the dark class).
 * A single light basemap would mean most people get a glaring white rectangle
 * in an otherwise dark page — which was the actual complaint, and picking a
 * lighter light-mode style alone would have made it worse.
 *
 * Both are Carto's keyless CDN, intended to serve real sites — unlike
 * osm.org's tiles, which are for OSM's own use. Attribution is required and
 * identical for both. Override with NEXT_PUBLIC_MAP_TILE_URL to pin a single
 * style, or to move to a keyed provider if traffic outgrows Carto's fair use.
 */
const LIGHT_TILES =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const DARK_TILES =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

/** An explicit override wins over theme-following, in both themes. */
const OVERRIDE = process.env.NEXT_PUBLIC_MAP_TILE_URL;

/**
 * Tiles for the current theme.
 *
 * Reads the class the theme script already put on <html> rather than
 * introducing a second source of truth for "is it dark". Server-side there is
 * no document, and the app is dark by default, so dark is the safe guess —
 * getting it wrong for one frame would flash a white map into a dark page.
 */
export function tileUrlFor(isDark: boolean): string {
  return OVERRIDE || (isDark ? DARK_TILES : LIGHT_TILES);
}

/** Back-compat for any caller that just wants a URL without theme context. */
export const TILE_URL = OVERRIDE || DARK_TILES;

export const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Season → hex fill, for Leaflet markers (mirrors SEASON_META's Tailwind dots). */
export const SEASON_HEX: Record<Season, string> = {
  dry: "#f59e0b",
  wet: "#38bdf8",
  shoulder: "#10b981",
};
