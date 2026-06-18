import { describe, it, expect } from "vitest";
import { buildChecklistItems } from "@/lib/checklist";
import type { Region } from "@/types";

// Minimal stubs — buildChecklistItems only reads country + info fields.
function region(partial: Partial<Region>): Region {
  return partial as Region;
}

describe("buildChecklistItems", () => {
  it("always includes the universal prep items", () => {
    const keys = buildChecklistItems([]).map((i) => i.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "passport",
        "insurance",
        "copies",
        "bank",
        "health",
        "esim",
        "offline",
      ])
    );
  });

  it("flags only non-visa-free destinations and aggregates currencies", () => {
    const regions = [
      region({
        country: "India",
        info: {
          visa: "eVisa required",
          health: "Routine vaccinations",
          plugs: "Type D",
          currency: "Indian rupee (INR)",
        } as Region["info"],
      }),
      region({
        country: "Thailand",
        info: {
          visa: "Visa-free 30 days",
          health: "Dengue risk in the wet season",
          plugs: "Types A/B/C",
          currency: "Thai baht (THB)",
        } as Region["info"],
      }),
    ];
    const byKey = Object.fromEntries(
      buildChecklistItems(regions).map((i) => [i.key, i.label])
    );

    expect(byKey.visas).toContain("India");
    expect(byKey.visas).not.toContain("Thailand");
    expect(byKey.cash).toContain("INR");
    expect(byKey.cash).toContain("THB");
    expect(byKey.health).toContain("dengue");
  });

  it("uses the generic health line when no risks are flagged", () => {
    const items = buildChecklistItems([
      region({
        country: "Japan",
        info: {
          visa: "Visa-free 90 days",
          health: "Very safe; high-quality care",
          plugs: "Type A",
          currency: "Japanese yen (JPY)",
        } as Region["info"],
      }),
    ]);
    const health = items.find((i) => i.key === "health")!;
    expect(health.label).toMatch(/routine/i);
    expect(items.some((i) => i.key === "visas")).toBe(false);
  });
});
