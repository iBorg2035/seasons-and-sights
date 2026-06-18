import { describe, it, expect } from "vitest";
import { mergeTrips, type SavedTrip } from "@/lib/supabase/trips";

const t = (id: string, name: string, updatedAt = 0): SavedTrip => ({
  id,
  name,
  start: 1,
  stops: [],
  updatedAt,
});

describe("mergeTrips", () => {
  it("unions local + remote and flags local-only trips to push", () => {
    const { merged, toPush } = mergeTrips(
      [t("1", "A", 5), t("2", "B", 5)],
      [t("2", "B", 9), t("3", "C", 9)]
    );
    expect(toPush.map((x) => x.id)).toEqual(["1"]);
    expect(new Set(merged.map((x) => x.id))).toEqual(new Set(["1", "2", "3"]));
  });

  it("resolves id conflicts by last-write-wins", () => {
    // remote newer → remote kept, nothing pushed
    let m = mergeTrips([t("2", "local", 1)], [t("2", "remote", 2)]);
    expect(m.merged.find((x) => x.id === "2")!.name).toBe("remote");
    expect(m.toPush).toHaveLength(0);

    // local newer → local kept and pushed up
    m = mergeTrips([t("2", "local", 3)], [t("2", "remote", 2)]);
    expect(m.merged.find((x) => x.id === "2")!.name).toBe("local");
    expect(m.toPush.map((x) => x.id)).toEqual(["2"]);
  });

  it("pushes all local trips when remote is empty", () => {
    const { merged, toPush } = mergeTrips([t("1", "A", 1)], []);
    expect(toPush).toHaveLength(1);
    expect(merged).toHaveLength(1);
  });

  it("sorts merged newest-first", () => {
    const { merged } = mergeTrips(
      [t("1", "old", 1)],
      [t("2", "new", 9)]
    );
    expect(merged.map((x) => x.id)).toEqual(["2", "1"]);
  });
});
