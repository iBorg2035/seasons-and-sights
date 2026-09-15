import { describe, expect, it } from "vitest";
import { REGIONS_CORE } from "@/data/regions-core";
import { PASSPORTS, visaFor } from "@/lib/visa";

/**
 * Thailand cut visa-free stays from 60 days to 30 on 15 September 2026. The app
 * holds that fact in two separate places — each Thai destination's travel info
 * and the per-passport table — so updating one and missing the other would show
 * a traveller two different answers on the same page. Both are pinned here.
 */
describe("Thailand visa-free stay", () => {
  const thai = REGIONS_CORE.filter((r) => r.country === "Thailand");

  it("covers every Thai destination", () => {
    expect(thai.length).toBeGreaterThan(0);
  });

  it.each(thai.map((r) => [r.id, r.info?.visa ?? ""] as const))(
    "%s says 30 days, not the old 60",
    (_id, visa) => {
      expect(visa).toMatch(/30 days/);
      expect(visa).not.toMatch(/60/);
    }
  );

  it.each(PASSPORTS.map((p) => [p.code] as const))(
    "the %s passport view agrees",
    (code) => {
      const visa = visaFor("Thailand", code) ?? "";
      expect(visa).toMatch(/30 days/);
      expect(visa).not.toMatch(/60/);
    }
  );
});
