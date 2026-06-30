import type { Region, SightType } from "@/types";
import { REGIONS_CORE } from "@/data/regions-core";
import sightSummary from "@/data/sight-summary.json";

/**
 * Region with heavy fields stripped — structurally a valid Region (sights=[]),
 * with extra summary fields (sightCount, sightTypes) for filter/display.
 */
export type SlimRegion = Region & {
  sightCount: number;
  sightTypes: SightType[];
};

const SIGHT_SUMMARY = sightSummary as Record<
  string,
  { count: number; types: SightType[] }
>;

/**
 * Lightweight region list for client views. Built from REGIONS_CORE — which
 * never imports sights.ts, toolkits.ts, or events.ts — so none of that heavy
 * per-destination data reaches client bundles that only need the small,
 * widely-displayed fields (climateBlurb, info, etc.) plus a sight count/types
 * summary precomputed in sight-summary.json (see scripts/build-sight-summary.mjs).
 */
export const REGIONS_SLIM: SlimRegion[] = REGIONS_CORE.map((r) => ({
  ...r,
  sights: [],
  toolkit: undefined,
  events: undefined,
  sightCount: SIGHT_SUMMARY[r.id]?.count ?? 0,
  sightTypes: SIGHT_SUMMARY[r.id]?.types ?? [],
}));

export function getSlimRegion(id: string): SlimRegion | undefined {
  return REGIONS_SLIM.find((r) => r.id === id);
}
