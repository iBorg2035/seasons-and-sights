import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { REGIONS_CORE } from "@/data/regions-core";
import { REGIONS_SLIM } from "@/data/regions-slim";
import { SIGHTS } from "@/data/sights";
import { TOOLKITS } from "@/data/toolkits";
import sightSummary from "@/data/sight-summary.json";

/**
 * A destination is not one row — it is a row in regions-core plus entries in
 * sights, toolkits, wiki-titles, photos, the daily-budget and travel-info maps,
 * and two generated files. Adding one means touching nine places, and missing
 * any of them fails quietly: no type error, no crash, just a card with no photo
 * or a region page with an empty toolkit that nobody notices for months.
 *
 * So the invariant is asserted for every region at once rather than trusted to
 * whoever adds the next one.
 */

const SUMMARY = sightSummary as Record<string, { count: number; types: string[] }>;

describe("region dataset completeness", () => {
  it.each(REGIONS_CORE.map((r) => [r.id, r] as const))(
    "%s is fully populated",
    (id, region) => {
      expect(region.info, "travel info").toBeTruthy();
      expect(region.photo, "photo").toBeTruthy();
      expect(region.dailyBudget, "daily budget").toBeGreaterThan(0);
      expect(TOOLKITS[id], "toolkit").toBeTruthy();
      expect(SIGHTS[id]?.length, "sights").toBeGreaterThan(0);
    }
  );

  it("ships every referenced photo as a real file", () => {
    const missing = REGIONS_CORE.filter(
      (r) => r.photo?.startsWith("/") && !existsSync(`public${r.photo}`)
    ).map((r) => r.id);
    expect(missing).toEqual([]);
  });

  it("keeps photos local, so the app never hotlinks at runtime", () => {
    // download-photos.mjs exists to remove the runtime dependency on
    // Wikimedia; a remote URL here means it was not re-run after a fetch.
    const remote = REGIONS_CORE.filter((r) => r.photo?.startsWith("http")).map(
      (r) => r.id
    );
    expect(remote).toEqual([]);
  });

  it("has no duplicate ids", () => {
    const ids = REGIONS_CORE.map((r) => r.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it("classifies all twelve months for every region", () => {
    const bad = REGIONS_CORE.filter((r) => {
      const months = Object.keys(r.months).map(Number).sort((a, b) => a - b);
      return (
        months.length !== 12 ||
        months[0] !== 1 ||
        months[11] !== 12 ||
        Object.values(r.months).some(
          (m) => !["dry", "wet", "shoulder"].includes(m.season)
        )
      );
    }).map((r) => r.id);
    expect(bad).toEqual([]);
  });

  it("places every region somewhere real", () => {
    const bad = REGIONS_CORE.filter(
      (r) =>
        !Number.isFinite(r.lat) ||
        !Number.isFinite(r.lng) ||
        Math.abs(r.lat) > 90 ||
        Math.abs(r.lng) > 180 ||
        (r.lat === 0 && r.lng === 0)
    ).map((r) => r.id);
    expect(bad).toEqual([]);
  });

  it("keeps the generated sight summary in step with sights.ts", () => {
    // regions-slim reads this snapshot instead of sights.ts, so a stale file
    // means wrong sight counts on every card with no other symptom.
    const stale = REGIONS_CORE.filter((r) => {
      const actual = SIGHTS[r.id] ?? [];
      const summary = SUMMARY[r.id];
      if (!summary) return true;
      const types = [...new Set(actual.map((s) => s.type))].sort();
      return (
        summary.count !== actual.length ||
        [...summary.types].sort().join(",") !== types.join(",")
      );
    }).map((r) => r.id);
    expect(stale, "run: node scripts/build-sight-summary.mjs").toEqual([]);
  });

  it("exposes the same regions through the slim client dataset", () => {
    expect(REGIONS_SLIM.map((r) => r.id)).toEqual(REGIONS_CORE.map((r) => r.id));
  });
});
