import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Booked-mode fields crossing the network. Two things matter: rows written by
 * older clients must still parse (nothing here is required), and a payload
 * whose bookedDates got out of step with its stops must be re-aligned on read
 * rather than trusted — a misaligned array silently attributes every stay to
 * the wrong destination.
 */

const fake = {
  selectRows: [] as unknown[],
  selectError: null as { message: string } | null,
  upsertPayload: null as Record<string, unknown> | null,
  insertPayload: null as Record<string, unknown> | null,
  insertError: null as { message: string } | null,
  rpcRows: [] as unknown[],
  userId: "u1" as string | null,
};

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: true,
  getSupabase: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: fake.userId ? { id: fake.userId } : null },
      }),
    },
    rpc: async () => ({ data: fake.rpcRows, error: null }),
    from: () => ({
      select: () => ({
        order: async () => ({ data: fake.selectRows, error: fake.selectError }),
      }),
      upsert: async (payload: Record<string, unknown>) => {
        fake.upsertPayload = payload;
        return { error: null };
      },
      insert: async (payload: Record<string, unknown>) => {
        fake.insertPayload = payload;
        return { error: fake.insertError };
      },
    }),
  }),
}));

import {
  fetchRemoteTrips,
  upsertRemoteTrip,
  publishShare,
  fetchSharedTrip,
  mergeTrips,
  type SavedTrip,
} from "@/lib/supabase/trips";

const R1 = { start: "2026-07-03", end: "2026-07-17" };
const R2 = { start: "2026-07-17", end: "2026-08-01" };

beforeEach(() => {
  fake.selectRows = [];
  fake.selectError = null;
  fake.upsertPayload = null;
  fake.insertPayload = null;
  fake.insertError = null;
  fake.rpcRows = [];
  fake.userId = "u1";
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("reading remote trips", () => {
  it("parses a legacy row with no mode or dates", async () => {
    fake.selectRows = [
      {
        id: "t1",
        user_id: "u1",
        name: "Legacy",
        data: { start: 6, stops: [["japan-kyoto", 2]] },
        updated_at: "2026-07-01T00:00:00Z",
      },
    ];
    const [trip] = await fetchRemoteTrips();
    expect(trip.mode).toBeUndefined();
    expect(trip.bookedDates).toBeUndefined();
    expect(trip.stops).toEqual([["japan-kyoto", 2]]);
  });

  it("round-trips a booked row", async () => {
    fake.selectRows = [
      {
        id: "t1",
        user_id: "u1",
        name: "Booked",
        data: {
          start: 0,
          stops: [
            ["japan-kyoto", 1],
            ["thailand-bangkok", 1],
          ],
          mode: "booked",
          bookedDates: [R1, R2],
        },
        updated_at: "2026-07-01T00:00:00Z",
      },
    ];
    const [trip] = await fetchRemoteTrips();
    expect(trip.mode).toBe("booked");
    expect(trip.bookedDates).toEqual([R1, R2]);
  });

  it("re-aligns dates that arrive longer than the stops list", async () => {
    fake.selectRows = [
      {
        id: "t1",
        user_id: "u1",
        name: "Desynced",
        data: {
          start: 0,
          stops: [["japan-kyoto", 1]],
          mode: "booked",
          bookedDates: [R1, R2, R1], // stale extras from an older client
        },
      },
    ];
    const [trip] = await fetchRemoteTrips();
    expect(trip.bookedDates).toHaveLength(1);
    expect(trip.bookedDates![0]).toEqual(R1);
  });

  it("pads dates that arrive shorter than the stops list", async () => {
    fake.selectRows = [
      {
        id: "t1",
        user_id: "u1",
        name: "Short",
        data: {
          start: 0,
          stops: [
            ["japan-kyoto", 1],
            ["thailand-bangkok", 1],
          ],
          mode: "booked",
          bookedDates: [R1],
        },
      },
    ];
    const [trip] = await fetchRemoteTrips();
    expect(trip.bookedDates).toEqual([R1, null]);
  });
});

describe("writing remote trips", () => {
  it("sends mode and bookedDates in the payload", async () => {
    const trip: SavedTrip = {
      id: "t1",
      name: "B",
      start: 0,
      stops: [["japan-kyoto", 1]],
      mode: "booked",
      bookedDates: [R1],
    };
    await upsertRemoteTrip("u1", trip);
    expect(fake.upsertPayload).toMatchObject({
      data: { mode: "booked", bookedDates: [R1] },
    });
  });
});

describe("the share path", () => {
  it("carries interests, mode and dates (regression: interests were dropped)", async () => {
    await publishShare({
      id: "t1",
      name: "B",
      start: 0,
      stops: [["japan-kyoto", 1]],
      interests: ["culture"],
      mode: "booked",
      bookedDates: [R1],
    });
    expect(fake.insertPayload).toMatchObject({
      data: {
        interests: ["culture"],
        mode: "booked",
        bookedDates: [R1],
      },
    });
  });

  it("refuses to publish a payload that would breach the 8192-char CHECK", async () => {
    // Far more stops than any real trip, purely to exceed the column limit.
    const stops = Array.from(
      { length: 400 },
      () => ["some-fairly-long-region-id", 2] as [string, number]
    );
    const token = await publishShare({ name: "Huge", start: 1, stops });
    expect(token).toBeNull();
    // Crucially it never attempted the insert, so Postgres never rejects it.
    expect(fake.insertPayload).toBeNull();
  });

  it("returns the booked fields to the recipient", async () => {
    fake.rpcRows = [
      {
        name: "Shared",
        data: {
          start: 0,
          stops: [["japan-kyoto", 1]],
          interests: ["beach"],
          mode: "booked",
          bookedDates: [R1],
        },
      },
    ];
    const shared = await fetchSharedTrip("tok");
    expect(shared).toMatchObject({
      mode: "booked",
      interests: ["beach"],
      bookedDates: [R1],
    });
  });

  it("re-aligns a misaligned shared payload too", async () => {
    fake.rpcRows = [
      {
        name: "Shared",
        data: {
          start: 0,
          stops: [["japan-kyoto", 1]],
          mode: "booked",
          bookedDates: [R1, R2],
        },
      },
    ];
    const shared = await fetchSharedTrip("tok");
    expect(shared!.bookedDates).toEqual([R1]);
  });
});

describe("mergeTrips stays shape-agnostic", () => {
  it("merges a booked trip by updatedAt like any other", () => {
    const local: SavedTrip = {
      id: "t1",
      name: "local",
      start: 0,
      stops: [["japan-kyoto", 1]],
      mode: "booked",
      bookedDates: [R1],
      updatedAt: 200,
    };
    const remote: SavedTrip = {
      id: "t1",
      name: "remote",
      start: 6,
      stops: [["japan-kyoto", 1]],
      updatedAt: 100,
    };

    const { merged, toPush } = mergeTrips([local], [remote]);
    expect(merged[0].name).toBe("local");
    expect(merged[0].mode).toBe("booked");
    expect(merged[0].bookedDates).toEqual([R1]);
    expect(toPush).toHaveLength(1);

    // And the other direction: a newer remote wins, booked fields and all.
    const newerRemote: SavedTrip = { ...remote, updatedAt: 300, mode: "booked", bookedDates: [R2] };
    const second = mergeTrips([local], [newerRemote]);
    expect(second.merged[0].name).toBe("remote");
    expect(second.merged[0].bookedDates).toEqual([R2]);
  });
});
