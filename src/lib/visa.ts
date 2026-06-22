// Coarse, indicative visa status for common passports, by destination country.
// Always paired with a "verify" link in the UI — entry rules change and depend
// on exact nationality. Overrides capture well-known passport-specific cases.

export type Passport = "US" | "UK" | "EU" | "CA" | "AU";

export const PASSPORTS: { code: Passport; label: string }[] = [
  { code: "US", label: "🇺🇸 US" },
  { code: "UK", label: "🇬🇧 UK" },
  { code: "EU", label: "🇪🇺 EU" },
  { code: "CA", label: "🇨🇦 Canada" },
  { code: "AU", label: "🇦🇺 Australia" },
];

type Rule = { default: string } & Partial<Record<Passport, string>>;

const VISA_RULES: Record<string, Rule> = {
  Thailand: { default: "Visa-free 30–60 days" },
  Indonesia: { default: "Visa on arrival (30 days)" },
  Vietnam: { default: "eVisa (up to 90 days)" },
  Cambodia: { default: "eVisa / visa on arrival" },
  Philippines: { default: "Visa-free ~30 days" },
  Peru: { default: "Visa-free up to 90–183 days" },
  Bolivia: { default: "Visa-free ~30 days", US: "Visa required (or on arrival)" },
  "Argentina & Chile": { default: "Visa-free 90 days" },
  Brazil: { default: "Visa-free 90 days", US: "eVisa required", CA: "eVisa required", AU: "eVisa required" },
  Colombia: { default: "Visa-free 90 days" },
  Chile: { default: "Visa-free 90 days" },
  Ecuador: { default: "Visa-free 90 days (+ Galápagos fees)" },
  Albania: { default: "Visa-free 90 days" },
  Montenegro: { default: "Visa-free 90 days" },
  "Sri Lanka": { default: "ETA / eVisa required" },
  Nepal: { default: "Visa on arrival" },
  Japan: { default: "Visa-free 90 days" },
  Morocco: { default: "Visa-free 90 days" },
  Tanzania: { default: "Visa required (eVisa / on arrival)" },
  Mexico: { default: "Visa-free up to 180 days" },
  India: { default: "eVisa required" },
  Turkey: { default: "Visa-free 90 days", US: "eVisa required", AU: "eVisa required" },
  Greece: { default: "Visa-free 90 days (Schengen)" },
  "South Africa": { default: "Visa-free up to 90 days" },
  "Costa Rica": { default: "Visa-free 90 days" },
  France: { default: "Visa-free 90 days (Schengen)" },
  Italy: { default: "Visa-free 90 days (Schengen)" },
  Australia: { default: "ETA / eVisitor required" },
  "New Zealand": { default: "NZeTA required (visa-free entry)" },
  Malaysia: { default: "Visa-free 90 days" },
};

/** Coarse visa status for a passport + country, or null if uncurated. */
export function visaFor(country: string, passport: Passport): string | null {
  const r = VISA_RULES[country];
  if (!r) return null;
  return r[passport] ?? r.default;
}

/** Authoritative-check link tailored to passport + destination. */
export function visaCheckUrl(country: string, passport: Passport): string {
  const name: Record<Passport, string> = {
    US: "US",
    UK: "UK",
    EU: "EU",
    CA: "Canadian",
    AU: "Australian",
  };
  return `https://www.google.com/search?q=${encodeURIComponent(
    `visa requirements ${country} for ${name[passport]} citizens`
  )}`;
}
