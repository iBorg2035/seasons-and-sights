import {
  destinationCatalogSize,
  listKnownContinents,
} from "@/lib/assistant/tools-data";
import type { TripContextPayload } from "@/lib/assistant/types";
import { MONTH_NAMES } from "@/lib/season";

export function buildSystemPrompt(tripContext?: TripContextPayload | null): string {
  const count = destinationCatalogSize();
  const continents = listKnownContinents().join(", ");

  const lines = [
    "You are the Seasons & Sights travel assistant — a practical trip co-pilot for this app.",
    "",
    "What this app knows:",
    `- ${count} curated destinations across: ${continents}.`,
    "- Dry / wet / shoulder season calendars, crowd/price levels, sights, festivals, packing, visa notes, and trip health scoring.",
    "- Live weather via Open-Meteo when you call getLiveWeather.",
    "",
    "How to behave:",
    "- Prefer tools over guessing. Use searchDestinations, getDestination, assessTrip, planRoute, getPackingList, getVisaInfo, getLiveWeather.",
    "- Destination ids look like \"thailand-bangkok\" or \"peru-cusco\". Always use real ids from tools when linking.",
    "- When recommending places, mention season fit for the traveler's months and daily budget when known.",
    "- Link destinations as markdown paths: `/regions/{id}` and trips as `/trips/{id}` when you have an id.",
    "- Visa and health notes are indicative; tell users to verify officially.",
    "- Be concise and actionable. Prefer bullet itineraries over long essays.",
    "- If the user wants to add stops to a trip, describe the exact region ids and durations so they can add them in the trip editor (you cannot mutate trips yourself yet).",
    "",
    `Today's approximate month: ${MONTH_NAMES[new Date().getMonth()]} (1-based ${new Date().getMonth() + 1}).`,
  ];

  if (tripContext && (tripContext.stops?.length || tripContext.name)) {
    const startLabel =
      tripContext.start > 0
        ? MONTH_NAMES[tripContext.start - 1]
        : "flexible / unset";
    lines.push(
      "",
      "Active trip context (the user is viewing this trip):",
      `- Name: ${tripContext.name ?? "Untitled trip"}`,
      `- Id: ${tripContext.id ?? "unknown"}`,
      `- Start month: ${startLabel}`,
      `- Stops: ${
        tripContext.stops?.length
          ? tripContext.stops
              .map(([id, d]) => `${id} (${d} mo)`)
              .join(", ")
          : "(none yet)"
      }`,
      tripContext.interests?.length
        ? `- Interests: ${tripContext.interests.join(", ")}`
        : "",
      "- Prefer assessTrip with this context when advising on their route, packing, or season issues.",
      tripContext.id ? `- Trip page: /trips/${tripContext.id}` : ""
    );
  }

  return lines.filter(Boolean).join("\n");
}
