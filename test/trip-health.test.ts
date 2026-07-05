import { describe, expect, it } from "vitest";
import { getRegion } from "@/data/regions";
import { planItinerary, type ItineraryLeg } from "@/lib/season";
import { assessTripHealth } from "@/lib/trip-health";
import type { Region, SightType } from "@/types";

function leg(id: string, startMonth: number, durationMonths = 1) {
  const region = getRegion(id) as Region;
  return planItinerary([{ region, durationMonths }], startMonth);
}

/** A minimal itinerary leg for testing interest-fit in isolation — real
 *  `Region`s from `getRegion()` don't carry `sightTypes` (that summary only
 *  exists on the client-safe `SlimRegion`), so these fixtures stand in. */
function fixtureLeg(sightTypes: SightType[] | undefined): ItineraryLeg<{
  id: string;
  name: string;
  country: string;
  sightTypes?: SightType[];
  months: Record<number, { season: "dry" }>;
}> {
  return {
    region: {
      id: "fixture",
      name: "Fixture",
      country: "Testland",
      sightTypes,
      months: { 6: { season: "dry" } },
    },
    position: 0,
    months: [6],
    fit: 100,
  };
}

describe("assessTripHealth", () => {
  it("scores a dry-season stay highly", () => {
    const report = assessTripHealth(leg("peru-cusco", 6));
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.label).toMatch(/Excellent|Strong/);
    expect(report.strengths.some((s) => /weather/i.test(s))).toBe(true);
  });

  it("warns when a stop lands in wet season", () => {
    const report = assessTripHealth(leg("thailand-bangkok", 6));
    expect(report.warnings.some((w) => /wet season/i.test(w.title))).toBe(true);
    expect(report.metrics.weather).toBeLessThan(50);
  });

  it("flags flexible starts as estimated", () => {
    const report = assessTripHealth(leg("peru-cusco", 6), {
      isFlexibleStart: true,
    });
    expect(report.warnings.some((w) => /Flexible start/i.test(w.title))).toBe(
      true
    );
  });
});

describe("assessTripHealth — interest fit", () => {
  it("is absent from the score and metrics when no interests are set (backward-compat)", () => {
    const withoutOption = assessTripHealth(leg("peru-cusco", 6));
    const withEmptyArray = assessTripHealth(leg("peru-cusco", 6), { interests: [] });
    expect(withoutOption.metrics.interestFit).toBeUndefined();
    expect(withEmptyArray.metrics.interestFit).toBeUndefined();
    expect(withEmptyArray.score).toBe(withoutOption.score);
  });

  it("scores 100 when a stop covers every picked interest", () => {
    const report = assessTripHealth([fixtureLeg(["beach", "wildlife"])], {
      interests: ["beach", "wildlife"],
    });
    expect(report.metrics.interestFit).toBe(100);
    expect(report.strengths.some((s) => /excited about/i.test(s))).toBe(true);
  });

  it("scores 0 when a stop matches none of the picked interests", () => {
    const report = assessTripHealth([fixtureLeg(["city"])], {
      interests: ["beach", "wildlife"],
    });
    expect(report.metrics.interestFit).toBe(0);
  });

  it("falls back to a neutral score for a stop with no curated sights yet", () => {
    const report = assessTripHealth([fixtureLeg(undefined)], {
      interests: ["beach"],
    });
    expect(report.metrics.interestFit).toBe(75);
  });

  it("pulls the overall score down for a stop with zero interest overlap", () => {
    const base = assessTripHealth([fixtureLeg(["city"])]);
    const withInterests = assessTripHealth([fixtureLeg(["city"])], {
      interests: ["beach"], // no overlap with the fixture's "city" sight type
    });
    expect(withInterests.metrics.interestFit).toBe(0);
    expect(withInterests.score).toBeLessThan(base.score);
  });
});
