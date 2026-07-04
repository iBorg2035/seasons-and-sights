import { describe, expect, it } from "vitest";
import { getRegion } from "@/data/regions";
import { planItinerary } from "@/lib/season";
import { assessTripHealth } from "@/lib/trip-health";
import type { Region } from "@/types";

function leg(id: string, startMonth: number, durationMonths = 1) {
  const region = getRegion(id) as Region;
  return planItinerary([{ region, durationMonths }], startMonth);
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
