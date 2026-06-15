export type Season = "dry" | "wet" | "shoulder";

export type Continent = "Southeast Asia" | "South America" | "Europe";

export type SightType = "nature" | "culture" | "city" | "beach" | "wildlife";

/** A single month's climate classification for a region. */
export interface MonthClimate {
  season: Season;
  /** Short context, e.g. "peak trekking", "typhoon risk", "salt-flat mirror". */
  note?: string;
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
}
