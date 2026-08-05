// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Foreign-currency expenses, and the guarantee that adding them changed
 * nothing for the dollars already logged.
 */

const fake = {
  remoteRows: [] as Record<string, unknown>[],
  upserted: null as Record<string, unknown>[] | null,
};

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: true,
  getSupabase: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: async () => ({ data: fake.remoteRows, error: null }),
        }),
      }),
      upsert: async (rows: Record<string, unknown>[]) => {
        fake.upserted = rows;
        return { error: null };
      },
    }),
  }),
}));

import {
  EXPENSE_ENTITY,
  describeAmount,
  listExpenses,
  saveExpense,
  totalCents,
  totalsByCategory,
  type Expense,
} from "@/lib/expenses";
import { saveRecords } from "@/lib/trip-records";
import { buildExportPayload } from "@/lib/data-export";
import { createTrip } from "@/lib/saved-trips";
import {
  fetchRemoteRecords,
  pushRecords,
} from "@/lib/supabase/trip-records";

const VND = { amountMinor: 250000, currency: "VND", unitsPerUsd: 25400 } as const;

beforeEach(() => {
  localStorage.clear();
  fake.remoteRows = [];
  fake.upserted = null;
});

describe("logging in a foreign currency", () => {
  it("keeps what was handed over and what it cost", () => {
    const e = saveExpense("t1", {
      day: "2026-08-12",
      amountCents: 984,
      category: "food",
      foreign: { ...VND },
    })!;

    expect(e.foreign).toEqual(VND);
    expect(e.amountCents).toBe(984);
  });

  it("counts toward the USD total and its category, like any expense", () => {
    // amountCents is the only figure the totals read — that is the whole
    // reason it stays canonical rather than becoming optional.
    saveExpense("t1", {
      day: "2026-08-12",
      amountCents: 984,
      category: "food",
      foreign: { ...VND },
    });
    saveExpense("t1", { day: "2026-08-12", amountCents: 1500, category: "food" });

    const all = listExpenses("t1");
    expect(totalCents(all)).toBe(2484);
    expect(totalsByCategory(all).food).toBe(2484);
  });

  it("shows the original with the dollars in brackets", () => {
    const foreign = { day: "2026-08-12", amountCents: 984, category: "food" } as const;
    const e = saveExpense("t1", { ...foreign, foreign: { ...VND } })!;
    const usd = saveExpense("t1", { ...foreign, day: "2026-08-13" })!;

    expect(describeAmount(e)).toBe("₫250,000 ($9.84)");
    expect(describeAmount(usd)).toBe("$9.84");
  });

  it("refuses a half-populated foreign amount rather than storing it", () => {
    const saved = saveExpense("t1", {
      day: "2026-08-12",
      amountCents: 984,
      category: "food",
      // No unitsPerUsd — the row would be unreadable on the way back out.
      foreign: { amountMinor: 250000, currency: "VND" } as never,
    });
    expect(saved).toBeNull();
  });
});

describe("expenses logged before any of this existed", () => {
  it("read back and sum exactly as they did", () => {
    saveExpense("t1", { day: "2026-08-12", amountCents: 1250, category: "food" });
    const [e] = listExpenses("t1");

    expect(e.foreign).toBeUndefined();
    expect(e.amountCents).toBe(1250);
    expect(totalCents(listExpenses("t1"))).toBe(1250);
    expect(describeAmount(e)).toBe("$12.50");
  });
});

describe("a row this build can't fully understand", () => {
  /** Written straight to storage, the way a newer client or a corrupt sync would. */
  function writeRaw(foreign: unknown) {
    saveRecords<Expense>(EXPENSE_ENTITY, "t1", [
      {
        id: "x",
        updatedAt: 1000,
        day: "2026-08-12",
        amountCents: 984,
        category: "food",
        foreign,
      } as Expense,
    ]);
  }

  it("keeps the expense and drops only the unreadable part", () => {
    // Losing the receipt's currency is cosmetic. Losing the expense is not.
    writeRaw({ amountMinor: 250000, currency: "ZZZ", unitsPerUsd: 25400 });

    const [e] = listExpenses("t1");
    expect(e.foreign).toBeUndefined();
    expect(e.amountCents).toBe(984);
    expect(totalCents(listExpenses("t1"))).toBe(984);
  });

  it("survives shapes that aren't objects at all", () => {
    for (const junk of [null, "VND", 42, {}, { amountMinor: -1 }]) {
      localStorage.clear();
      writeRaw(junk);
      expect(() => listExpenses("t1")).not.toThrow();
      expect(listExpenses("t1")[0].foreign).toBeUndefined();
    }
  });
});

describe("round trips", () => {
  it("survives the export's JSON encoding", () => {
    const trip = createTrip("Vietnam", { start: 8, stops: [["vietnam-hoian", 1]] })!;
    saveExpense(trip.id, {
      day: "2026-08-12",
      amountCents: 9843,
      category: "lodging",
      // Large enough that a precision slip would show.
      foreign: { amountMinor: 2_500_000, currency: "VND", unitsPerUsd: 25400 },
    });

    const written = JSON.parse(JSON.stringify(buildExportPayload()));

    expect(written.expenses[trip.id][0].foreign).toEqual({
      amountMinor: 2_500_000,
      currency: "VND",
      unitsPerUsd: 25400,
    });
  });

  it("survives the jsonb boundary the sync writes through", async () => {
    // toRow/fromRow are where a new field silently vanishes: toRow spreads the
    // record into `data`, fromRow spreads it back. Exercised through the
    // public push/fetch rather than by exporting internals.
    saveExpense("t1", {
      day: "2026-08-12",
      amountCents: 984,
      category: "food",
      foreign: { ...VND },
    });
    const local = listExpenses("t1");

    await pushRecords("user-1", "t1", EXPENSE_ENTITY, local);
    expect(fake.upserted).toHaveLength(1);
    expect((fake.upserted![0].data as Expense).foreign).toEqual(VND);

    fake.remoteRows = fake.upserted!.map((r) => ({
      id: r.id,
      data: r.data,
      updated_at: r.updated_at,
      deleted_at: null,
    }));
    const [back] = await fetchRemoteRecords<Expense>("t1", EXPENSE_ENTITY);

    expect(back.foreign).toEqual(VND);
    expect(back.amountCents).toBe(984);
  });
});
