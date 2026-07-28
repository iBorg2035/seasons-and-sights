// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { SAVED_TRIPS_KEY, getSavedTrips } from "@/lib/saved-trips";
import type { SavedTrip } from "@/lib/supabase/trips";

/**
 * Signing in on a second device has to produce your trips.
 *
 * The bug this pins: the sync lived inside TripView, the /trips/[id] page. A
 * fresh device has an empty local store, so it lands on the /trips LIST, which
 * reads localStorage only. There is no trip to click, so TripView never mounts,
 * so the fetch never runs — signing in looked identical to having no trips, and
 * no amount of reloading helped. The sync has to run from the layout.
 */

const CLOUD_TRIP: SavedTrip = {
  id: "cloud-1",
  name: "Vietnam, August",
  start: 8,
  stops: [["vietnam-hoian", 1]],
  updatedAt: 5_000,
};

const fetchRemoteTrips = vi.fn<() => Promise<SavedTrip[]>>();
const upsertRemoteTrip = vi.fn(async () => {});
let currentUser: { id: string } | null = null;

vi.mock("@/lib/supabase/trips", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/trips")>();
  return {
    ...actual, // keep the real mergeTrips — its last-write-wins is the thing under test
    fetchRemoteTrips: () => fetchRemoteTrips(),
    upsertRemoteTrip: (...a: unknown[]) => upsertRemoteTrip(...(a as [])),
  };
});

vi.mock("@/lib/contexts/auth-context", () => ({
  useAuth: () => ({ user: currentUser }),
}));

// Imported after the mocks so the component picks them up.
const { TripCloudSync } = await import("@/components/TripCloudSync");

beforeEach(() => {
  localStorage.clear();
  fetchRemoteTrips.mockReset().mockResolvedValue([CLOUD_TRIP]);
  upsertRemoteTrip.mockReset();
  currentUser = { id: "user-1" };
});
afterEach(cleanup);

describe("signing in on a device with nothing stored locally", () => {
  it("brings the cloud trips down", async () => {
    expect(getSavedTrips()).toHaveLength(0);

    render(<TripCloudSync />);

    await waitFor(() => expect(getSavedTrips()).toHaveLength(1));
    expect(getSavedTrips()[0].name).toBe("Vietnam, August");
  });

  it("tells the rest of the app the store changed", async () => {
    // /trips and TripView both re-read on this event; without it the pull
    // lands in localStorage and the list keeps showing "no trips" until a
    // manual reload.
    const onChange = vi.fn();
    window.addEventListener("seasons-saved-trips-change", onChange);
    render(<TripCloudSync />);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    window.removeEventListener("seasons-saved-trips-change", onChange);
  });

  it("pushes nothing up when there was nothing local", async () => {
    render(<TripCloudSync />);
    await waitFor(() => expect(getSavedTrips()).toHaveLength(1));
    expect(upsertRemoteTrip).not.toHaveBeenCalled();
  });
});

describe("signing in on a device that already has local trips", () => {
  const LOCAL: SavedTrip = {
    id: "local-1",
    name: "Peru",
    start: 5,
    stops: [["peru-cusco", 1]],
    updatedAt: 9_000,
  };

  beforeEach(() => {
    localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify([LOCAL]));
  });

  it("keeps both sides rather than replacing one with the other", async () => {
    render(<TripCloudSync />);
    await waitFor(() => expect(getSavedTrips()).toHaveLength(2));
    expect(getSavedTrips().map((t) => t.id).sort()).toEqual([
      "cloud-1",
      "local-1",
    ]);
  });

  it("uploads the local-only trip", async () => {
    render(<TripCloudSync />);
    await waitFor(() => expect(upsertRemoteTrip).toHaveBeenCalled());
    expect(upsertRemoteTrip).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ id: "local-1" })
    );
  });

  it("does not resurrect a trip the cloud never had, when signed out", async () => {
    currentUser = null;
    render(<TripCloudSync />);
    // No user, no fetch — the signed-out experience stays purely local.
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchRemoteTrips).not.toHaveBeenCalled();
    expect(getSavedTrips()).toHaveLength(1);
  });
});

/**
 * The tests above prove the component works. They would all have passed while
 * the bug was live, because they mount it by hand — and the bug was that
 * nothing mounted it anywhere you could reach. So assert the wiring itself.
 */
describe("where the sync is mounted", () => {
  const read = async (p: string) =>
    (await import("node:fs")).readFileSync(`${process.cwd()}/${p}`, "utf8");

  it("is mounted in the root layout, so every route gets it", async () => {
    const layout = await read("src/app/layout.tsx");
    expect(layout).toContain("<TripCloudSync />");
  });

  it("is inside the auth provider, or useAuth would throw", async () => {
    const layout = await read("src/app/layout.tsx");
    expect(layout.indexOf("<AuthProvider>")).toBeLessThan(
      layout.indexOf("<TripCloudSync />")
    );
  });

  it("no longer runs from the trip page", async () => {
    // Mounted in both places it would fetch and merge twice per sign-in.
    const tripView = await read("src/components/TripView.tsx");
    expect(tripView).not.toContain("fetchRemoteTrips");
  });
});
