/**
 * Stops the assistant proposed, on their way into a trip.
 *
 * The assistant never edits a trip. Its `suggestStops` tool returns a list;
 * the chat shows that list with an "Add to trip" button; pressing it puts the
 * stops into the trip page's unsaved working copy, where Save commits them and
 * Discard throws them away. Two human confirmations sit between a model's
 * output and stored data, and neither is a prompt the model can answer.
 *
 * Everything here treats the tool output as untrusted — it is model output
 * relayed through the network — and is free of React and of the region
 * dataset, so it can be tested directly. Callers supply `isKnownRegion`.
 */

export interface SuggestedStop {
  regionId: string;
  /** Display name; falls back to the id when the tool didn't supply one. */
  name: string;
  /** Stay length in months, the unit trip stops are stored in. */
  durationMonths: number;
}

/** One night to one year — the same bounds the planRoute tool accepts. */
const MIN_MONTHS = 1 / 30;
const MAX_MONTHS = 12;
/** A proposal longer than this is a runaway model, not an itinerary. */
const MAX_STOPS = 20;

/**
 * Pull a usable stop list out of a `suggestStops` tool output, dropping
 * anything malformed or pointing at a destination this build doesn't have.
 * Returns [] rather than throwing: a bad suggestion should render as no
 * button, not take down the chat.
 */
export function parseSuggestedStops(
  output: unknown,
  isKnownRegion: (id: string) => boolean
): SuggestedStop[] {
  const raw = (output as { stops?: unknown } | null)?.stops;
  if (!Array.isArray(raw)) return [];

  const stops: SuggestedStop[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { regionId, name, durationMonths } = item as Record<string, unknown>;
    if (typeof regionId !== "string" || !isKnownRegion(regionId)) continue;
    if (seen.has(regionId)) continue;
    const months = Number(durationMonths);
    seen.add(regionId);
    stops.push({
      regionId,
      name: typeof name === "string" && name.trim() ? name.trim() : regionId,
      durationMonths: Number.isFinite(months)
        ? Math.min(MAX_MONTHS, Math.max(MIN_MONTHS, months))
        : 1,
    });
    if (stops.length === MAX_STOPS) break;
  }
  return stops;
}

/**
 * Append suggested stops to a trip, skipping destinations it already has —
 * the same rule the "Add to trip" button on a region page follows, so asking
 * twice can't double a stop. Mutates `trip.stops`; call inside an edit of the
 * working copy. Returns how many were actually added.
 */
export function applySuggestedStops(
  trip: { stops: [string, number][] },
  stops: SuggestedStop[]
): number {
  let added = 0;
  for (const stop of stops) {
    if (trip.stops.some(([id]) => id === stop.regionId)) continue;
    trip.stops.push([stop.regionId, stop.durationMonths]);
    added++;
  }
  return added;
}
