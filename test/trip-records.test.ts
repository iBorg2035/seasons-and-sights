// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  recordsKey,
  loadRecords,
  loadRecordsRaw,
  saveRecords,
  upsertRecord,
  deleteRecord,
  clearRecords,
  mergeRecords,
  type TripRecord,
} from "@/lib/trip-records";

interface Note extends TripRecord {
  text?: string;
}

const T0 = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  localStorage.clear();
});

describe("recordsKey", () => {
  it("scopes the key to the trip", () => {
    expect(recordsKey("journal", "trip-a")).toBe("seasons-journal:trip-a");
    expect(recordsKey("journal", "trip-a")).not.toBe(
      recordsKey("journal", "trip-b")
    );
    // Two entities on the same trip must not collide either.
    expect(recordsKey("journal", "t")).not.toBe(recordsKey("expense", "t"));
  });
});

describe("record storage", () => {
  it("keeps each trip's rows to itself", () => {
    upsertRecord<Note>("journal", "trip-a", { id: "n1", text: "Cusco" }, T0);

    // The cross-trip leak this repo already shipped once, on more personal
    // data: writing on one trip must not show up on another.
    expect(loadRecords<Note>("journal", "trip-b")).toEqual([]);
    expect(loadRecords<Note>("journal", "trip-a")).toHaveLength(1);
  });

  it("replaces a row by id instead of duplicating it", () => {
    upsertRecord<Note>("journal", "t", { id: "n1", text: "first" }, T0);
    upsertRecord<Note>("journal", "t", { id: "n1", text: "second" }, T0 + 1000);

    const rows = loadRecords<Note>("journal", "t");
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe("second");
    expect(rows[0].updatedAt).toBe(T0 + 1000);
  });

  it("stamps updatedAt even when the caller supplies one", () => {
    upsertRecord<Note>(
      "journal",
      "t",
      { id: "n1", text: "x", updatedAt: 1 },
      T0
    );
    expect(loadRecords<Note>("journal", "t")[0].updatedAt).toBe(T0);
  });

  it("survives a corrupt or non-array value in storage", () => {
    localStorage.setItem(recordsKey("journal", "t"), "{not json");
    expect(loadRecords("journal", "t")).toEqual([]);

    localStorage.setItem(recordsKey("journal", "t"), '{"a":1}');
    expect(loadRecords("journal", "t")).toEqual([]);
  });
});

describe("deleteRecord", () => {
  it("hides the row but leaves a tombstone behind", () => {
    upsertRecord<Note>("journal", "t", { id: "n1", text: "x" }, T0);
    deleteRecord("journal", "t", "n1", T0 + 1000);

    expect(loadRecords("journal", "t")).toEqual([]);
    // Without the tombstone a sync from another device resurrects the row.
    const raw = loadRecordsRaw("journal", "t");
    expect(raw).toHaveLength(1);
    expect(raw[0].deletedAt).toBe(T0 + 1000);
  });

  it("discards the row's content, not just its visibility", () => {
    upsertRecord<Note>("journal", "t", { id: "n1", text: "something private" }, T0);
    deleteRecord("journal", "t", "n1", T0 + 1000);

    expect(JSON.stringify(loadRecordsRaw("journal", "t"))).not.toContain(
      "something private"
    );
  });

  it("expires tombstones so storage can't grow forever", () => {
    upsertRecord<Note>("journal", "t", { id: "n1" }, T0);
    deleteRecord("journal", "t", "n1", T0);
    expect(loadRecordsRaw("journal", "t")).toHaveLength(1);

    // A later write past the TTL sweeps it; a write inside the TTL doesn't.
    saveRecords("journal", "t", loadRecordsRaw("journal", "t"), T0 + 100 * DAY);
    expect(loadRecordsRaw("journal", "t")).toHaveLength(1);

    saveRecords("journal", "t", loadRecordsRaw("journal", "t"), T0 + 200 * DAY);
    expect(loadRecordsRaw("journal", "t")).toHaveLength(0);
  });

  it("never expires live rows, however old", () => {
    upsertRecord<Note>("journal", "t", { id: "n1", text: "old" }, T0);
    saveRecords("journal", "t", loadRecordsRaw("journal", "t"), T0 + 5000 * DAY);
    expect(loadRecords("journal", "t")).toHaveLength(1);
  });
});

describe("clearRecords", () => {
  it("removes one trip's rows and leaves other trips alone", () => {
    upsertRecord<Note>("journal", "trip-a", { id: "n1" }, T0);
    upsertRecord<Note>("journal", "trip-b", { id: "n2" }, T0);

    clearRecords("journal", "trip-a");

    expect(loadRecordsRaw("journal", "trip-a")).toEqual([]);
    expect(loadRecords("journal", "trip-b")).toHaveLength(1);
  });
});

describe("mergeRecords", () => {
  const row = (id: string, updatedAt: number, extra: Partial<Note> = {}): Note => ({
    id,
    updatedAt,
    ...extra,
  });

  it("takes the newer side per id", () => {
    const { merged } = mergeRecords(
      [row("a", T0 + 1000, { text: "local" })],
      [row("a", T0, { text: "remote" })]
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].text).toBe("local");

    const back = mergeRecords(
      [row("a", T0, { text: "local" })],
      [row("a", T0 + 1000, { text: "remote" })]
    );
    expect(back.merged[0].text).toBe("remote");
  });

  it("keeps and pushes the local copy on a timestamp tie", () => {
    // Same `>=` rule as mergeTrips: on a tie local is the freshest intent, and
    // strict `>` would drop it from both the merge and the push list.
    const { merged, toPush } = mergeRecords(
      [row("a", T0, { text: "local" })],
      [row("a", T0, { text: "remote" })]
    );
    expect(merged[0].text).toBe("local");
    expect(toPush).toHaveLength(1);
  });

  it("unions both sides and pushes only local-only or locally-newer rows", () => {
    const { merged, toPush } = mergeRecords(
      [row("a", T0 + 1000), row("local-only", T0)],
      [row("a", T0), row("remote-only", T0)]
    );

    expect(merged.map((r) => r.id).sort()).toEqual([
      "a",
      "local-only",
      "remote-only",
    ]);
    expect(toPush.map((r) => r.id).sort()).toEqual(["a", "local-only"]);
  });

  it("lets a newer delete win over an older remote edit", () => {
    const { merged } = mergeRecords(
      [row("a", T0 + 1000, { deletedAt: T0 + 1000 })],
      [row("a", T0, { text: "edited elsewhere" })]
    );
    expect(merged[0].deletedAt).toBe(T0 + 1000);
  });

  it("lets a newer edit win over an older delete", () => {
    // The same rule in reverse — resurrection is correct here, not a bug:
    // someone edited the row after it was deleted on the other device.
    const { merged } = mergeRecords(
      [row("a", T0, { deletedAt: T0 })],
      [row("a", T0 + 1000, { text: "edited later" })]
    );
    expect(merged[0].deletedAt).toBeUndefined();
    expect(merged[0].text).toBe("edited later");
  });

  it("handles either side being empty", () => {
    expect(mergeRecords([], [row("a", T0)]).merged).toHaveLength(1);
    expect(mergeRecords([], [row("a", T0)]).toPush).toEqual([]);
    expect(mergeRecords([row("a", T0)], []).toPush).toHaveLength(1);
  });
});
