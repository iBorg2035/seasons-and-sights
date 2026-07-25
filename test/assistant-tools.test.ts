import { describe, it, expect } from "vitest";
import {
  assessTripFromContext,
  getDestinationDetail,
  getPackingForDestination,
  getVisaForDestination,
  planRouteFromStops,
  searchDestinations,
} from "@/lib/assistant/tools-data";

describe("assistant tools-data", () => {
  it("searchDestinations finds Bangkok and ranks by July season fit", () => {
    const hit = searchDestinations({ query: "bangkok", limit: 5 });
    expect(hit.destinations.some((d) => d.id === "thailand-bangkok")).toBe(
      true
    );

    const julyBeaches = searchDestinations({
      month: 7,
      sightType: "beach",
      preferSeason: "dry",
      limit: 10,
    });
    for (const d of julyBeaches.destinations) {
      expect(d.monthSeason).toBe("dry");
      expect(d.sightTypes).toContain("beach");
    }
  });

  it("getDestinationDetail returns calendar and sights", () => {
    const d = getDestinationDetail("peru-cusco");
    expect(d).not.toHaveProperty("error");
    if ("error" in d) return;
    expect(d.name).toMatch(/Cusco/i);
    expect(d.calendar.Jun || d.calendar.Jun === undefined).toBeTruthy();
    expect(Object.keys(d.calendar)).toHaveLength(12);
    expect(d.sights.length).toBeGreaterThan(0);
    expect(d.path).toBe("/regions/peru-cusco");
  });

  it("getPackingForDestination adds rain gear in Bangkok wet season", () => {
    const pack = getPackingForDestination("thailand-bangkok", 9);
    expect(pack).not.toHaveProperty("error");
    if ("error" in pack) return;
    const items = pack.groups.flatMap((g) => g.items);
    expect(items.some((i) => /rain/i.test(i))).toBe(true);
  });

  it("getVisaForDestination returns curated Thailand note", () => {
    const v = getVisaForDestination("thailand-bangkok", "US");
    expect(v.country).toBe("Thailand");
    expect(v.status.toLowerCase()).toMatch(/visa/);
    expect(v.verifyUrl).toMatch(/visa/i);
  });

  it("planRouteFromStops sequences stops from a start month", () => {
    const plan = planRouteFromStops(
      [
        ["thailand-bangkok", 1],
        ["japan-tokyo", 1],
      ],
      11
    );
    expect(plan).not.toHaveProperty("error");
    if ("error" in plan) return;
    expect(plan.sequence).toHaveLength(2);
    expect(plan.startMonthName).toBe("Nov");
    expect(plan.sequence[0].months.length).toBe(1);
  });

  it("assessTripFromContext scores a multi-stop trip", () => {
    const report = assessTripFromContext({
      name: "Test loop",
      start: 11,
      stops: [
        ["thailand-chiangmai", 1],
        ["vietnam-hanoi", 1],
      ],
      interests: ["culture"],
    });
    expect(report.route.length).toBe(2);
    expect(report.health.score).toBeGreaterThan(0);
    expect(report.health.label).toBeTruthy();
  });

  it("assessTripFromContext handles empty stops", () => {
    const report = assessTripFromContext({ start: 0, stops: [] });
    expect(report.health.score).toBe(0);
    expect(report.health.summary).toMatch(/no stops/i);
  });
});
