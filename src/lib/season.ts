import type { Region, Season, MonthClimate } from "@/types";

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
  { label: string; short: string; tone: string; dot: string; chip: string }
> = {
  dry: {
    label: "Dry season",
    short: "Dry",
    tone: "text-amber-700",
    dot: "bg-amber-500",
    chip: "bg-amber-100 text-amber-800 border-amber-200",
  },
  wet: {
    label: "Wet season",
    short: "Wet",
    tone: "text-sky-700",
    dot: "bg-sky-500",
    chip: "bg-sky-100 text-sky-800 border-sky-200",
  },
  shoulder: {
    label: "Shoulder season",
    short: "Shoulder",
    tone: "text-emerald-700",
    dot: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
};

/** 1-based month (1=Jan) for a Date, defaulting to now. */
export function monthOf(date: Date = new Date()): number {
  return date.getMonth() + 1;
}

/** The climate entry for a given month (1-12). */
export function climateForMonth(region: Region, month: number): MonthClimate {
  return region.months[month] ?? { season: "shoulder" };
}

/** The climate entry for the current month. */
export function getCurrentSeason(
  region: Region,
  date: Date = new Date()
): MonthClimate {
  return climateForMonth(region, monthOf(date));
}

/** 0-100 desirability score for visiting a region in a given month. */
export function seasonFitScore(region: Region, month: number): number {
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
function contiguousRuns(region: Region, seasons: Season[]): number[][] {
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
export function bestMonths(region: Region): string {
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

/**
 * Suggested check-in / check-out dates that land in the region's best season.
 * If already in a good season, suggests dates ~2 weeks out; otherwise the next
 * occurrence of the first dry month. Defaults to a 5-night stay.
 */
export function suggestTravelDates(
  region: Region,
  from: Date = new Date(),
  nights = 5
): { checkin: string; checkout: string } {
  const currentSeason = getCurrentSeason(region, from).season;
  let checkin: Date;

  if (currentSeason === "dry" || currentSeason === "shoulder") {
    checkin = new Date(from);
    checkin.setDate(checkin.getDate() + 14);
  } else {
    const runs = contiguousRuns(region, ["dry"]);
    const startMonth = runs.length
      ? runs.sort((a, b) => b.length - a.length)[0][0]
      : monthOf(from);
    const year =
      startMonth > monthOf(from) ? from.getFullYear() : from.getFullYear() + 1;
    checkin = new Date(year, startMonth - 1, 10);
  }

  const checkout = new Date(checkin);
  checkout.setDate(checkout.getDate() + nights);
  return { checkin: toISODate(checkin), checkout: toISODate(checkout) };
}

export interface ItineraryLeg {
  region: Region;
  /** 0-based order in the trip. */
  position: number;
  /** 1-based months of this stay (consecutive, may wrap the year). */
  months: number[];
  /** Average season fit (0-100) across the stay's months. */
  fit: number;
}

/**
 * Sequence destinations into back-to-back stays starting from `startMonth`,
 * assigning each to the time slot where its season fit is highest. Each stay
 * occupies `monthsPerStop` whole months. Greedy max-fit assignment over the
 * region × slot grid — good and deterministic for the handful of stops a trip
 * usually has.
 */
export function planItinerary(
  regions: Region[],
  startMonth: number,
  monthsPerStop: number
): ItineraryLeg[] {
  const n = regions.length;
  if (n === 0) return [];

  const slotMonths = (slot: number): number[] =>
    Array.from({ length: monthsPerStop }, (_, k) =>
      wrapMonth(startMonth + slot * monthsPerStop + k)
    );

  const slotFit = (region: Region, slot: number): number => {
    const months = slotMonths(slot);
    return (
      months.reduce((sum, m) => sum + seasonFitScore(region, m), 0) /
      months.length
    );
  };

  const candidates: { region: number; slot: number; score: number }[] = [];
  for (let r = 0; r < n; r++) {
    for (let slot = 0; slot < n; slot++) {
      candidates.push({ region: r, slot, score: slotFit(regions[r], slot) });
    }
  }
  // Highest fit first; ties resolve to earlier slots, then input order.
  candidates.sort(
    (a, b) => b.score - a.score || a.slot - b.slot || a.region - b.region
  );

  const regionTaken = new Array(n).fill(false);
  const slotToRegion = new Array<number>(n).fill(-1);
  let placed = 0;
  for (const c of candidates) {
    if (placed === n) break;
    if (regionTaken[c.region] || slotToRegion[c.slot] !== -1) continue;
    slotToRegion[c.slot] = c.region;
    regionTaken[c.region] = true;
    placed++;
  }

  return slotToRegion.map((r, slot) => ({
    region: regions[r],
    position: slot,
    months: slotMonths(slot),
    fit: slotFit(regions[r], slot),
  }));
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
  nights = 5
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
