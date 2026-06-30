import type { Event, Region, SightType } from "@/types";
import { REGIONS } from "@/data/regions";

/**
 * Region with heavy fields stripped — structurally a valid Region (sights=[]),
 * with extra summary fields (sightCount, sightTypes) for filter/display.
 */
export type SlimRegion = Region & {
  sightCount: number;
  sightTypes: SightType[];
};

/**
 * Lightweight region list for client views. Strips the heavy fields that no
 * client view renders directly — `sights` (by far the largest), `toolkit`, and
 * `events` — while keeping the small, widely-displayed `climateBlurb` and the
 * `info` block the pre-departure checklist needs. This lives in one shared
 * chunk, so the kept fields are downloaded once and reused across every view.
 */
export const REGIONS_SLIM: SlimRegion[] = REGIONS.map((r) => ({
  ...r,
  sights: [],
  toolkit: undefined,
  events: undefined,
  sightCount: r.sights.length,
  sightTypes: [...new Set(r.sights.map((s) => s.type))],
}));

export function getSlimRegion(id: string): SlimRegion | undefined {
  return REGIONS_SLIM.find((r) => r.id === id);
}

export function getAllEventsSlim(): { event: Event; region: { id: string; name: string; country: string } }[] {
  return REGIONS.flatMap((r) =>
    (r.events ?? []).map((event) => ({ event, region: { id: r.id, name: r.name, country: r.country } }))
  ).sort((a, b) => a.event.month - b.event.month);
}
