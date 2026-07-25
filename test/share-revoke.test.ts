import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Share revocation. The load-bearing behaviour is that a delete which matched
 * nothing (RLS filtered it — not your link, or already gone) must report as a
 * FAILURE, never a silent success: the UI must not tell you a link is dead
 * while it's still live. Same reason upsertRemoteTrip checks its updated row.
 */

const fake = {
  deleteError: null as { message: string } | null,
  deleteReturns: [{ token: "tok-1" }] as { token: string }[] | null,
  insertPayload: null as Record<string, unknown> | null,
  insertError: null as { message: string } | null,
  selectRows: [] as unknown[],
  selectError: null as { message: string } | null,
  userId: "user-1" as string | null,
};

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: true,
  getSupabase: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: fake.userId ? { id: fake.userId } : null },
      }),
    },
    from: () => ({
      insert: async (payload: Record<string, unknown>) => {
        fake.insertPayload = payload;
        return { error: fake.insertError };
      },
      delete: () => ({
        eq: () => ({
          select: async () => ({
            data: fake.deleteReturns,
            error: fake.deleteError,
          }),
        }),
      }),
      select: () => ({
        order: async () => ({ data: fake.selectRows, error: fake.selectError }),
      }),
    }),
  }),
}));

import { publishShare, revokeShare, listMyShares } from "@/lib/supabase/trips";
import { getSyncStatus, getLastErrorMessage } from "@/lib/sync-status";

beforeEach(() => {
  fake.deleteError = null;
  fake.deleteReturns = [{ token: "tok-1" }];
  fake.insertPayload = null;
  fake.insertError = null;
  fake.selectRows = [];
  fake.selectError = null;
  fake.userId = "user-1";
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("publishShare records a revocable owner", () => {
  it("stamps created_by and trip_id when signed in", async () => {
    await publishShare({
      id: "trip-9",
      name: "T",
      start: 1,
      stops: [["japan-kyoto", 2]],
    });
    expect(fake.insertPayload).toMatchObject({
      created_by: "user-1",
      trip_id: "trip-9",
    });
  });

  it("still publishes when signed out, with no owner", async () => {
    fake.userId = null;
    const token = await publishShare({ name: "T", start: 1, stops: [] });
    expect(token).toBeTruthy();
    // No owner means the DB has nobody to authorise a revoke — the UI says so.
    expect(fake.insertPayload).toMatchObject({ created_by: null });
  });
});

describe("revokeShare", () => {
  it("reports success only when a row was actually deleted", async () => {
    await expect(revokeShare("tok-1")).resolves.toBe(true);
    expect(getSyncStatus()).toBe("synced");
  });

  it("reports failure when the delete matched no row (regression: silent success)", async () => {
    fake.deleteReturns = [];
    await expect(revokeShare("someone-elses-token")).resolves.toBe(false);
    expect(getSyncStatus()).toBe("failed");
    expect(getLastErrorMessage()).toBe(
      "That share link could not be revoked"
    );
  });

  it("surfaces a database error through the same sync funnel", async () => {
    fake.deleteError = { message: "RLS denied" };
    await expect(revokeShare("tok-1")).resolves.toBe(false);
    expect(getSyncStatus()).toBe("failed");
    expect(getLastErrorMessage()).toBe("RLS denied");
  });
});

describe("listMyShares", () => {
  it("maps rows and reports a read failure through the funnel", async () => {
    fake.selectRows = [
      {
        token: "tok-1",
        name: "Kyoto trip",
        trip_id: "trip-9",
        created_at: "2026-07-01T00:00:00Z",
      },
    ];
    const rows = await listMyShares();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ token: "tok-1", tripId: "trip-9" });

    fake.selectError = { message: "nope" };
    await expect(listMyShares()).resolves.toEqual([]);
    expect(getSyncStatus()).toBe("failed");
  });
});
