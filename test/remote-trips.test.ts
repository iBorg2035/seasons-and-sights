import { describe, it, expect, vi, beforeEach } from "vitest";

// Fake Supabase client whose per-call errors the tests control.
const fake = {
  deleteError: null as { message: string } | null,
  upsertError: null as { message: string } | null,
  updateError: null as { message: string } | null,
  updateData: { id: "t1" } as { id: string } | null,
  updatePayload: null as unknown,
  updateEq: [] as [string, string][],
  upsertPayload: null as unknown,
};

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: true,
  getSupabase: async () => ({
    from: () => ({
      delete: () => ({ eq: async () => ({ error: fake.deleteError }) }),
      upsert: async (payload: unknown) => {
        fake.upsertPayload = payload;
        return { error: fake.upsertError };
      },
      update: (payload: unknown) => {
        fake.updatePayload = payload;
        return {
          eq: (field: string, value: string) => {
            fake.updateEq.push([field, value]);
            return {
              eq: (field2: string, value2: string) => {
                fake.updateEq.push([field2, value2]);
                return {
                  select: () => ({
                    maybeSingle: async () => ({
                      data: fake.updateData,
                      error: fake.updateError,
                    }),
                  }),
                };
              },
            };
          },
        };
      },
    }),
  }),
}));

import { deleteRemoteTrip, upsertRemoteTrip } from "@/lib/supabase/trips";
import { getSyncStatus, getLastErrorMessage } from "@/lib/sync-status";

const trip = { id: "t1", name: "T", start: 1, stops: [] as [string, number][] };

beforeEach(() => {
  fake.deleteError = null;
  fake.upsertError = null;
  fake.updateError = null;
  fake.updateData = { id: "t1" };
  fake.updatePayload = null;
  fake.updateEq = [];
  fake.upsertPayload = null;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("remote trips error surfacing (reportSync funnel)", () => {
  it("deleteRemoteTrip surfaces failures on the sync badge (regression: it used to swallow them)", async () => {
    fake.deleteError = { message: "RLS denied" };
    await expect(deleteRemoteTrip("t1")).resolves.toBe(false);
    expect(getSyncStatus()).toBe("failed");
    expect(getLastErrorMessage()).toBe("RLS denied");
  });

  it("deleteRemoteTrip records a successful delete", async () => {
    await expect(deleteRemoteTrip("t1")).resolves.toBe(true);
    expect(getSyncStatus()).toBe("synced");
    expect(getLastErrorMessage()).toBeNull();
  });

  it("upsertRemoteTrip reports through the same funnel", async () => {
    fake.upsertError = { message: "network" };
    await expect(upsertRemoteTrip("u1", trip)).resolves.toBe(false);
    expect(getSyncStatus()).toBe("failed");

    fake.upsertError = null;
    await expect(upsertRemoteTrip("u1", trip)).resolves.toBe(true);
    expect(getSyncStatus()).toBe("synced");
  });

  it("updates the owner row when an editor saves a shared trip", async () => {
    await expect(
      upsertRemoteTrip("editor-user", { ...trip, ownerId: "owner-user" })
    ).resolves.toBe(true);

    expect(fake.updatePayload).toMatchObject({ name: "T" });
    expect(fake.updateEq).toEqual([
      ["user_id", "owner-user"],
      ["id", "t1"],
    ]);
  });

  it("includes interests in the upsert payload (regression: cloud sync must mirror local fields)", async () => {
    await expect(
      upsertRemoteTrip("u1", { ...trip, interests: ["beach", "wildlife"] })
    ).resolves.toBe(true);

    expect(fake.upsertPayload).toMatchObject({
      data: { interests: ["beach", "wildlife"] },
    });
  });

  it("reports failure when an editor update matches no owner row", async () => {
    fake.updateData = null;

    await expect(
      upsertRemoteTrip("editor-user", { ...trip, ownerId: "owner-user" })
    ).resolves.toBe(false);

    expect(getSyncStatus()).toBe("failed");
    expect(getLastErrorMessage()).toBe("Shared trip could not be updated");
  });
});
