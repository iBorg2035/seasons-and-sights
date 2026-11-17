import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Leaving a shared trip. As with share revocation, a delete that matched
 * nothing must report as a FAILURE: without the "Editors can leave" policy RLS
 * filters it to zero rows with no error, and saying "you've left" about a trip
 * that reappears on the next sync is the bug this replaces.
 */
const fake = {
  filters: [] as [string, string][],
  rows: [{ trip_id: "trip-1" }] as { trip_id: string }[] | null,
  error: null as { message: string } | null,
};

vi.mock("@/lib/supabase/client", () => ({
  getSupabase: async () => ({
    from: () => {
      const chain = {
        delete: () => chain,
        eq: (col: string, val: string) => {
          fake.filters.push([col, val]);
          return chain;
        },
        select: async () => ({ data: fake.rows, error: fake.error }),
      };
      return chain;
    },
  }),
}));

import { leaveSharedTrip } from "@/lib/supabase/collaborate";

describe("leaveSharedTrip", () => {
  beforeEach(() => {
    fake.filters = [];
    fake.rows = [{ trip_id: "trip-1" }];
    fake.error = null;
  });

  it("deletes only the caller's own editor row for that trip", async () => {
    await expect(leaveSharedTrip("trip-1", "owner-1", "me")).resolves.toBe(true);
    expect(fake.filters).toEqual([
      ["trip_id", "trip-1"],
      ["owner_id", "owner-1"],
      ["editor_id", "me"],
    ]);
  });

  it("reports failure when the delete matched no row", async () => {
    fake.rows = [];
    await expect(leaveSharedTrip("trip-1", "owner-1", "me")).resolves.toBe(false);
  });

  it("reports failure on an error", async () => {
    fake.rows = null;
    fake.error = { message: "boom" };
    await expect(leaveSharedTrip("trip-1", "owner-1", "me")).resolves.toBe(false);
  });
});
