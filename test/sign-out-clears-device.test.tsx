// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

/**
 * Signing out used to end the session and leave everything in the browser:
 * on a shared computer the next person saw the trips, diary and spending,
 * and signing in merged any not-yet-synced trips into THEIR account.
 * Sign-out now sends everything to the account first, asks before losing
 * anything that couldn't be sent, then clears the device.
 */

const remote = {
  trips: vi.fn(),
  upsert: vi.fn(),
  records: vi.fn(),
  push: vi.fn(),
};
const queue = { list: vi.fn(), clear: vi.fn() };
const signOutMock = vi.fn();

vi.mock("@/lib/supabase/trips", async (orig) => ({
  ...(await orig<typeof import("@/lib/supabase/trips")>()),
  fetchRemoteTripsOrNull: () => remote.trips(),
  upsertRemoteTrip: (...a: unknown[]) => remote.upsert(...a),
  deleteAccount: vi.fn(),
}));
vi.mock("@/lib/supabase/trip-records", () => ({
  fetchRemoteRecordsOrNull: (...a: unknown[]) => remote.records(...a),
  pushRecords: (...a: unknown[]) => remote.push(...a),
}));
vi.mock("@/lib/receipt-queue", () => ({
  listQueue: (...a: unknown[]) => queue.list(...a),
  clearQueue: (...a: unknown[]) => queue.clear(...a),
}));
vi.mock("@/lib/contexts/auth-context", () => ({
  useAuth: () => ({
    configured: true,
    loading: false,
    user: { id: "me", email: "me@example.com" },
    signOut: signOutMock,
  }),
}));

import { createTrip, getSavedTrips } from "@/lib/saved-trips";
import { upsertRecord, loadRecordsRaw } from "@/lib/trip-records";
import { JOURNAL_ENTITY } from "@/lib/journal";
import { getActiveTripId, setActiveTripId } from "@/lib/active-trip";
import {
  clearLocalUserData,
  flushToCloud,
} from "@/lib/local-user-data";
import { AccountMenu } from "@/components/AccountMenu";

function seed() {
  const t = createTrip("Mine", { start: 3, stops: [["peru-cusco", 1]] })!;
  upsertRecord<{ id: string; updatedAt: number; text: string }>(JOURNAL_ENTITY, t.id, { id: "j1", text: "Dear diary" });
  setActiveTripId(t.id);
  localStorage.setItem("seasons-passport", "US");
  localStorage.setItem("seasons-nearby:13.756:100.502:food:800", "{}");
  localStorage.setItem("theme", "light");
  localStorage.setItem("seasons-onboarded", "1");
  return t;
}

beforeEach(() => {
  localStorage.clear();
  for (const f of [...Object.values(remote), ...Object.values(queue), signOutMock]) f.mockReset();
  remote.trips.mockResolvedValue([]);
  remote.upsert.mockResolvedValue(true);
  remote.records.mockResolvedValue([]);
  remote.push.mockResolvedValue(true);
  queue.list.mockResolvedValue([]);
  queue.clear.mockResolvedValue(undefined);
  signOutMock.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("clearLocalUserData", () => {
  it("removes trips, their records, held photos, and personal settings", async () => {
    const t = seed();
    await clearLocalUserData();

    expect(getSavedTrips()).toEqual([]);
    expect(loadRecordsRaw(JOURNAL_ENTITY, t.id)).toEqual([]);
    expect(queue.clear).toHaveBeenCalledWith(t.id);
    expect(getActiveTripId()).toBeNull();
    expect(localStorage.getItem("seasons-passport")).toBeNull();
    expect(localStorage.getItem("seasons-nearby:13.756:100.502:food:800")).toBeNull();
  });

  it("keeps device preferences that aren't about the traveler", async () => {
    seed();
    await clearLocalUserData();
    expect(localStorage.getItem("theme")).toBe("light");
    expect(localStorage.getItem("seasons-onboarded")).toBe("1");
  });
});

describe("flushToCloud", () => {
  it("sends a local-only trip and its records to the account", async () => {
    const t = seed();
    expect(await flushToCloud("me")).toBe(true);
    expect(remote.upsert).toHaveBeenCalledWith("me", expect.objectContaining({ id: t.id }));
    expect(remote.push).toHaveBeenCalledWith(
      "me",
      t.id,
      JOURNAL_ENTITY,
      [expect.objectContaining({ id: "j1" })]
    );
  });

  it("doesn't overwrite a newer copy from another device", async () => {
    const t = seed();
    remote.trips.mockResolvedValue([{ ...t, name: "Newer", updatedAt: t.updatedAt! + 60_000 }]);
    expect(await flushToCloud("me")).toBe(true);
    expect(remote.upsert).not.toHaveBeenCalled();
  });

  it("reports failure when the account can't be reached", async () => {
    seed();
    remote.trips.mockResolvedValue(null);
    expect(await flushToCloud("me")).toBe(false);
  });

  it("reports failure when a record push fails", async () => {
    seed();
    remote.push.mockResolvedValue(false);
    expect(await flushToCloud("me")).toBe(false);
  });
});

describe("Sign out", () => {
  async function clickSignOut() {
    render(<AccountMenu />);
    fireEvent.click(screen.getByTitle("me@example.com"));
    await act(async () => {
      fireEvent.click(screen.getByText("Sign out"));
    });
  }

  it("syncs, signs out, and clears the device with no prompt when nothing would be lost", async () => {
    seed();
    const confirmSpy = vi.spyOn(window, "confirm");
    await clickSignOut();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalled();
    expect(getSavedTrips()).toEqual([]);
  });

  it("asks first when something couldn't sync, and keeps everything if cancelled", async () => {
    seed();
    remote.trips.mockResolvedValue(null);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    await clickSignOut();
    expect(confirmSpy.mock.calls[0][0]).toMatch(/haven't reached your account/);
    expect(signOutMock).not.toHaveBeenCalled();
    expect(getSavedTrips()).toHaveLength(1);
  });

  it("warns about held receipt photos, which only exist on this device", async () => {
    seed();
    queue.list.mockResolvedValue([{ id: "r1" }, { id: "r2" }]);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    await clickSignOut();
    expect(confirmSpy.mock.calls[0][0]).toMatch(/2 receipt photos waiting/);
    expect(signOutMock).toHaveBeenCalled();
    expect(getSavedTrips()).toEqual([]);
  });
});
