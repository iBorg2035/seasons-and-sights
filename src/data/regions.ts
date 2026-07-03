import type { Event, Region } from "@/types";
import { REGIONS_CORE } from "@/data/regions-core";
import { SIGHTS } from "@/data/sights";
import { EVENTS } from "@/data/events";
import { TOOLKITS } from "@/data/toolkits";

/**
 * The full dataset — region core fields plus sights, toolkit, and events.
 * Server-only: nothing client-side should import this directly (use
 * regions-slim.ts / events-slim.ts instead, which skip sights.ts and
 * toolkits.ts entirely to keep client bundles small). The region detail page
 * is the one place that legitimately needs everything.
 */
export const REGIONS: Region[] = REGIONS_CORE.map((region) => ({
  ...region,
  sights: SIGHTS[region.id] ?? [],
  toolkit: TOOLKITS[region.id],
  events: EVENTS[region.id],
}));

export function getRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

/** Every festival across all regions, paired with its region, sorted by month. */
export function getAllEvents(): { event: Event; region: Region }[] {
  return REGIONS.flatMap((region) =>
    (region.events ?? []).map((event) => ({ event, region }))
  ).sort((a, b) => a.event.month - b.event.month);
}
