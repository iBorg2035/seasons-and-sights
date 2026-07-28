// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  PACKING_ENTITY,
  loadPacked,
  loadPackedRaw,
  packingKey,
  setPacked,
} from "@/lib/packing-progress";
import { mergeRecords, type TripRecord } from "@/lib/trip-records";
import { buildExportPayload } from "@/lib/data-export";
import { createTrip } from "@/lib/saved-trips";
import { packingList } from "@/lib/packing";
import { getRegion } from "@/data/regions";

beforeEach(() => localStorage.clear());

describe("packing ticks", () => {
  it("remembers a ticked item", () => {
    setPacked("t1", "peru-cusco", "Rain jacket", true);
    expect(loadPacked("t1").has(packingKey("peru-cusco", "Rain jacket"))).toBe(
      true
    );
  });

  it("keeps the same item separate per stop", () => {
    // The list renders per stop, so a tick under Cusco must not silently tick
    // the same item under Bangkok, where it may not even be listed.
    setPacked("t1", "peru-cusco", "Rain jacket", true);
    const packed = loadPacked("t1");

    expect(packed.has(packingKey("thailand-bangkok", "Rain jacket"))).toBe(false);
  });

  it("keeps trips apart", () => {
    setPacked("t1", "peru-cusco", "Rain jacket", true);
    expect(loadPacked("t2").size).toBe(0);
  });

  it("writes a tombstone when unticked", () => {
    setPacked("t1", "peru-cusco", "Rain jacket", true);
    setPacked("t1", "peru-cusco", "Rain jacket", false);

    expect(loadPacked("t1").size).toBe(0);
    expect(loadPackedRaw("t1")[0].deletedAt).toBeGreaterThan(0);
  });

  it("lets an untick beat an older tick from another device", () => {
    setPacked("t1", "peru-cusco", "Rain jacket", true);
    setPacked("t1", "peru-cusco", "Rain jacket", false);
    const local = loadPackedRaw("t1");
    const remote: TripRecord[] = [
      { id: local[0].id, updatedAt: local[0].updatedAt - 1000 },
    ];

    const { merged } = mergeRecords(local, remote);
    expect(merged[0].deletedAt).toBeDefined();
  });
});

describe("the key", () => {
  it("survives a change of month", () => {
    // Keying by month would wipe every tick the moment the trip's dates moved
    // — precisely when you least want to redo the packing.
    expect(packingKey("peru-cusco", "Rain jacket")).not.toContain("8");
    expect(packingKey("peru-cusco", "Rain jacket")).toBe(
      "peru-cusco::Rain jacket"
    );
  });

  it("matches items the list actually generates", () => {
    // A key built from an item string is only useful if it round-trips against
    // the real list; a stray trim or case change here would silently unstick
    // every tick.
    const region = getRegion("peru-cusco")!;
    const item = packingList(region, 8)[0].items[0];

    setPacked("t1", region.id, item, true);
    expect(loadPacked("t1").has(packingKey(region.id, item))).toBe(true);
  });
});

describe("the data export", () => {
  it("includes packing progress", () => {
    const trip = createTrip("Trip", { start: 9, stops: [["peru-cusco", 1]] })!;
    setPacked(trip.id, "peru-cusco", "Rain jacket", true);

    expect(buildExportPayload().packing[trip.id]).toEqual([
      "peru-cusco::Rain jacket",
    ]);
  });

  it("keeps packing and checklist in separate buckets", () => {
    // Same storage shape, different entities — a collision would have one list
    // showing the other's ticks.
    const trip = createTrip("Trip", { start: 9, stops: [["peru-cusco", 1]] })!;
    setPacked(trip.id, "peru-cusco", "Rain jacket", true);

    const payload = buildExportPayload();
    expect(payload.packing[trip.id]).toHaveLength(1);
    expect(payload.checklist[trip.id]).toBeUndefined();
  });

  it("uses its own storage key", () => {
    setPacked("t1", "peru-cusco", "Rain jacket", true);
    expect(PACKING_ENTITY).not.toBe("checklist");
    expect(localStorage.getItem("seasons-packing:t1")).toBeTruthy();
    expect(localStorage.getItem("seasons-checklist:t1")).toBeNull();
  });
});
