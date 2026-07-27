import { tool } from "ai";
import { z } from "zod";
import {
  assessTripFromContext,
  getDestinationDetail,
  getLiveWeatherForRegion,
  getPackingForDestination,
  getVisaForDestination,
  planRouteFromStops,
  searchDestinations,
} from "@/lib/assistant/tools-data";
import type { TripContextPayload } from "@/lib/assistant/types";

const passportSchema = z.enum(["US", "UK", "EU", "CA", "AU"]);
const seasonSchema = z.enum(["dry", "wet", "shoulder"]);
const sightTypeSchema = z.enum([
  "nature",
  "culture",
  "city",
  "beach",
  "wildlife",
]);

const tripContextSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  start: z.number().int().min(0).max(12),
  stops: z.array(z.tuple([z.string(), z.number()])),
  interests: z.array(sightTypeSchema).optional(),
});

export function createAssistantTools(tripContext?: TripContextPayload | null) {
  return {
    searchDestinations: tool({
      description:
        "Search curated destinations by name, continent, month/season fit, sight type, or daily budget. Use this before recommending places.",
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe("Free-text match on name, country, continent, or blurb"),
        continent: z
          .string()
          .optional()
          .describe(
            'e.g. "Southeast Asia", "South America", "Europe", "Oceania"'
          ),
        month: z
          .number()
          .int()
          .min(1)
          .max(12)
          .optional()
          .describe("1=Jan … 12=Dec — ranks by season fit when set"),
        preferSeason: seasonSchema
          .optional()
          .describe("Only keep destinations in this season for `month`"),
        sightType: sightTypeSchema.optional(),
        maxDailyBudgetUsd: z.number().optional(),
        limit: z.number().int().min(1).max(20).optional(),
      }),
      execute: async (input) => searchDestinations(input),
    }),

    getDestination: tool({
      description:
        "Get full detail for one destination: climate blurb, 12-month calendar, sights, festivals, travel info, toolkit.",
      inputSchema: z.object({
        regionId: z
          .string()
          .describe('Destination id, e.g. "japan-tokyo" or "peru-cusco"'),
      }),
      execute: async ({ regionId }) => getDestinationDetail(regionId),
    }),

    getPackingList: tool({
      description:
        "Season-aware packing list for a destination and month (1-12).",
      inputSchema: z.object({
        regionId: z.string(),
        month: z.number().int().min(1).max(12),
      }),
      execute: async ({ regionId, month }) =>
        getPackingForDestination(regionId, month),
    }),

    getVisaInfo: tool({
      description:
        "Indicative visa status for a passport at a destination (by region id or country name). Always remind the user to verify.",
      inputSchema: z.object({
        regionIdOrCountry: z
          .string()
          .describe('Region id like "thailand-bangkok" or country "Thailand"'),
        passport: passportSchema.describe("Traveler passport: US, UK, EU, CA, AU"),
      }),
      execute: async ({ regionIdOrCountry, passport }) =>
        getVisaForDestination(regionIdOrCountry, passport),
    }),

    assessTrip: tool({
      description:
        "Score the traveler's multi-stop trip for weather fit, crowds, pace, and prep. Uses the open trip context when trip is omitted.",
      inputSchema: z.object({
        trip: tripContextSchema
          .optional()
          .describe("Override trip; defaults to the open trip context"),
      }),
      execute: async ({ trip }) => {
        const ctx = trip ?? tripContext ?? null;
        if (!ctx) {
          return {
            error:
              "No trip context. Ask the user which destinations and start month to assess, or open a trip page.",
          };
        }
        return assessTripFromContext(ctx);
      },
    }),

    planRoute: tool({
      description:
        "Reorder stops so each lands in the best dry/shoulder window from a start month. Returns the optimized sequence with month spans.",
      inputSchema: z.object({
        startMonth: z.number().int().min(1).max(12),
        stops: z
          .array(
            z.object({
              regionId: z.string(),
              durationMonths: z.number().min(1 / 30).max(12).default(1),
            })
          )
          .min(1)
          .max(10),
      }),
      execute: async ({ startMonth, stops }) =>
        planRouteFromStops(
          stops.map(
            (s) => [s.regionId, s.durationMonths] as [string, number]
          ),
          startMonth
        ),
    }),

    getLiveWeather: tool({
      description:
        "Fetch live current weather and a short forecast for a destination (Open-Meteo).",
      inputSchema: z.object({
        regionId: z.string(),
      }),
      execute: async ({ regionId }) => getLiveWeatherForRegion(regionId),
    }),
  };
}
