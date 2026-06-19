export type Season = "dry" | "wet" | "shoulder";

export type Continent =
  | "Southeast Asia"
  | "South Asia"
  | "East Asia"
  | "South America"
  | "North America"
  | "Europe"
  | "Africa"
  | "Oceania";

/** Crowd / price level — the "other half" of when to go. */
export type CrowdLevel = "high" | "mid" | "low";

export type SightType = "nature" | "culture" | "city" | "beach" | "wildlife";

/** A single month's climate classification for a region. */
export interface MonthClimate {
  season: Season;
  /** Short context, e.g. "peak trekking", "typhoon risk", "salt-flat mirror". */
  note?: string;
  /**
   * Crowd/price level for the month. Optional — when absent it is derived from
   * the season (dry→high, shoulder→mid, wet→low). Set it to capture divergences
   * like Rio's Carnival or holiday spikes that don't track the weather.
   */
  crowd?: CrowdLevel;
}

/** Months keyed 1 (January) through 12 (December). */
export type MonthlyClimate = Record<number, MonthClimate>;

export interface Sight {
  name: string;
  type: SightType;
  lat: number;
  lng: number;
  blurb: string;
  wiki?: string;
}

export interface Event {
  name: string;
  /** 1-based month the event falls in. */
  month: number;
  blurb: string;
}

/** Practical "know before you go" essentials (indicative for many nationalities). */
export interface TravelInfo {
  visa: string;
  currency: string;
  language: string;
  plugs: string;
  gettingThere: string;
  health: string;
}

export interface Phrase {
  en: string;
  local: string;
}

/** On-the-ground toolkit: phrases, emergency numbers, tipping and water norms. */
export interface TravelToolkit {
  phrases: Phrase[];
  emergency: string;
  tipping: string;
  water: string;
}

export interface Region {
  /** Stable slug, e.g. "peru-cusco". */
  id: string;
  name: string;
  country: string;
  continent: Continent;
  /** Representative coordinates for weather, map centering, and booking. */
  lat: number;
  lng: number;
  /** Destination string Booking.com understands, e.g. "Cusco, Peru". */
  bookingDest: string;
  climateBlurb: string;
  months: MonthlyClimate;
  sights: Sight[];
  /** Marquee festivals / events, if any. */
  events?: Event[];
  /** Rough mid-range cost per person per day, in USD. */
  dailyBudget?: number;
  /** Wikipedia article title the photo was sourced from. */
  wikiTitle?: string;
  /** Precomputed representative photo URL (see scripts/fetch-photos.mjs). */
  photo?: string;
  /** Practical travel essentials. */
  info?: TravelInfo;
  /** On-the-ground toolkit. */
  toolkit?: TravelToolkit;
}
