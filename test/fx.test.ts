// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  FX_ENTITY,
  SNAPSHOT_CAPTURED_AT,
  clearRate,
  isSnapshotStale,
  isUsableRate,
  loadRates,
  rateFor,
  setRate,
  suggestedRate,
  type FxRate,
} from "@/lib/fx";
import { saveRecords } from "@/lib/trip-records";
import { listExpenses, saveExpense, totalCents } from "@/lib/expenses";

beforeEach(() => localStorage.clear());

describe("a trip's own rates", () => {
  it("remembers a confirmed rate", () => {
    expect(setRate("t1", "VND", 25400)).toBe(true);
    expect(loadRates("t1").VND).toBe(25400);
  });

  it("keeps trips apart", () => {
    setRate("t1", "VND", 25400);
    expect(loadRates("t2").VND).toBeUndefined();
  });

  it("prefers the trip's rate over the suggestion", () => {
    setRate("t1", "VND", 26000);
    expect(rateFor("t1", "VND")).toEqual({ unitsPerUsd: 26000, source: "trip" });
  });

  it("falls back to the suggestion, and says so", () => {
    const r = rateFor("t1", "VND")!;
    expect(r.source).toBe("suggested");
    expect(r.unitsPerUsd).toBe(suggestedRate("VND"));
  });

  it("falls back to the suggestion again once an override is cleared", () => {
    setRate("t1", "VND", 26000);
    clearRate("t1", "VND");
    expect(rateFor("t1", "VND")?.source).toBe("suggested");
  });
});

describe("rates that would break the arithmetic", () => {
  it("refuses to store one", () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(setRate("t1", "VND", bad)).toBe(false);
    }
    expect(loadRates("t1").VND).toBeUndefined();
  });

  it("ignores an unusable row that reached storage anyway", () => {
    // Rows arrive from the cloud written by whatever client version.
    saveRecords<FxRate>(FX_ENTITY, "t1", [
      { id: "VND", updatedAt: 1, unitsPerUsd: 0 },
      { id: "ZZZ", updatedAt: 1, unitsPerUsd: 5 } as FxRate,
      { id: "PEN", updatedAt: 1, unitsPerUsd: 3.75 },
    ]);

    const rates = loadRates("t1");
    expect(rates.VND).toBeUndefined();
    expect(rates.PEN).toBe(3.75);
    expect(Object.keys(rates)).toEqual(["PEN"]);
  });

  it("has a guard the UI can call before saving", () => {
    expect(isUsableRate(25400)).toBe(true);
    expect(isUsableRate("25400")).toBe(false);
    expect(isUsableRate(0)).toBe(false);
  });
});

describe("the committed snapshot", () => {
  it("carries a parseable capture date", () => {
    expect(Number.isFinite(Date.parse(SNAPSHOT_CAPTURED_AT))).toBe(true);
  });

  it("is fresh on the day it was captured and stale much later", () => {
    const captured = new Date(SNAPSHOT_CAPTURED_AT);
    const plusDays = (n: number) =>
      new Date(captured.getTime() + n * 86_400_000);

    expect(isSnapshotStale(plusDays(1))).toBe(false);
    expect(isSnapshotStale(plusDays(89))).toBe(false);
    expect(isSnapshotStale(plusDays(120))).toBe(true);
  });
});

describe("correcting a rate later", () => {
  it("does not change what an already-logged expense cost", () => {
    // The rate is captured on the expense precisely so that fixing a bad rate
    // in October doesn't quietly rewrite August's spending.
    setRate("t1", "VND", 25400);
    saveExpense("t1", {
      day: "2026-08-12",
      amountCents: 984,
      category: "food",
      foreign: { amountMinor: 250000, currency: "VND", unitsPerUsd: 25400 },
    });

    setRate("t1", "VND", 30000);

    const [e] = listExpenses("t1");
    expect(e.foreign?.unitsPerUsd).toBe(25400);
    expect(e.amountCents).toBe(984);
    expect(totalCents(listExpenses("t1"))).toBe(984);
  });
});
