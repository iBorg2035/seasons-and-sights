import { describe, it, expect } from "vitest";
import { mergeTrips, type SavedTrip } from "@/lib/supabase/trips";

const t = (id: string, name: string): SavedTrip => ({
  id,
  name,
  start: 1,
  stops: [],
});

describe("mergeTrips", () => {
  it("unions local + remote and reports local-only trips", () => {
    const local = [t("1", "A"), t("2", "B")];
    const remote = [t("2", "B-remote"), t("3", "C")];
    const { merged, localOnly } = mergeTrips(local, remote);

    expect(localOnly.map((x) => x.id)).toEqual(["1"]);
    expect(merged.map((x) => x.id)).toEqual(["2", "3", "1"]);
  });

  it("lets remote win on an id conflict (it's the synced copy)", () => {
    const { merged } = mergeTrips([t("2", "local")], [t("2", "remote")]);
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe("remote");
  });

  it("treats all local trips as local-only when remote is empty", () => {
    const { merged, localOnly } = mergeTrips([t("1", "A")], []);
    expect(localOnly).toHaveLength(1);
    expect(merged).toHaveLength(1);
  });
});
