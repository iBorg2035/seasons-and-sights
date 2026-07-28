// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  CHECKLIST_ENTITY,
  loadTicks,
  loadTicksRaw,
  migrateLegacyTicks,
  setTick,
  type ChecklistTick,
} from "@/lib/checklist-progress";
import { loadRecordsRaw, mergeRecords, recordsKey } from "@/lib/trip-records";
import { buildExportPayload } from "@/lib/data-export";
import { createTrip } from "@/lib/saved-trips";

const KEY = recordsKey(CHECKLIST_ENTITY, "t1");

beforeEach(() => localStorage.clear());

describe("ticking items", () => {
  it("remembers a tick", () => {
    setTick("t1", "passport", true);
    expect(loadTicks("t1")).toEqual(new Set(["passport"]));
  });

  it("keeps trips apart", () => {
    // The app shipped a cross-trip leak from a global key once.
    setTick("t1", "passport", true);
    expect(loadTicks("t2").size).toBe(0);
  });

  it("writes a tombstone when unticked, not a removal", () => {
    setTick("t1", "passport", true);
    setTick("t1", "passport", false);

    expect(loadTicks("t1").size).toBe(0);
    // The row survives as a tombstone. Without it the other device's older
    // tick would win the merge and the item would come back checked.
    const raw = loadTicksRaw("t1");
    expect(raw).toHaveLength(1);
    expect(raw[0].deletedAt).toBeGreaterThan(0);
  });

  it("lets an untick beat an older tick from another device", () => {
    setTick("t1", "passport", true);
    setTick("t1", "passport", false);
    const local = loadTicksRaw("t1");

    const remote: ChecklistTick[] = [
      { id: "passport", updatedAt: local[0].updatedAt - 1000 },
    ];
    const { merged } = mergeRecords(local, remote);

    expect(merged.find((r) => r.id === "passport")?.deletedAt).toBeDefined();
  });

  it("lets a newer tick from another device resurrect the item", () => {
    setTick("t1", "passport", true);
    setTick("t1", "passport", false);
    const local = loadTicksRaw("t1");

    const remote: ChecklistTick[] = [
      { id: "passport", updatedAt: local[0].updatedAt + 1000 },
    ];
    const { merged } = mergeRecords(local, remote);

    expect(merged.find((r) => r.id === "passport")?.deletedAt).toBeUndefined();
  });
});

describe("migrating the legacy string[] format", () => {
  /**
   * The legacy format lived under the exact key the records store now uses.
   * Unmigrated, loadRecordsRaw parses ["passport"] and hands back strings where
   * records are expected — every one of which would sync to the cloud with no
   * id.
   */
  it("converts ticks written by the old version", () => {
    localStorage.setItem(KEY, JSON.stringify(["passport", "insurance"]));

    expect(migrateLegacyTicks("t1")).toBe(true);
    expect(loadTicks("t1")).toEqual(new Set(["passport", "insurance"]));
  });

  it("produces real records, not bare strings", () => {
    localStorage.setItem(KEY, JSON.stringify(["passport"]));
    migrateLegacyTicks("t1");

    const rows = loadRecordsRaw(CHECKLIST_ENTITY, "t1");
    expect(typeof rows[0]).toBe("object");
    expect(rows[0].id).toBe("passport");
    expect(rows[0].updatedAt).toBeGreaterThan(0);
  });

  it("stamps them as current so they aren't lost to an empty cloud", () => {
    localStorage.setItem(KEY, JSON.stringify(["passport"]));
    migrateLegacyTicks("t1", 5_000);

    const { merged } = mergeRecords(loadTicksRaw("t1"), [
      { id: "passport", updatedAt: 4_999, deletedAt: 4_999 },
    ]);
    expect(merged.find((r) => r.id === "passport")?.deletedAt).toBeUndefined();
  });

  it("runs once and then leaves the data alone", () => {
    localStorage.setItem(KEY, JSON.stringify(["passport"]));
    migrateLegacyTicks("t1");
    const after = localStorage.getItem(KEY);

    expect(migrateLegacyTicks("t1")).toBe(false);
    expect(localStorage.getItem(KEY)).toBe(after);
  });

  it("does nothing to an empty or absent store", () => {
    expect(migrateLegacyTicks("t1")).toBe(false);
    localStorage.setItem(KEY, "[]");
    expect(migrateLegacyTicks("t1")).toBe(false);
  });

  it("survives a corrupt value", () => {
    localStorage.setItem(KEY, "{not json");
    expect(migrateLegacyTicks("t1")).toBe(false);
    expect(loadTicks("t1").size).toBe(0);
  });

  it("is applied on read, so a device that never ticks anything still upgrades", () => {
    localStorage.setItem(KEY, JSON.stringify(["passport"]));
    expect(loadTicks("t1")).toEqual(new Set(["passport"]));
    expect(typeof loadRecordsRaw(CHECKLIST_ENTITY, "t1")[0]).toBe("object");
  });
});

describe("the data export", () => {
  it("includes checklist progress", () => {
    // An export that silently omits data reads as "this is all of it".
    const trip = createTrip("Trip", { start: 9, stops: [["peru-cusco", 1]] })!;
    setTick(trip.id, "passport", true);

    expect(buildExportPayload().checklist[trip.id]).toEqual(["passport"]);
  });

  it("omits unticked items rather than exporting tombstones", () => {
    const trip = createTrip("Trip", { start: 9, stops: [["peru-cusco", 1]] })!;
    setTick(trip.id, "passport", true);
    setTick(trip.id, "passport", false);

    expect(buildExportPayload().checklist[trip.id]).toBeUndefined();
  });
});
