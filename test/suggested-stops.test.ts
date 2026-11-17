import { describe, expect, it } from "vitest";
import {
  applySuggestedStops,
  parseSuggestedStops,
} from "@/lib/assistant/suggested-stops";
import { suggestStopsFromInput } from "@/lib/assistant/tools-data";

const known = (id: string) => ["thailand-bangkok", "vietnam-danang"].includes(id);

describe("parseSuggestedStops", () => {
  it("keeps valid stops and drops unknown ids, duplicates and junk", () => {
    const stops = parseSuggestedStops(
      {
        stops: [
          { regionId: "thailand-bangkok", name: "Bangkok", durationMonths: 0.5 },
          { regionId: "atlantis", name: "Atlantis", durationMonths: 1 },
          { regionId: "thailand-bangkok", name: "Bangkok again", durationMonths: 2 },
          "nonsense",
          null,
          { regionId: "vietnam-danang", durationMonths: "lots" },
        ],
      },
      known
    );
    expect(stops).toEqual([
      { regionId: "thailand-bangkok", name: "Bangkok", durationMonths: 0.5 },
      { regionId: "vietnam-danang", name: "vietnam-danang", durationMonths: 1 },
    ]);
  });

  it("clamps durations to one night .. one year", () => {
    const [short, long] = parseSuggestedStops(
      {
        stops: [
          { regionId: "thailand-bangkok", durationMonths: 0 },
          { regionId: "vietnam-danang", durationMonths: 99 },
        ],
      },
      known
    );
    expect(short.durationMonths).toBeCloseTo(1 / 30);
    expect(long.durationMonths).toBe(12);
  });

  it("returns nothing for an error or malformed output", () => {
    expect(parseSuggestedStops({ error: "No valid destination ids" }, known)).toEqual([]);
    expect(parseSuggestedStops(undefined, known)).toEqual([]);
    expect(parseSuggestedStops({ stops: "x" }, known)).toEqual([]);
  });
});

describe("applySuggestedStops", () => {
  it("appends only destinations the trip doesn't already have", () => {
    const trip = { stops: [["thailand-bangkok", 1]] as [string, number][] };
    const added = applySuggestedStops(trip, [
      { regionId: "thailand-bangkok", name: "Bangkok", durationMonths: 2 },
      { regionId: "vietnam-danang", name: "Da Nang", durationMonths: 0.5 },
    ]);
    expect(added).toBe(1);
    expect(trip.stops).toEqual([
      ["thailand-bangkok", 1],
      ["vietnam-danang", 0.5],
    ]);
  });
});

describe("suggestStops tool", () => {
  it("resolves real ids and reports unknown ones without changing anything", () => {
    const out = suggestStopsFromInput([
      { regionId: "vietnam-danang", durationMonths: 1 },
      { regionId: "nowhere" },
    ]);
    expect(out.stops?.map((s) => s.regionId)).toEqual(["vietnam-danang"]);
    expect(out.unknown).toEqual(["nowhere"]);
  });

  it("errors when nothing resolves", () => {
    expect(suggestStopsFromInput([{ regionId: "nowhere" }])).toHaveProperty("error");
  });
});
