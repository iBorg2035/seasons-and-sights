import { describe, it, expect } from "vitest";
import { ADVISORY, advisoryFor, type AdvisoryNote } from "@/data/advisories";
import { REGIONS } from "@/data/regions";

describe("advisories", () => {
  it("exposes a lookup keyed by country", () => {
    expect(ADVISORY["Thailand"]).toBeDefined();
    const t = ADVISORY["Thailand"] as AdvisoryNote;
    expect(["low", "moderate", "high"]).toContain(t.level);
    expect(t.text.length).toBeGreaterThan(10);
  });

  it("advisoryFor returns the country note when present", () => {
    expect(advisoryFor("Thailand")?.level).toBeDefined();
  });

  it("advisoryFor returns a neutral fallback for an unknown country", () => {
    const fb = advisoryFor("Atlantis");
    expect(fb).toBeDefined();
    expect(fb!.level).toBe("low");
    expect(fb!.text).toMatch(/check official/i);
  });

  it("covers every distinct destination country (no gaps)", () => {
    // Stronger than the plan's representative sample: iterate the real
    // dataset so a new destination country can't ship without an advisory
    // (this catches e.g. "Turkey" vs "Türkiye" naming drift).
    const countries = [...new Set(REGIONS.map((r) => r.country))];
    for (const country of countries) {
      expect(ADVISORY[country], `missing advisory for ${country}`).toBeDefined();
    }
  });
});
