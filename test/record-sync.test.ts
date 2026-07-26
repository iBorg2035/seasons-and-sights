// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Cloud sync for journal entries and expenses. The load-bearing behaviour is
 * the tombstone round-trip: a delete on one device must survive a sync from
 * another, rather than the row being resurrected by the remote copy. That's
 * the failure mode `trips` has and this deliberately doesn't.
 */

const fake = {
  remoteRows: [] as Record<string, unknown>[],
  selectError: null as { message: string } | null,
  upserted: null as Record<string, unknown>[] | null,
  upsertError: null as { message: string } | null,
  deleteError: null as { message: string } | null,
  deletedTripId: null as string | null,
};

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: true,
  getSupabase: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: async () => ({ data: fake.remoteRows, error: fake.selectError }),
        }),
      }),
      upsert: async (rows: Record<string, unknown>[]) => {
        fake.upserted = rows;
        return { error: fake.upsertError };
      },
      delete: () => ({
        eq: async (_col: string, val: string) => {
          fake.deletedTripId = val;
          return { error: fake.deleteError };
        },
      }),
    }),
  }),
}));

import {
  syncRecords,
  pushRecords,
  fetchRemoteRecords,
  deleteRemoteRecords,
} from "@/lib/supabase/trip-records";
import {
  loadRecords,
  loadRecordsRaw,
  upsertRecord,
  deleteRecord,
  type TripRecord,
} from "@/lib/trip-records";

interface Note extends TripRecord {
  text?: string;
}

const T0 = 1_700_000_000_000;
const iso = (ms: number) => new Date(ms).toISOString();

function remoteRow(
  id: string,
  updatedMs: number,
  data: Record<string, unknown> = {},
  deletedMs?: number
) {
  return {
    trip_id: "t",
    entity: "journal",
    id,
    data,
    updated_at: iso(updatedMs),
    deleted_at: deletedMs ? iso(deletedMs) : null,
  };
}

beforeEach(() => {
  localStorage.clear();
  fake.remoteRows = [];
  fake.selectError = null;
  fake.upserted = null;
  fake.upsertError = null;
  fake.deleteError = null;
  fake.deletedTripId = null;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("fetchRemoteRecords", () => {
  it("maps columns back onto the record shape", async () => {
    fake.remoteRows = [remoteRow("n1", T0, { text: "hello" })];

    const rows = await fetchRemoteRecords<Note>("t", "journal");

    expect(rows).toEqual([{ id: "n1", updatedAt: T0, text: "hello" }]);
  });

  it("carries a remote tombstone through as a tombstone", async () => {
    fake.remoteRows = [remoteRow("n1", T0, {}, T0)];

    const [row] = await fetchRemoteRecords<Note>("t", "journal");

    expect(row.deletedAt).toBe(T0);
  });

  it("returns nothing when the read fails, rather than pretending it's empty-and-fine", async () => {
    fake.selectError = { message: "network down" };
    expect(await fetchRemoteRecords("t", "journal")).toEqual([]);
  });
});

describe("pushRecords", () => {
  it("splits key columns from the payload", async () => {
    await pushRecords<Note>("u1", "t", "journal", [
      { id: "n1", updatedAt: T0, text: "hello" },
    ]);

    expect(fake.upserted![0]).toMatchObject({
      user_id: "u1",
      trip_id: "t",
      entity: "journal",
      id: "n1",
      data: { text: "hello" },
      updated_at: iso(T0),
      deleted_at: null,
    });
  });

  it("sends no payload for a tombstone", async () => {
    await pushRecords<Note>("u1", "t", "journal", [
      { id: "n1", updatedAt: T0, deletedAt: T0, text: "should not be sent" },
    ]);

    // The local store already discarded the text; it must not be re-added on
    // the way to the cloud.
    expect(fake.upserted![0].data).toEqual({});
    expect(JSON.stringify(fake.upserted)).not.toContain("should not be sent");
  });

  it("skips the round trip entirely when there's nothing to push", async () => {
    expect(await pushRecords("u1", "t", "journal", [])).toBe(true);
    expect(fake.upserted).toBeNull();
  });
});

describe("syncRecords", () => {
  it("pulls remote rows this device has never seen", async () => {
    fake.remoteRows = [remoteRow("n1", T0, { text: "from the laptop" })];

    await syncRecords("u1", "t", "journal");

    expect(loadRecords<Note>("journal", "t").map((r) => r.text)).toEqual([
      "from the laptop",
    ]);
  });

  it("keeps a local delete deleted when the remote still has the row", async () => {
    // The whole point of tombstones: delete on the phone, sync from the
    // laptop's older copy, and the entry must NOT come back.
    upsertRecord<Note>("journal", "t", { id: "n1", text: "deleted here" }, T0);
    deleteRecord("journal", "t", "n1", T0 + 1000);
    fake.remoteRows = [remoteRow("n1", T0, { text: "deleted here" })];

    await syncRecords("u1", "t", "journal");

    expect(loadRecords("journal", "t")).toEqual([]);
    // And the tombstone is pushed, so the other device learns about it too.
    expect(fake.upserted).toHaveLength(1);
    expect(fake.upserted![0].deleted_at).toBe(iso(T0 + 1000));
  });

  it("applies a remote delete that happened after the local edit", async () => {
    upsertRecord<Note>("journal", "t", { id: "n1", text: "edited here" }, T0);
    fake.remoteRows = [remoteRow("n1", T0 + 1000, {}, T0 + 1000)];

    await syncRecords("u1", "t", "journal");

    expect(loadRecords("journal", "t")).toEqual([]);
  });

  it("lets a local edit made after a remote delete win", async () => {
    // Not a bug: someone edited the entry after the other device deleted it.
    upsertRecord<Note>("journal", "t", { id: "n1", text: "edited later" }, T0 + 2000);
    fake.remoteRows = [remoteRow("n1", T0, {}, T0)];

    await syncRecords("u1", "t", "journal");

    expect(loadRecords<Note>("journal", "t").map((r) => r.text)).toEqual([
      "edited later",
    ]);
  });

  it("takes the newer side per row and pushes only what local won", async () => {
    upsertRecord<Note>("journal", "t", { id: "newer-local", text: "local" }, T0 + 1000);
    upsertRecord<Note>("journal", "t", { id: "only-local", text: "mine" }, T0);
    fake.remoteRows = [
      remoteRow("newer-local", T0, { text: "stale remote" }),
      remoteRow("only-remote", T0, { text: "theirs" }),
      remoteRow("newer-remote", T0 + 5000, { text: "fresh remote" }),
    ];
    upsertRecord<Note>("journal", "t", { id: "newer-remote", text: "old local" }, T0);

    await syncRecords("u1", "t", "journal");

    const merged = loadRecords<Note>("journal", "t");
    expect(merged.map((r) => r.id).sort()).toEqual([
      "newer-local",
      "newer-remote",
      "only-local",
      "only-remote",
    ]);
    expect(merged.find((r) => r.id === "newer-local")!.text).toBe("local");
    expect(merged.find((r) => r.id === "newer-remote")!.text).toBe("fresh remote");

    expect(fake.upserted!.map((r) => r.id).sort()).toEqual([
      "newer-local",
      "only-local",
    ]);
  });

  it("does not drop local rows when the remote read fails", async () => {
    upsertRecord<Note>("journal", "t", { id: "n1", text: "mine" }, T0);
    fake.selectError = { message: "offline" };

    await syncRecords("u1", "t", "journal");

    // A failed read looks like "no remote rows"; local must survive it and be
    // pushed, not be wiped by an empty remote side.
    expect(loadRecords<Note>("journal", "t").map((r) => r.text)).toEqual(["mine"]);
  });
});

describe("deleteRemoteRecords", () => {
  it("removes every record for the trip", async () => {
    expect(await deleteRemoteRecords("trip-9")).toBe(true);
    expect(fake.deletedTripId).toBe("trip-9");
  });

  it("reports a failure rather than claiming success", async () => {
    fake.deleteError = { message: "denied" };
    expect(await deleteRemoteRecords("trip-9")).toBe(false);
  });
});

describe("round trip", () => {
  it("survives push → fetch without changing the record", async () => {
    upsertRecord<Note>("journal", "t", { id: "n1", text: "unicode ✈️ and, commas" }, T0);
    const local = loadRecordsRaw<Note>("journal", "t");

    await pushRecords("u1", "t", "journal", local);
    // Feed what was written back in as the remote side.
    fake.remoteRows = fake.upserted!.map((r) => ({
      trip_id: r.trip_id,
      entity: r.entity,
      id: r.id,
      data: r.data,
      updated_at: r.updated_at,
      deleted_at: r.deleted_at,
    })) as Record<string, unknown>[];

    expect(await fetchRemoteRecords<Note>("t", "journal")).toEqual(local);
  });
});
