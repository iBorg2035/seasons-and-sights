/**
 * URL slug for a country name — "South Korea" → "south-korea",
 * "Argentina & Chile" → "argentina-chile". Pure string work, so both the
 * server pages and client links can use it without importing region data.
 */
export function countrySlug(country: string): string {
  return country
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** `/countries/<slug>` for a country name. */
export function countryHref(country: string): string {
  return `/countries/${countrySlug(country)}`;
}
