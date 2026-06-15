import { describe, it, expect } from "vitest";
import { getRegion } from "@/data/regions";
import {
  getCurrentSeason,
  seasonFitScore,
  bestMonths,
  climateForMonth,
  suggestTravelDates,
  datesForMonth,
  planItinerary,
  wrapMonth,
} from "@/lib/season";
import { REGIONS } from "@/data/regions";
import type { Region } from "@/types";

const cusco = getRegion("peru-cusco") as Region;
const bangkok = getRegion("thailand-bangkok") as Region;
const chiangmai = getRegion("thailand-chiangmai") as Region;
const samui = getRegion("thailand-kohsamui") as Region;
const uyuni = getRegion("bolivia-uyuni") as Region;

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

describe("suggestTravelDates", () => {
  it("nudges out ~2 weeks when already in a good season", () => {
    const from = new Date(2026, 5, 1); // June, Cusco dry
    const { checkin, checkout } = suggestTravelDates(cusco, from);
    expect(checkin).toBe("2026-06-15");
    expect(checkout).toBe("2026-06-20");
  });

  it("jumps to the next dry month when currently wet", () => {
    const from = new Date(2026, 0, 1); // January, Cusco wet
    const { checkin } = suggestTravelDates(cusco, from);
    expect(checkin).toBe("2026-05-10"); // first dry month (May)
  });

  it("works for a southern-hemisphere mirror-season flat", () => {
    // Uyuni dry season is May–Oct.
    const from = new Date(2026, 0, 1); // January, wet/mirror
    const { checkin } = suggestTravelDates(uyuni, from);
    expect(checkin).toBe("2026-05-10");
  });
});

describe("datesForMonth", () => {
  it("nudges ~2 weeks out when the picked month is the current one", () => {
    const from = new Date(2026, 5, 1); // June
    const { checkin, checkout } = datesForMonth(6, from);
    expect(checkin).toBe("2026-06-15");
    expect(checkout).toBe("2026-06-20");
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
  const pick = (...ids: string[]) =>
    ids.map((id) => REGIONS.find((r) => r.id === id)!);

  it("sequences Brazil → SE Asia into dry/shoulder windows from September", () => {
    const trip = pick(
      "vietnam-hoian",
      "brazil-rio",
      "philippines-palawan",
      "thailand-bangkok"
    );
    // Start in September, two months per stop.
    const legs = planItinerary(trip, 9, 2);

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

  it("returns an empty plan for no destinations", () => {
    expect(planItinerary([], 1, 2)).toEqual([]);
  });
});

describe("wrapMonth", () => {
  it("wraps months across the year boundary", () => {
    expect(wrapMonth(13)).toBe(1);
    expect(wrapMonth(0)).toBe(12);
    expect(wrapMonth(-1)).toBe(11);
  });
});
