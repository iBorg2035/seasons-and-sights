import type { Continent } from "@/types";

/** Display order for continents, shared across every filter and grouping. */
export const CONTINENT_ORDER: Continent[] = [
  "Southeast Asia",
  "South Asia",
  "East Asia",
  "South America",
  "North America",
  "Europe",
  "Africa",
  "Oceania",
];

/** Short labels for compact filter chips. */
export const CONTINENT_LABEL: Record<Continent, string> = {
  "Southeast Asia": "SE Asia",
  "South Asia": "South Asia",
  "East Asia": "East Asia",
  "South America": "South America",
  "North America": "N. America",
  Europe: "Europe",
  Africa: "Africa",
  Oceania: "Oceania",
};
