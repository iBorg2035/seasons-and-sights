import type { SightType, TravelInfo } from "@/types";
import {
  climateForMonth,
  crowdForMonth,
  type ClimateRegion,
  type ItineraryLeg,
} from "@/lib/season";

type TripHealthRegion = ClimateRegion & {
  id: string;
  name: string;
  country: string;
  dailyBudget?: number;
  info?: TravelInfo;
  sightTypes?: SightType[];
};

export type TripHealthSeverity = "info" | "watch" | "risk";

export interface TripHealthWarning {
  severity: TripHealthSeverity;
  title: string;
  detail: string;
}

export interface TripHealthReport {
  score: number;
  label: "Excellent" | "Strong" | "Mixed" | "Needs work";
  summary: string;
  metrics: {
    weather: number;
    crowds: number;
    pace: number;
    prep: number;
    /** Only present when `options.interests` was non-empty. */
    interestFit?: number;
  };
  warnings: TripHealthWarning[];
  strengths: string[];
}

function avg(values: number[]): number {
  if (values.length === 0) return 100;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function healthFlags(info?: TravelInfo): string[] {
  const text = (info?.health ?? "").toLowerCase();
  const flags: string[] = [];
  if (text.includes("malaria")) flags.push("malaria");
  if (text.includes("yellow fever")) flags.push("yellow fever");
  if (text.includes("altitude")) flags.push("altitude");
  if (text.includes("dengue")) flags.push("dengue");
  if (text.includes("typhoon") || text.includes("hurricane")) {
    flags.push("storm season");
  }
  if (text.includes("rip current") || text.includes("currents")) {
    flags.push("sea conditions");
  }
  return flags;
}

/** Neutral score for a leg whose region has no curated sights yet — neither
 *  rewarded nor penalized for an interest match we can't actually check. */
const NEUTRAL_INTEREST_FIT = 75;

/** Fraction of the traveler's picked interests represented at a leg's stop,
 *  0-100. Normalized by interest count (not sight-type count) so a stop that
 *  covers everything the traveler picked scores 100 regardless of how many
 *  *other* sight types it also has. */
function interestFitScore(sightTypes: SightType[] | undefined, interests: SightType[]): number {
  if (!sightTypes || sightTypes.length === 0) return NEUTRAL_INTEREST_FIT;
  const matched = interests.filter((i) => sightTypes.includes(i)).length;
  return Math.round((matched / interests.length) * 100);
}

function visaNeedsReview(info?: TravelInfo): boolean {
  const visa = (info?.visa ?? "").toLowerCase();
  if (!visa) return false;
  return (
    !visa.startsWith("visa-free") ||
    visa.includes("e-visa") ||
    visa.includes("visa on arrival") ||
    visa.includes("required")
  );
}

export function assessTripHealth<R extends TripHealthRegion>(
  legs: ItineraryLeg<R>[],
  options: { isFlexibleStart?: boolean; interests?: SightType[] } = {}
): TripHealthReport {
  const interests = options.interests?.length ? options.interests : undefined;
  const warnings: TripHealthWarning[] = [];
  const strengths: string[] = [];

  if (legs.length === 0) {
    return {
      score: 0,
      label: "Needs work",
      summary: "Add destinations to diagnose this trip.",
      metrics: { weather: 0, crowds: 0, pace: 0, prep: 0 },
      warnings: [],
      strengths: [],
    };
  }

  const weather = clampScore(avg(legs.map((leg) => leg.fit)));
  const allMonths = legs.flatMap((leg) =>
    leg.months.map((month) => ({ leg, month }))
  );
  const crowdScores = allMonths.map(({ leg, month }) => {
    const crowd = crowdForMonth(leg.region, month);
    if (crowd === "low") return 100;
    if (crowd === "mid") return 85;
    return 65;
  });
  const crowds = clampScore(avg(crowdScores));

  const totalMonths = allMonths.length;
  const pacePenalty =
    Math.max(0, legs.length - 4) * 5 + Math.max(0, totalMonths - 6) * 4;
  const pace = clampScore(100 - pacePenalty);

  const regions = legs.map((leg) => leg.region);
  const visaCount = regions.filter((region) => visaNeedsReview(region.info)).length;
  const flags = Array.from(new Set(regions.flatMap((region) => healthFlags(region.info))));
  const prep = clampScore(100 - visaCount * 8 - flags.length * 7);

  const wetLegs = legs.filter((leg) =>
    leg.months.some((month) => climateForMonth(leg.region, month).season === "wet")
  );
  for (const leg of wetLegs) {
    const wetMonths = leg.months.filter(
      (month) => climateForMonth(leg.region, month).season === "wet"
    );
    warnings.push({
      severity: leg.fit < 50 ? "risk" : "watch",
      title: `${leg.region.name} hits wet season`,
      detail: `${wetMonths.length} of ${leg.months.length} month${leg.months.length === 1 ? "" : "s"} in this stop are wet-season months.`,
    });
  }

  const peakMonths = allMonths.filter(
    ({ leg, month }) => crowdForMonth(leg.region, month) === "high"
  );
  if (peakMonths.length >= Math.max(2, Math.ceil(allMonths.length / 2))) {
    warnings.push({
      severity: "watch",
      title: "Peak crowds and prices",
      detail: `${peakMonths.length} month${peakMonths.length === 1 ? "" : "s"} land in busy, pricier periods.`,
    });
  }

  if (totalMonths > 6) {
    warnings.push({
      severity: "info",
      title: "Long route",
      detail: `${totalMonths} months total. Budget, visas, insurance, and onward tickets may need extra planning.`,
    });
  }

  if (legs.length > 6) {
    warnings.push({
      severity: "info",
      title: "Many transitions",
      detail: `${legs.length} stops can make the trip feel busy. Consider trimming if you want a slower pace.`,
    });
  }

  if (visaCount > 0) {
    warnings.push({
      severity: "watch",
      title: "Visa checks needed",
      detail: `${visaCount} destination${visaCount === 1 ? "" : "s"} mention visa steps beyond simple visa-free entry.`,
    });
  }

  if (flags.length > 0) {
    warnings.push({
      severity: "watch",
      title: "Health and safety prep",
      detail: `Plan around: ${flags.join(", ")}.`,
    });
  }

  if (options.isFlexibleStart) {
    warnings.push({
      severity: "info",
      title: "Flexible start is estimated",
      detail: "Set a start month for a firmer diagnosis.",
    });
  }

  if (weather >= 80) strengths.push("Most stops land in dry or shoulder weather.");
  if (crowds >= 85) strengths.push("Crowds and prices look manageable.");
  if (pace >= 85) strengths.push("The route pace looks comfortable.");
  if (prep >= 85) strengths.push("Entry and health prep look straightforward.");

  // Interest fit only enters the score when the traveler has picked
  // interests for this trip — otherwise the score is identical to before
  // this dimension existed.
  const interestFit = interests
    ? clampScore(avg(regions.map((region) => interestFitScore(region.sightTypes, interests))))
    : undefined;
  if (interestFit !== undefined && interestFit >= 80) {
    strengths.push("This route matches what you're excited about.");
  }

  const score = interestFit === undefined
    ? clampScore(weather * 0.5 + crowds * 0.18 + pace * 0.17 + prep * 0.15)
    : clampScore(
        weather * 0.44 + crowds * 0.1584 + pace * 0.1496 + prep * 0.132 + interestFit * 0.12
      );
  const label =
    score >= 85
      ? "Excellent"
      : score >= 70
        ? "Strong"
        : score >= 50
          ? "Mixed"
          : "Needs work";

  const summary =
    label === "Excellent"
      ? "This route is in very good shape."
      : label === "Strong"
        ? "This route works well with a few things to watch."
        : label === "Mixed"
          ? "This route has trade-offs worth reviewing."
          : "This route needs timing or scope changes.";

  return {
    score,
    label,
    summary,
    metrics: { weather, crowds, pace, prep, interestFit },
    warnings,
    strengths,
  };
}
