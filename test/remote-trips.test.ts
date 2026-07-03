import { describe, it, expect, vi, beforeEach } from "vitest";

// Fake Supabase client whose per-call errors the tests control.
const fake = {
  deleteError: null as { message: string } | null,
  upsertError: null as { message: string } | null,
};

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: true,
  getSupabase: async () => ({
    from: () => ({
      delete: () => ({ eq: async () => ({ error: fake.deleteError }) }),
      upsert: async () => ({ error: fake.upsertError }),
    }),
  }),
}));

import { deleteRemoteTrip, upsertRemoteTrip } from "@/lib/supabase/trips";
import { getSyncStatus, getLastErrorMessage } from "@/lib/sync-status";

const trip = { id: "t1", name: "T", start: 1, stops: [] as [string, number][] };

beforeEach(() => {
  fake.deleteError = null;
  fake.upsertError = null;
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
});
