import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { ALL_TRIP_ENTITIES } from "@/lib/trip-entities";

/**
 * Every place that acts on "all of a trip's data" must actually mean all of it.
 *
 * This list had already drifted before the guard existed: deleting one trip
 * cleared six entities, deleting your whole account cleared three — so the
 * more destructive action cleaned up less, and a diary, packing list and
 * confirmed exchange rates survived an account deletion that promised to
 * remove everything. Held receipt photos survived it too.
 */

const read = (p: string) => readFileSync(`${process.cwd()}/${p}`, "utf8");

describe("the entity list", () => {
  it("contains every *_ENTITY the codebase defines", () => {
    // Discovered from source rather than hand-listed: a seventh entity added
    // to src/lib and forgotten here fails this immediately.
    const defined = new Set<string>();
    for (const file of readdirSync(`${process.cwd()}/src/lib`)) {
      if (!file.endsWith(".ts")) continue;
      for (const m of read(`src/lib/${file}`).matchAll(
        /export const \w*_ENTITY = "([^"]+)"/g
      )) {
        defined.add(m[1]);
      }
    }

    expect(defined.size).toBeGreaterThan(0);
    expect([...ALL_TRIP_ENTITIES].sort()).toEqual([...defined].sort());
  });
});

describe("wiping a trip's data", () => {
  const accountMenu = read("src/components/AccountMenu.tsx");
  const tripView = read("src/components/TripView.tsx");

  it("iterates the shared list rather than naming entities by hand", () => {
    // Hand-written lists are what drifted. Both callers must loop.
    expect(accountMenu).toContain("ALL_TRIP_ENTITIES");
    expect(tripView).toContain("ALL_TRIP_ENTITIES");
  });

  it("also clears held receipt photos, which are not trip-records", () => {
    // IndexedDB, outside the entity list, so it needs its own call in both
    // places — and leaving photos behind is the worst failure of the set.
    expect(accountMenu).toContain("clearQueue(");
    expect(tripView).toContain("clearQueue(");
  });
});

describe("the data export", () => {
  it("covers every entity that holds something the user typed", () => {
    // The export's own doc comment says a new per-trip entity belongs here;
    // FX rates were missing until this guard went in.
    const exportSrc = read("src/lib/data-export.ts");
    for (const fn of [
      "listEntries",
      "listExpenses",
      "listReservations",
      "loadTicks",
      "loadPacked",
      "loadRates",
    ]) {
      expect(exportSrc, `export should read ${fn}`).toContain(fn);
    }
  });
});
