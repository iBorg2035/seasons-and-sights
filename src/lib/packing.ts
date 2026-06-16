import type { Region } from "@/types";
import { climateForMonth } from "@/lib/season";

// Regions where it gets genuinely cold (high altitude or far from the equator).
const COLD_ALTITUDE = new Set([
  "peru-cusco",
  "nepal-kathmandu",
  "patagonia-elcalafate",
  "bolivia-uyuni",
  "chile-atacama",
]);

export interface PackingGroup {
  group: string;
  items: string[];
}

/** A smart packing list tailored to a destination's season and activities. */
export function packingList(region: Region, month: number): PackingGroup[] {
  const season = climateForMonth(region, month).season;
  const hasBeach = region.sights.some((s) => s.type === "beach");
  const hasWildlife = region.sights.some((s) => s.type === "wildlife");
  const hasCulture = region.sights.some((s) => s.type === "culture");
  const tropical = Math.abs(region.lat) < 23.5;
  const cold = COLD_ALTITUDE.has(region.id) || Math.abs(region.lat) > 45;

  const clothing = ["Comfortable everyday outfits"];
  if (season === "dry") clothing.push("Light, breathable clothing", "Sun hat & sunglasses");
  if (season === "wet") clothing.push("Quick-dry clothing", "Packable rain jacket");
  if (season === "shoulder") clothing.push("Light layers for changeable weather");
  if (cold) clothing.push("Warm fleece / insulated jacket", "Beanie & gloves for cold nights");
  if (hasBeach) clothing.push("Swimwear");
  if (
    hasCulture &&
    (region.continent === "Southeast Asia" || region.continent === "South Asia")
  )
    clothing.push("A layer to cover shoulders/knees for temples");

  const footwear = ["Comfortable walking shoes"];
  if (cold) footwear.push("Sturdy hiking boots");
  if (hasBeach) footwear.push("Sandals / flip-flops");

  const extras: string[] = [];
  if (season === "dry") extras.push("High-SPF sunscreen", "Lip balm");
  if (season === "wet") extras.push("Dry bag for electronics", "Travel umbrella");
  if (tropical) extras.push("Insect repellent");
  if (hasWildlife) extras.push("Binoculars");
  if (cold) extras.push("Reusable hand warmers");

  return [
    {
      group: "Essentials",
      items: [
        "Passport & copies",
        "Phone, charger & universal adapter",
        "Cards + some local cash",
        "Reusable water bottle",
        "Compact first-aid kit & medications",
      ],
    },
    { group: "Clothing", items: clothing },
    { group: "Footwear", items: footwear },
    { group: "Weather & extras", items: extras },
  ].filter((g) => g.items.length > 0);
}
