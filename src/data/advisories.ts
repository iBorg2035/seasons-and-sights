// Curated, editorial safety guidance per destination country — one concise
// line plus a three-level indicator. Based on publicly available government
// advisory levels but phrased as guidance (not a live feed). Surfaced via the
// /api/region-detail route so it stays server-side. Country keys must match
// Region.country strings exactly (the advisories test enforces full coverage).

export type AdvisoryLevel = "low" | "moderate" | "high";

export interface AdvisoryNote {
  level: AdvisoryLevel;
  text: string;
}

const DOT: Record<AdvisoryLevel, string> = {
  low: "🟢",
  moderate: "🟡",
  high: "🔴",
};

const FALLBACK: AdvisoryNote = {
  level: "low",
  text: "No specific advisory — check official sources for your nationality.",
};

export const ADVISORY: Record<string, AdvisoryNote> = {
  // ── Southeast Asia ──
  Thailand: { level: "moderate", text: "Petty theft and bag-snatching in tourist hubs; road safety varies." },
  Vietnam: { level: "low", text: "Generally safe; watch for bag-snatching scooters in cities." },
  Cambodia: { level: "low", text: "Safe and welcoming; landmine risk only in remote rural areas." },
  Laos: { level: "low", text: "Very safe; unexploded ordnance in remote eastern regions." },
  Malaysia: { level: "low", text: "Safe; petty crime in Kuala Lumpur tourist areas." },
  Indonesia: { level: "moderate", text: "Exercise caution in Papua; otherwise safe in tourist regions." },
  Philippines: { level: "moderate", text: "Avoid parts of Mindanao; elsewhere welcoming and safe." },
  // ── South / East Asia ──
  India: { level: "moderate", text: "Petty crime common; women should take extra care, especially at night." },
  "Sri Lanka": { level: "low", text: "Recovering stability; check for any current civil unrest." },
  Nepal: { level: "low", text: "Safe; altitude sickness is the main risk when trekking." },
  Japan: { level: "low", text: "Very safe; earthquake awareness advised." },
  "South Korea": { level: "low", text: "Very safe." },
  Taiwan: { level: "low", text: "Very safe." },
  China: { level: "low", text: "Safe; increased surveillance and restricted topics online." },
  Maldives: { level: "low", text: "Very safe; conservative local islands." },
  // ── South America ──
  Brazil: { level: "moderate", text: "Petty crime and muggings in cities; avoid favelas." },
  Peru: { level: "moderate", text: "Petty theft common; altitude sickness in the Andes." },
  Bolivia: { level: "moderate", text: "Petty crime and protests; road safety poor." },
  Argentina: { level: "low", text: "Safe in tourist regions; bag-snatching in Buenos Aires." },
  Chile: { level: "moderate", text: "Occasional protests; otherwise safe." },
  "Argentina & Chile": { level: "low", text: "Patagonia is very safe; fierce weather and remoteness are the real risks." },
  Colombia: { level: "moderate", text: "Improved markedly; some rural areas still avoid for conflict." },
  Ecuador: { level: "moderate", text: "Crime in coastal cities; gang-related state of exception at times." },
  // ── Central / North America ──
  Mexico: { level: "moderate", text: "Avoid cartel-affected states; tourist regions generally safe." },
  "Costa Rica": { level: "low", text: "Very safe; petty theft is the main concern." },
  "Puerto Rico": { level: "low", text: "Safe (US territory); hurricane season June–November." },
  "United States": { level: "low", text: "Safe; healthcare is expensive — travel insurance strongly advised." },
  // ── Europe ──
  France: { level: "moderate", text: "Petty crime around Paris landmarks; protests can occur." },
  Italy: { level: "low", text: "Safe; pickpockets in Rome, Florence, and on transit." },
  Spain: { level: "low", text: "Safe; pickpockets in Barcelona and Madrid." },
  Portugal: { level: "low", text: "Very safe." },
  Greece: { level: "low", text: "Safe; petty theft on the islands in peak season." },
  Croatia: { level: "low", text: "Very safe." },
  Montenegro: { level: "low", text: "Very safe." },
  Albania: { level: "low", text: "Safe; road quality varies outside cities." },
  Turkey: { level: "moderate", text: "Avoid border areas; tourist regions stable." },
  // ── Africa ──
  Morocco: { level: "moderate", text: "Generally safe; petty harassment and mountain-area caution." },
  Egypt: { level: "moderate", text: "Safe at major sites; avoid Sinai and western desert except resorts." },
  Tanzania: { level: "moderate", text: "Safari regions safe; mugging risk in Dar es Salaam." },
  "South Africa": { level: "moderate", text: "High violent crime rate; use care in cities, avoid walking at night." },
  Kenya: { level: "moderate", text: "Safe on safari; crime and occasional unrest in Nairobi." },
  // ── Oceania ──
  Australia: { level: "low", text: "Very safe; sun, surf rips, and wildlife are the real risks." },
  "New Zealand": { level: "low", text: "Very safe; weather can turn quickly in the mountains." },
  "French Polynesia": { level: "low", text: "Very safe." },
};

export function advisoryFor(country: string): AdvisoryNote {
  return ADVISORY[country] ?? FALLBACK;
}

export function advisoryDot(level: AdvisoryLevel): string {
  return DOT[level];
}
