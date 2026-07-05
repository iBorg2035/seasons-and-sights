import { describe, it, expect } from "vitest";
import { getRegion } from "@/data/regions";
import {
  getCurrentSeason,
  seasonFitScore,
  bestMonths,
  climateForMonth,
  datesForMonth,
  planItinerary,
  wrapMonth,
  crowdForMonth,
  estimateTripCost,
  estimateSpendSoFar,
  formatUsd,
  findActiveLeg,
  type ItineraryLeg,
  type ClimateRegion,
} from "@/lib/season";
import { REGIONS } from "@/data/regions";
import type { Region } from "@/types";

const cusco = getRegion("peru-cusco") as Region;
const bangkok = getRegion("thailand-bangkok") as Region;
const chiangmai = getRegion("thailand-chiangmai") as Region;
const samui = getRegion("thailand-kohsamui") as Region;

describe("getCurrentSeason", () => {
  it("reads the climate for the given date's month", () => {
    const june = new Date(2026, 5, 15); // June — Andean dry season peak
    expect(getCurrentSeason(cusco, june).season).toBe("dry");
    // Same month, the SE Asian monsoon is in full swing in Bangkok.
    expect(getCurrentSeason(bangkok, june).season).toBe("wet");
  });

  it("carries through the month note", () => {
    expect(climateForMonth(cusco, 6).note).toMatch(/peak dry/i);
  });
});

describe("seasonFitScore", () => {
  it("ranks dry over shoulder over wet", () => {
    expect(seasonFitScore(cusco, 6)).toBe(100); // dry
    expect(seasonFitScore(cusco, 4)).toBe(60); // shoulder (April)
    expect(seasonFitScore(cusco, 1)).toBe(20); // wet (January)
  });
});

describe("bestMonths", () => {
  it("formats a simple contiguous dry run", () => {
    expect(bestMonths(cusco)).toBe("May–Sep");
    expect(bestMonths(samui)).toBe("Feb–Aug");
  });

  it("handles a run that wraps across year-end", () => {
    expect(bestMonths(chiangmai)).toBe("Nov–Apr");
  });

  it("treats a Mediterranean dry summer as the best window", () => {
    const albania = getRegion("albania-riviera") as Region;
    const kotor = getRegion("montenegro-kotor") as Region;
    expect(albania.continent).toBe("Europe");
    expect(bestMonths(albania)).toBe("Jun–Sep");
    // Mediterranean winters are the wet season.
    expect(climateForMonth(kotor, 1).season).toBe("wet");
    expect(climateForMonth(kotor, 8).season).toBe("dry");
  });
});

describe("datesForMonth", () => {
  it("nudges ~2 weeks out when the picked month is the current one", () => {
    const from = new Date(2026, 5, 1); // June
    const { checkin, checkout } = datesForMonth(6, from);
    expect(checkin).toBe("2026-06-15");
    expect(checkout).toBe("2026-06-30"); // 15-day stay
  });

  it("uses this year for a later month", () => {
    const from = new Date(2026, 5, 1); // June
    expect(datesForMonth(9, from).checkin).toBe("2026-09-10"); // September
  });

  it("rolls to next year for an earlier month", () => {
    const from = new Date(2026, 5, 1); // June
    expect(datesForMonth(2, from).checkin).toBe("2027-02-10"); // February
  });
});

describe("planItinerary", () => {
  const stops = (durationMonths: number, ...ids: string[]) =>
    ids.map((id) => ({
      region: REGIONS.find((r) => r.id === id)!,
      durationMonths,
    }));

  it("sequences Brazil → SE Asia into dry/shoulder windows from September", () => {
    // Two months per stop, deliberately shuffled input order.
    const trip = stops(
      2,
      "vietnam-hoian",
      "brazil-rio",
      "philippines-palawan",
      "thailand-bangkok"
    );
    const legs = planItinerary(trip, 9);

    // Order should follow the seasons regardless of input order.
    expect(legs.map((l) => l.region.id)).toEqual([
      "brazil-rio", // Sep–Oct shoulder
      "thailand-bangkok", // Nov–Dec dry
      "philippines-palawan", // Jan–Feb dry
      "vietnam-hoian", // Mar–Apr dry
    ]);

    expect(legs[0].months).toEqual([9, 10]);
    expect(legs[3].months).toEqual([3, 4]);
    // Every stop should land in a usable (non-wet) window.
    expect(legs.every((l) => l.fit >= 50)).toBe(true);
  });

  it("respects per-stop durations when laying out the timeline", () => {
    const trip = [
      { region: REGIONS.find((r) => r.id === "brazil-rio")!, durationMonths: 1 },
      {
        region: REGIONS.find((r) => r.id === "thailand-bangkok")!,
        durationMonths: 2,
      },
    ];
    const legs = planItinerary(trip, 9); // September
    expect(legs.map((l) => l.region.id)).toEqual([
      "brazil-rio",
      "thailand-bangkok",
    ]);
    expect(legs[0].months).toEqual([9]); // Rio: 1 month (Sep)
    expect(legs[1].months).toEqual([10, 11]); // Bangkok: 2 months (Oct–Nov)
  });

  it("handles a 3-month stay across the year boundary", () => {
    const trip = [
      {
        region: REGIONS.find((r) => r.id === "thailand-bangkok")!,
        durationMonths: 3,
      },
    ];
    const legs = planItinerary(trip, 11); // November
    expect(legs[0].months).toEqual([11, 12, 1]); // Nov–Dec–Jan, all dry
    expect(legs[0].fit).toBe(100);
  });

  it("returns an empty plan for no destinations", () => {
    expect(planItinerary([], 1)).toEqual([]);
  });
});

describe("crowdForMonth", () => {
  it("derives crowds from the season by default", () => {
    expect(crowdForMonth(cusco, 6)).toBe("high"); // dry → busy
    expect(crowdForMonth(cusco, 1)).toBe("low"); // wet → quiet
    expect(crowdForMonth(cusco, 4)).toBe("mid"); // shoulder → moderate
  });

  it("honors explicit overrides that diverge from the weather", () => {
    const rio = getRegion("brazil-rio") as Region;
    // February is wet but Carnival packs the city.
    expect(climateForMonth(rio, 2).season).toBe("wet");
    expect(crowdForMonth(rio, 2)).toBe("high");
  });

  it("derives a high override from a festival month, even in wet season", () => {
    const kyoto = getRegion("japan-kyoto") as Region;
    // July is wet season (tsuyu) for Kyoto, but Gion Matsuri packs the city —
    // scripts/build-crowd-overrides.mjs should have flipped this to "high".
    expect(climateForMonth(kyoto, 7).season).toBe("wet");
    expect(crowdForMonth(kyoto, 7)).toBe("high");
  });

  it("leaves non-festival months on a festival-having region season-derived", () => {
    const kyoto = getRegion("japan-kyoto") as Region;
    // January has no curated festival for Kyoto; shoulder season → moderate.
    expect(climateForMonth(kyoto, 1).season).toBe("shoulder");
    expect(crowdForMonth(kyoto, 1)).toBe("mid");
  });

  it("keeps a region's manually curated override and note intact", () => {
    const rio = getRegion("brazil-rio") as Region;
    // December is wet season but Réveillon (NYE) is a manual override; the
    // derived-from-events pass must not clobber it or its note.
    expect(climateForMonth(rio, 12).season).toBe("wet");
    expect(crowdForMonth(rio, 12)).toBe("high");
    expect(climateForMonth(rio, 12).note).toMatch(/summer rains/);
  });
});

describe("events", () => {
  it("attaches marquee festivals to regions", () => {
    const rio = getRegion("brazil-rio") as Region;
    const carnival = rio.events?.find((e) => e.name === "Carnival");
    expect(carnival?.month).toBe(2);

    const kyoto = getRegion("japan-kyoto") as Region;
    expect(kyoto.events?.some((e) => /cherry blossom/i.test(e.name))).toBe(true);
  });
});

describe("budget", () => {
  it("attaches daily budgets and estimates trip cost", () => {
    const cusco = getRegion("peru-cusco") as Region;
    expect(cusco.dailyBudget).toBe(50);
    const legs = planItinerary([{ region: cusco, durationMonths: 2 }], 6);
    expect(estimateTripCost(legs)).toBe(3000); // 50 × 2 months × 30 days
    expect(formatUsd(3000)).toBe("$3,000");
  });
});

describe("estimateSpendSoFar", () => {
  const leg = (dailyBudget: number, months: number): ItineraryLeg<ClimateRegion> => ({
    region: { months: {}, dailyBudget } as unknown as ClimateRegion,
    position: 0,
    months: Array.from({ length: months }, (_, i) => i + 1),
    fit: 100,
  });

  it("counts a fully past leg as 100% spent", () => {
    const legs = [leg(50, 2)]; // 50 * 2 * 30 = 3000
    const ranges = [{ start: new Date(2026, 0, 1), end: new Date(2026, 2, 1) }];
    expect(estimateSpendSoFar(legs, ranges, new Date(2026, 5, 1))).toBe(3000);
  });

  it("counts a fully future leg as 0% spent", () => {
    const legs = [leg(50, 2)];
    const ranges = [{ start: new Date(2026, 6, 1), end: new Date(2026, 8, 1) }];
    expect(estimateSpendSoFar(legs, ranges, new Date(2026, 5, 1))).toBe(0);
  });

  it("prorates the active leg by real-calendar elapsed days", () => {
    const legs = [leg(30, 2)]; // 30 * 2 * 30 = 1800 total
    const ranges = [{ start: new Date(2026, 5, 1), end: new Date(2026, 7, 1) }]; // Jun 1 – Aug 1, 61 days
    const spent = estimateSpendSoFar(legs, ranges, new Date(2026, 6, 1)); // day 31
    expect(spent).toBeCloseTo(1800 * (31 / 61));
  });

  it("sums to no more than estimateTripCost across past + active + future legs", () => {
    const legs = [leg(40, 1), leg(60, 1), leg(20, 1)];
    const ranges = [
      { start: new Date(2026, 0, 1), end: new Date(2026, 1, 1) }, // past
      { start: new Date(2026, 1, 1), end: new Date(2026, 2, 1) }, // active
      { start: new Date(2026, 2, 1), end: new Date(2026, 3, 1) }, // future
    ];
    const now = new Date(2026, 1, 15);
    const total = estimateTripCost(legs);
    const spent = estimateSpendSoFar(legs, ranges, now);
    expect(spent).toBeGreaterThanOrEqual(0);
    expect(spent).toBeLessThanOrEqual(total);
  });

  it("returns 0 for an empty itinerary", () => {
    expect(estimateSpendSoFar([], [], new Date())).toBe(0);
  });

  it("skips a leg with no dailyBudget without affecting other legs' proration", () => {
    const legs = [leg(0, 1), leg(50, 1)];
    const ranges = [
      { start: new Date(2026, 0, 1), end: new Date(2026, 1, 1) },
      { start: new Date(2026, 1, 1), end: new Date(2026, 2, 1) },
    ];
    const spent = estimateSpendSoFar(legs, ranges, new Date(2026, 1, 15));
    expect(spent).toBeGreaterThan(0);
    expect(spent).toBeLessThanOrEqual(estimateTripCost(legs));
  });
});

describe("wrapMonth", () => {
  it("wraps months across the year boundary", () => {
    expect(wrapMonth(13)).toBe(1);
    expect(wrapMonth(0)).toBe(12);
    expect(wrapMonth(-1)).toBe(11);
  });
});

describe("findActiveLeg", () => {
  const ranges = (specs: [Date, Date][]) =>
    specs.map(([start, end]) => ({ start, end }));

  it("finds day 1 on the start date itself", () => {
    const r = ranges([[new Date(2026, 5, 1), new Date(2026, 7, 1)]]); // Jun 1 – Aug 1 (61 days)
    expect(findActiveLeg(r, new Date(2026, 5, 1))).toEqual({
      index: 0,
      day: 1,
      totalDays: 61,
    });
  });

  it("finds the last inclusive day (end is exclusive)", () => {
    const r = ranges([[new Date(2026, 5, 1), new Date(2026, 7, 1)]]);
    expect(findActiveLeg(r, new Date(2026, 6, 31))).toEqual({
      index: 0,
      day: 61,
      totalDays: 61,
    });
  });

  it("returns null before the trip starts", () => {
    const r = ranges([[new Date(2026, 5, 1), new Date(2026, 7, 1)]]);
    expect(findActiveLeg(r, new Date(2026, 4, 1))).toBeNull();
  });

  it("returns null after the trip ends", () => {
    const r = ranges([[new Date(2026, 5, 1), new Date(2026, 7, 1)]]);
    expect(findActiveLeg(r, new Date(2026, 7, 1))).toBeNull();
  });

  it("returns null for an empty ranges array", () => {
    expect(findActiveLeg([], new Date())).toBeNull();
  });

  it("picks the correct leg across a multi-leg trip and hands off cleanly at the boundary", () => {
    const r = ranges([
      [new Date(2026, 5, 1), new Date(2026, 6, 1)], // Jun, 30 days
      [new Date(2026, 6, 1), new Date(2026, 7, 1)], // Jul, 31 days
    ]);
    expect(findActiveLeg(r, new Date(2026, 6, 1))).toEqual({
      index: 1,
      day: 1,
      totalDays: 31,
    });
    expect(findActiveLeg(r, new Date(2026, 5, 30))).toEqual({
      index: 0,
      day: 30,
      totalDays: 30,
    });
  });
});
