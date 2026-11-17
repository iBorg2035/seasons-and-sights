import { describe, expect, it } from "vitest";
import { countryHref, countrySlug } from "@/lib/countries";
import { REGIONS } from "@/data/regions";

describe("country slugs", () => {
  it("makes URL-safe slugs", () => {
    expect(countrySlug("Thailand")).toBe("thailand");
    expect(countrySlug("South Korea")).toBe("south-korea");
    expect(countrySlug("Argentina & Chile")).toBe("argentina-chile");
    expect(countryHref("Hong Kong")).toBe("/countries/hong-kong");
  });

  // Two countries collapsing to one slug would merge their pages silently.
  it("gives every destination country its own non-empty slug", () => {
    const countries = [...new Set(REGIONS.map((r) => r.country))];
    const slugs = countries.map(countrySlug);
    expect(slugs.every((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s))).toBe(true);
    expect(new Set(slugs).size).toBe(countries.length);
  });
});
