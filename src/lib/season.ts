import type { Region, Season, MonthClimate, CrowdLevel, MonthlyClimate } from "@/types";

/** Minimal region shape needed by the planner and season helpers. */
export type ClimateRegion = { months: MonthlyClimate };

/** Normalize any integer to a 1-12 month, wrapping across the year. */
export function wrapMonth(month: number): number {
  return ((((month - 1) % 12) + 12) % 12) + 1;
}

export const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export const MONTH_NAMES_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** Display metadata for each season, reused across badges, strips, and legends. */
export const SEASON_META: Record<
  Season,
  { label: string; short: string; letter: string; tone: string; dot: string; chip: string }
> = {
  dry: {
    label: "Dry season",
    short: "Dry",
    letter: "D",
    tone: "text-amber-700",
    dot: "bg-amber-500",
    chip: "bg-amber-100 text-amber-800 border-amber-200",
  },
  wet: {
    label: "Wet season",
    short: "Wet",
    letter: "W",
    tone: "text-sky-700",
    dot: "bg-sky-500",
    chip: "bg-sky-100 text-sky-800 border-sky-200",
  },
  shoulder: {
    label: "Shoulder season",
    short: "Shoulder",
    letter: "S",
    tone: "text-emerald-700",
    dot: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
};

/** Display metadata for each crowd/price level. */
export const CROWD_META: Record<
  CrowdLevel,
  { label: string; short: string; letter: string; dot: string; chip: string }
> = {
  high: {
    label: "Busy & pricey",
    short: "Peak",
    letter: "$$$",
    dot: "bg-rose-500",
    chip: "bg-rose-100 text-rose-800 border-rose-200",
  },
  mid: {
    label: "Moderate",
    short: "Mid",
    letter: "$$",
    dot: "bg-violet-400",
    chip: "bg-violet-100 text-violet-800 border-violet-200",
  },
  low: {
    label: "Quiet & cheap",
    short: "Low",
    letter: "$",
    dot: "bg-teal-500",
    chip: "bg-teal-100 text-teal-800 border-teal-200",
  },
};

const CROWD_BY_SEASON: Record<Season, CrowdLevel> = {
  dry: "high",
  shoulder: "mid",
  wet: "low",
};

/**
 * Crowd/price level for a month: the region's explicit override if set,
 * otherwise derived from the season (dry→busy, shoulder→moderate, wet→quiet).
 */
export function crowdForMonth(region: ClimateRegion, month: number): CrowdLevel {
  const entry = region.months[month];
  return entry?.crowd ?? CROWD_BY_SEASON[entry?.season ?? "shoulder"];
}

/** 1-based month (1=Jan) for a Date, defaulting to now. */
export function monthOf(date: Date = new Date()): number {
  return date.getMonth() + 1;
}

/** The climate entry for a given month (1-12). */
export function climateForMonth(region: ClimateRegion, month: number): MonthClimate {
  return region.months[month] ?? { season: "shoulder" };
}

/** The climate entry for the current month. */
export function getCurrentSeason(
  region: ClimateRegion,
  date: Date = new Date()
): MonthClimate {
  return climateForMonth(region, monthOf(date));
}

/** 0-100 desirability score for visiting a region in a given month. */
export function seasonFitScore(region: ClimateRegion, month: number): number {
  switch (climateForMonth(region, month).season) {
    case "dry":
      return 100;
    case "shoulder":
      return 60;
    case "wet":
      return 20;
  }
}

/**
 * Contiguous runs of months matching `seasons`, treating the calendar as a
 * circle so ranges like Nov-Apr are returned as one run. Each run is a list of
 * 1-based month numbers in order.
 */
function contiguousRuns(region: ClimateRegion, seasons: Season[]): number[][] {
  const matches = (m: number) =>
    seasons.includes(climateForMonth(region, m).season);

  // If every month qualifies, it's a single year-round run.
  if ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].every(matches)) {
    return [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]];
  }

  const runs: number[][] = [];
  let current: number[] = [];
  // Walk twice around the circle so a wrap-around run is captured intact.
  for (let i = 0; i < 24; i++) {
    const month = (i % 12) + 1;
    if (matches(month)) {
      current.push(month);
    } else if (current.length) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length) runs.push(current);

  // De-duplicate runs produced by the double pass (a wrap-around run shows up
  // as the longest; shorter duplicates of the same months are dropped).
  const seen = new Set<string>();
  const unique: number[][] = [];
  for (const run of runs.sort((a, b) => b.length - a.length)) {
    const key = [...run].sort((a, b) => a - b).join(",");
    if (seen.has(key)) continue;
    // Skip a run whose months are a subset of one we already kept.
    if (unique.some((u) => run.every((m) => u.includes(m)))) continue;
    seen.add(key);
    unique.push(run.slice(0, 12));
  }
  return unique;
}

function formatRun(run: number[]): string {
  if (run.length >= 12) return "Year-round";
  if (run.length === 1) return MONTH_NAMES[run[0] - 1];
  return `${MONTH_NAMES[run[0] - 1]}–${MONTH_NAMES[run[run.length - 1] - 1]}`;
}

/** Human-readable best window(s) to visit, e.g. "Nov–Apr" or "May–Sep, Dec". */
export function bestMonths(region: ClimateRegion): string {
  const dryRuns = contiguousRuns(region, ["dry"]);
  const runs = dryRuns.length
    ? dryRuns
    : contiguousRuns(region, ["dry", "shoulder"]);
  if (!runs.length) return "No clear dry season";
  return runs
    .sort((a, b) => b.length - a.length)
    .slice(0, 2)
    .map(formatRun)
    .join(", ");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export interface ItineraryLeg<R extends ClimateRegion = Region> {
  region: R;
  /** 0-based order in the trip. */
  position: number;
  /** 1-based months of this stay (consecutive, may wrap the year). */
  months: number[];
  /** Average season fit (0-100) across the stay's months. */
  fit: number;
}

export interface PlannerStop<R extends ClimateRegion = Region> {
  region: R;
  /** How many whole months to stay. */
  durationMonths: number;
}

/** The 1-based months a stay covers, wrapping the year. */
function stayMonths(start: number, duration: number): number[] {
  return Array.from({ length: duration }, (_, k) => wrapMonth(start + k));
}

/** Average season fit over a stay's months. */
function stayFit(region: ClimateRegion, start: number, duration: number): number {
  const months = stayMonths(start, duration);
  return (
    months.reduce((sum, m) => sum + seasonFitScore(region, m), 0) /
    months.length
  );
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

/** All permutations of `items`, identity first (so ties favour input order). */
function permutations(items: number[]): number[][] {
  if (items.length <= 1) return [items];
  const result: number[][] = [];
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of permutations(rest)) result.push([items[i], ...tail]);
  }
  return result;
}

/**
 * Sequence stops — each with its own duration — into back-to-back stays from
 * `startMonth`, ordered so every stop lands in the best season possible. Since
 * durations vary, a stop's months depend on the order, so this is a sequencing
 * problem: solved exactly for up to 8 stops, greedily beyond that.
 */
export function planItinerary<R extends ClimateRegion>(
  stops: PlannerStop<R>[],
  startMonth: number
): ItineraryLeg<R>[] {
  const n = stops.length;
  if (n === 0) return [];

  const buildLegs = (
    order: number[]
  ): { legs: ItineraryLeg<R>[]; total: number } => {
    const legs: ItineraryLeg<R>[] = [];
    let cursor = startMonth;
    let total = 0;
    for (let pos = 0; pos < order.length; pos++) {
      const stop = stops[order[pos]];
      const fit = stayFit(stop.region, cursor, stop.durationMonths);
      legs.push({
        region: stop.region,
        position: pos,
        months: stayMonths(cursor, stop.durationMonths),
        fit,
      });
      total += fit;
      cursor += stop.durationMonths;
    }
    return { legs, total };
  };

  if (n <= 8) {
    let best: ItineraryLeg<R>[] = [];
    let bestTotal = -Infinity;
    for (const order of permutations(range(n))) {
      const { legs, total } = buildLegs(order);
      if (total > bestTotal) {
        bestTotal = total;
        best = legs;
      }
    }
    return best;
  }

  // Greedy fallback for large selections: at each step, go where it's best next.
  const remaining = range(n);
  const order: number[] = [];
  let cursor = startMonth;
  while (remaining.length) {
    let pick = 0;
    let pickFit = -Infinity;
    for (let j = 0; j < remaining.length; j++) {
      const stop = stops[remaining[j]];
      const fit = stayFit(stop.region, cursor, stop.durationMonths);
      if (fit > pickFit) {
        pickFit = fit;
        pick = j;
      }
    }
    const chosen = remaining.splice(pick, 1)[0];
    order.push(chosen);
    cursor += stops[chosen].durationMonths;
  }
  return buildLegs(order).legs;
}

const DAYS_PER_MONTH = 30;

/** Estimated cost of a single leg (daily budget × days). */
export function estimateLegCost(leg: ItineraryLeg<ClimateRegion>): number {
  return ((leg.region as { dailyBudget?: number }).dailyBudget ?? 0) * leg.months.length * DAYS_PER_MONTH;
}

/** Estimated total cost across all legs of an itinerary. */
export function estimateTripCost(legs: ItineraryLeg<ClimateRegion>[]): number {
  return legs.reduce((sum, leg) => sum + estimateLegCost(leg), 0);
}

/** Whole-dollar USD, e.g. "$2,400". */
export function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** Concrete back-to-back date ranges for legs, anchored to the next startMonth. */
export function legDateRanges(
  startMonth: number,
  legs: ItineraryLeg<ClimateRegion>[],
  from = new Date()
): { start: Date; end: Date }[] {
  const year =
    startMonth >= from.getMonth() + 1
      ? from.getFullYear()
      : from.getFullYear() + 1;
  let cursor = new Date(year, startMonth - 1, 1);
  return legs.map((l) => {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setMonth(end.getMonth() + l.months.length);
    cursor = new Date(end);
    return { start, end };
  });
}

/** Map an average fit score to a season-like quality bucket for display. */
export function fitQuality(fit: number): { season: Season; label: string } {
  if (fit >= 80) return { season: "dry", label: "Dry — ideal" };
  if (fit >= 50) return { season: "shoulder", label: "Shoulder — good" };
  return { season: "wet", label: "Wet — risky" };
}

/**
 * Check-in / check-out for the next occurrence of a specific month. Used when
 * the traveller picks a month directly. If it's the current month, nudges out
 * ~2 weeks; otherwise the 10th of the next time that month comes around.
 */
export function datesForMonth(
  month: number,
  from: Date = new Date(),
  nights = 15
): { checkin: string; checkout: string } {
  const current = monthOf(from);
  let checkin: Date;

  if (month === current) {
    checkin = new Date(from);
    checkin.setDate(checkin.getDate() + 14);
  } else {
    const year =
      month > current ? from.getFullYear() : from.getFullYear() + 1;
    checkin = new Date(year, month - 1, 10);
  }

  const checkout = new Date(checkin);
  checkout.setDate(checkout.getDate() + nights);
  return { checkin: toISODate(checkin), checkout: toISODate(checkout) };
}
