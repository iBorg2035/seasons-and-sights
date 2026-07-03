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
  formatUsd,
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

describe("wrapMonth", () => {
  it("wraps months across the year boundary", () => {
    expect(wrapMonth(13)).toBe(1);
    expect(wrapMonth(0)).toBe(12);
    expect(wrapMonth(-1)).toBe(11);
  });
});
