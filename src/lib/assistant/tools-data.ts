/**
 * Pure tool implementations for the travel assistant.
 * Server-side only: imports the full region dataset (not for client bundles).
 */
import { getRegion, REGIONS } from "@/data/regions";
import {
  bestMonths,
  climateForMonth,
  crowdForMonth,
  formatStay,
  MONTH_NAMES,
  planItinerary,
  seasonFitScore,
  type ItineraryLeg,
} from "@/lib/season";
import {
  isFlexibleStart,
  resolveStartMonth,
  tripLegs,
  tripToStops,
} from "@/lib/trip-plan";
import { packingList } from "@/lib/packing";
import { assessTripHealth } from "@/lib/trip-health";
import { visaCheckUrl, visaFor, type Passport } from "@/lib/visa";
import { fetchWeather } from "@/lib/weather";
import type { Continent, Season, SightType } from "@/types";
import type { TripContextPayload } from "@/lib/assistant/types";

const CONTINENTS: Continent[] = [
  "Southeast Asia",
  "South Asia",
  "East Asia",
  "South America",
  "North America",
  "Europe",
  "Africa",
  "Oceania",
];

const SIGHT_TYPES: SightType[] = [
  "nature",
  "culture",
  "city",
  "beach",
  "wildlife",
];

function summarizeRegion(id: string) {
  const r = getRegion(id);
  if (!r) return null;
  const sightTypes = Array.from(new Set(r.sights.map((s) => s.type)));
  return {
    id: r.id,
    name: r.name,
    country: r.country,
    continent: r.continent,
    climateBlurb: r.climateBlurb,
    bestWindow: bestMonths(r),
    dailyBudgetUsd: r.dailyBudget ?? null,
    sightTypes,
    sightCount: r.sights.length,
    path: `/regions/${r.id}`,
  };
}

export function searchDestinations(input: {
  query?: string;
  continent?: string;
  month?: number;
  preferSeason?: Season;
  sightType?: SightType;
  maxDailyBudgetUsd?: number;
  limit?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 20);
  const q = (input.query ?? "").trim().toLowerCase();
  const continent = input.continent
    ? CONTINENTS.find(
        (c) => c.toLowerCase() === input.continent!.toLowerCase()
      )
    : undefined;

  let results = REGIONS.map((r) => {
    const month = input.month;
    const season = month ? climateForMonth(r, month).season : null;
    const crowd = month ? crowdForMonth(r, month) : null;
    const fit = month ? seasonFitScore(r, month) : null;
    const sightTypes = Array.from(new Set(r.sights.map((s) => s.type)));
    return { region: r, season, crowd, fit, sightTypes };
  });

  if (q) {
    results = results.filter(
      ({ region: r }) =>
        r.name.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q) ||
        r.id.includes(q) ||
        r.continent.toLowerCase().includes(q) ||
        r.climateBlurb.toLowerCase().includes(q)
    );
  }
  if (continent) {
    results = results.filter(({ region: r }) => r.continent === continent);
  }
  if (input.sightType && SIGHT_TYPES.includes(input.sightType)) {
    results = results.filter(({ sightTypes }) =>
      sightTypes.includes(input.sightType!)
    );
  }
  if (input.maxDailyBudgetUsd != null) {
    results = results.filter(
      ({ region: r }) =>
        r.dailyBudget != null && r.dailyBudget <= input.maxDailyBudgetUsd!
    );
  }
  if (input.preferSeason && input.month) {
    results = results.filter(({ season }) => season === input.preferSeason);
  }

  results.sort((a, b) => {
    if (a.fit != null && b.fit != null) return b.fit - a.fit;
    return a.region.name.localeCompare(b.region.name);
  });

  return {
    count: results.length,
    destinations: results.slice(0, limit).map(({ region: r, season, crowd, fit, sightTypes }) => ({
      id: r.id,
      name: r.name,
      country: r.country,
      continent: r.continent,
      bestWindow: bestMonths(r),
      dailyBudgetUsd: r.dailyBudget ?? null,
      sightTypes,
      monthSeason: season,
      monthCrowd: crowd,
      seasonFit: fit,
      path: `/regions/${r.id}`,
    })),
  };
}

export function getDestinationDetail(regionId: string) {
  const r = getRegion(regionId);
  if (!r) return { error: `Unknown destination id: ${regionId}` };

  const calendar = Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const c = climateForMonth(r, m);
      return [
        MONTH_NAMES[i],
        {
          season: c.season,
          crowd: crowdForMonth(r, m),
          note: c.note ?? null,
        },
      ];
    })
  );

  return {
    id: r.id,
    name: r.name,
    country: r.country,
    continent: r.continent,
    lat: r.lat,
    lng: r.lng,
    climateBlurb: r.climateBlurb,
    bestWindow: bestMonths(r),
    dailyBudgetUsd: r.dailyBudget ?? null,
    info: r.info ?? null,
    toolkit: r.toolkit
      ? {
          emergency: r.toolkit.emergency,
          tipping: r.toolkit.tipping,
          water: r.toolkit.water,
          samplePhrases: r.toolkit.phrases.slice(0, 4),
        }
      : null,
    sights: r.sights.map((s) => ({
      name: s.name,
      type: s.type,
      blurb: s.blurb,
    })),
    events: (r.events ?? []).map((e) => ({
      name: e.name,
      month: e.month,
      monthName: MONTH_NAMES[e.month - 1],
      blurb: e.blurb,
    })),
    calendar,
    path: `/regions/${r.id}`,
  };
}

export function getPackingForDestination(regionId: string, month: number) {
  const r = getRegion(regionId);
  if (!r) return { error: `Unknown destination id: ${regionId}` };
  const m = Math.min(12, Math.max(1, Math.round(month)));
  const climate = climateForMonth(r, m);
  return {
    regionId: r.id,
    name: r.name,
    month: m,
    monthName: MONTH_NAMES[m - 1],
    season: climate.season,
    groups: packingList(r, m),
  };
}

export function getVisaForDestination(
  regionIdOrCountry: string,
  passport: Passport
) {
  const byId = getRegion(regionIdOrCountry);
  const country = byId?.country ?? regionIdOrCountry;
  const status = visaFor(country, passport);
  return {
    country,
    regionId: byId?.id ?? null,
    passport,
    status: status ?? "No curated visa note — verify officially.",
    verifyUrl: visaCheckUrl(country, passport),
    note: "Indicative only; entry rules change. Always verify before travel.",
  };
}

/** Region plus the sight-type summary the assistant's scoring needs. */
function withSightTypes(id: string) {
  const region = getRegion(id);
  if (!region) return undefined;
  return {
    ...region,
    sightTypes: Array.from(new Set(region.sights.map((s) => s.type))),
  };
}

function resolveTripLegs(trip: TripContextPayload) {
  return {
    legs: tripLegs(trip, withSightTypes),
    start: resolveStartMonth(trip.start),
    flexible: isFlexibleStart(trip.start),
  };
}

export function assessTripFromContext(trip: TripContextPayload) {
  if (!trip.stops?.length) {
    const startMonth = resolveStartMonth(trip.start);
    return {
      tripName: trip.name ?? "Untitled trip",
      startMonth,
      startMonthName: MONTH_NAMES[startMonth - 1],
      flexibleStart: isFlexibleStart(trip.start),
      route: [] as {
        id: string;
        name: string;
        country: string;
        months: string[];
        seasonFit: number;
        seasons: string[];
        path: string;
      }[],
      health: {
        score: 0,
        label: "Needs work" as const,
        summary: "This trip has no stops yet. Suggest destinations first.",
        metrics: { weather: 0, crowds: 0, pace: 0, prep: 0 },
        warnings: [] as { severity: string; title: string; detail: string }[],
        strengths: [] as string[],
      },
    };
  }

  const { legs, start, flexible } = resolveTripLegs(trip);
  const report = assessTripHealth(legs, {
    isFlexibleStart: flexible,
    interests: trip.interests,
  });

  return {
    tripName: trip.name ?? "Untitled trip",
    startMonth: start,
    startMonthName: MONTH_NAMES[start - 1],
    flexibleStart: flexible,
    route: legs.map((leg) => ({
      id: leg.region.id,
      name: leg.region.name,
      country: leg.region.country,
      months: leg.months.map((m) => MONTH_NAMES[m - 1]),
      seasonFit: Math.round(leg.fit),
      seasons: leg.months.map((m) => climateForMonth(leg.region, m).season),
      path: `/regions/${leg.region.id}`,
    })),
    health: report,
  };
}

export function planRouteFromStops(
  stops: [string, number][],
  startMonth: number
) {
  const start = Math.min(12, Math.max(1, Math.round(startMonth) || 1));
  // Via the shared resolver rather than a local copy of the clamp: that copy
  // still rounded to whole months, so a fortnight the user had picked came
  // back to them as "1 month" in the assistant's own answer.
  const plannerStops = tripToStops({ start, stops }, getRegion);

  if (plannerStops.length === 0) {
    return { error: "No valid destination ids in stops." };
  }

  const legs = planItinerary(plannerStops, start);
  return {
    startMonth: start,
    startMonthName: MONTH_NAMES[start - 1],
    sequence: legs.map((leg, i) => ({
      order: i + 1,
      id: leg.region.id,
      name: leg.region.name,
      country: leg.region.country,
      durationMonths: leg.durationMonths ?? leg.months.length,
      stay: formatStay(leg.durationMonths ?? leg.months.length),
      months: leg.months.map((m) => MONTH_NAMES[m - 1]),
      seasonFit: Math.round(leg.fit),
      seasons: leg.months.map((m) => climateForMonth(leg.region, m).season),
      path: `/regions/${leg.region.id}`,
    })),
    averageFit: Math.round(
      legs.reduce((s, l) => s + l.fit, 0) / Math.max(legs.length, 1)
    ),
  };
}

export async function getLiveWeatherForRegion(regionId: string) {
  const r = getRegion(regionId);
  if (!r) return { error: `Unknown destination id: ${regionId}` };
  try {
    const weather = await fetchWeather(r.lat, r.lng);
    return {
      id: r.id,
      name: r.name,
      timezone: weather.timezone,
      current: weather.current,
      sunrise: weather.sunrise,
      sunset: weather.sunset,
      daily: weather.daily.slice(0, 5),
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Weather fetch failed",
      id: r.id,
      name: r.name,
    };
  }
}

export function listKnownContinents() {
  return CONTINENTS;
}

export function destinationCatalogSize() {
  return REGIONS.length;
}
