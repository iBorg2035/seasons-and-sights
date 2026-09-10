import { describe, expect, it } from "vitest";
import { currentLegIndex, fallbackOrigin } from "@/lib/nearby-origin";
import type { SlimRegion } from "@/data/regions-slim";
import type { ItineraryLeg, DateRange } from "@/lib/season";

/**
 * Local-midnight dates, mirroring season.ts's parseDay. `day("2026-09-10")`
 * would be UTC midnight — an evening in the Americas — which makes every
 * boundary assertion below pass or fail depending on the machine's timezone.
 */
function day(iso: string, hour = 0): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, hour);
}

function range(start: string, end: string): DateRange {
  return { start: day(start), end: day(end) };
}

function leg(id: string, name: string, lat: number, lng: number) {
  return {
    region: { id, name, lat, lng } as SlimRegion,
    position: 0,
    months: [9],
    fit: 80,
  } as ItineraryLeg<SlimRegion>;
}

const DA_NANG = leg("vietnam-hoian", "Hoi An & Da Nang", 15.88, 108.33);
const BANGKOK = leg("thailand-bangkok", "Bangkok", 13.75, 100.5);

describe("currentLegIndex", () => {
  it("finds the leg containing today", () => {
    const ranges = [
      range("2026-09-01", "2026-09-08"),
      range("2026-09-08", "2026-09-20"),
    ];
    expect(currentLegIndex(ranges, day("2026-09-10", 9))).toBe(1);
  });

  it("prefers the arriving leg on a planned hand-off day (end is exclusive)", () => {
    const ranges = [
      range("2026-09-01", "2026-09-08"),
      range("2026-09-08", "2026-09-20"),
    ];
    expect(currentLegIndex(ranges, day("2026-09-08", 9))).toBe(1);
  });

  it("still places you at a booked stop on its departure day", () => {
    // A booked range's end is the checkout date parsed to midnight, so the
    // strict test alone would say you are nowhere on the day you fly out.
    const ranges = [range("2026-09-01", "2026-09-10")];
    expect(currentLegIndex(ranges, day("2026-09-10", 9))).toBe(0);
  });

  it("skips undated legs rather than matching them", () => {
    const ranges = [null, range("2026-09-08", "2026-09-20")];
    expect(currentLegIndex(ranges, day("2026-09-10"))).toBe(1);
  });

  it("returns -1 when today is outside every range", () => {
    const ranges = [range("2026-09-01", "2026-09-08")];
    expect(currentLegIndex(ranges, day("2026-10-01"))).toBe(-1);
  });

  it("returns -1 for an empty or fully undated trip", () => {
    expect(currentLegIndex([], day("2026-09-10"))).toBe(-1);
    expect(currentLegIndex([null, null], day("2026-09-10"))).toBe(-1);
  });
});

describe("fallbackOrigin", () => {
  it("centres on the stop you are actually on", () => {
    const origin = fallbackOrigin(
      [BANGKOK, DA_NANG],
      [range("2026-09-01", "2026-09-08"), range("2026-09-08", "2026-09-20")],
      day("2026-09-10")
    );
    expect(origin).toMatchObject({
      label: "Hoi An & Da Nang",
      lat: 15.88,
      source: "stop",
    });
  });

  it("falls back to the first stop before the trip starts", () => {
    const origin = fallbackOrigin(
      [BANGKOK, DA_NANG],
      [range("2026-11-01", "2026-11-08"), range("2026-11-08", "2026-11-20")],
      day("2026-09-10")
    );
    expect(origin?.label).toBe("Bangkok");
    expect(origin?.source).toBe("stop");
  });

  it("is null for a trip with no stops", () => {
    expect(fallbackOrigin([], [], day("2026-09-10"))).toBeNull();
  });
});
