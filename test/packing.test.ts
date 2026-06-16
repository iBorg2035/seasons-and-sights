import { describe, it, expect } from "vitest";
import { packingList } from "@/lib/packing";
import { getRegion } from "@/data/regions";
import type { Region } from "@/types";

const flat = (region: Region, month: number) =>
  packingList(region, month).flatMap((g) => g.items);

describe("packingList", () => {
  it("adds rain gear in the wet season", () => {
    const bangkok = getRegion("thailand-bangkok") as Region; // Sep = wet
    const items = flat(bangkok, 9);
    expect(items.some((i) => /rain jacket/i.test(i))).toBe(true);
    expect(items.some((i) => /dry bag/i.test(i))).toBe(true);
  });

  it("adds sun gear in the dry season", () => {
    const bangkok = getRegion("thailand-bangkok") as Region; // Dec = dry
    const items = flat(bangkok, 12);
    expect(items.some((i) => /sunscreen/i.test(i))).toBe(true);
  });

  it("adds warm layers for cold/high-altitude regions", () => {
    const cusco = getRegion("peru-cusco") as Region;
    const items = flat(cusco, 6);
    expect(items.some((i) => /fleece|insulated/i.test(i))).toBe(true);
    expect(items.some((i) => /hiking boots/i.test(i))).toBe(true);
  });

  it("adds beach gear where there are beaches", () => {
    const palawan = getRegion("philippines-palawan") as Region;
    expect(flat(palawan, 2).some((i) => /swimwear/i.test(i))).toBe(true);
  });
});
