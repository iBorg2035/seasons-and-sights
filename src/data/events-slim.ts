import type { Event } from "@/types";
import { REGIONS_CORE } from "@/data/regions-core";
import { EVENTS } from "@/data/events";

/**
 * In its own module, separate from regions-slim.ts: the festivals view is the
 * only client view that needs event text, so keeping this import of events.ts
 * out of regions-slim.ts means the other 8 slim views never bundle it either.
 */
export function getAllEventsSlim(): {
  event: Event;
  region: { id: string; name: string; country: string };
}[] {
  return REGIONS_CORE.flatMap((r) =>
    (EVENTS[r.id] ?? []).map((event) => ({
      event,
      region: { id: r.id, name: r.name, country: r.country },
    }))
  ).sort((a, b) => a.event.month - b.event.month);
}
