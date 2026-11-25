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
const queue = { list: vi.fn(), clear: vi.fn(), clearAll: vi.fn() };
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
  clearAllQueues: () => queue.clearAll(),
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
import { EXPENSE_ENTITY } from "@/lib/expenses";
import { CHECKLIST_ENTITY } from "@/lib/checklist-progress";
import { recordsKey } from "@/lib/trip-records";
import { SAVED_TRIPS_KEY } from "@/lib/saved-trips";
import { getActiveTripId, setActiveTripId } from "@/lib/active-trip";
import {
  clearLocalUserData,
  flushToCloud,
} from "@/lib/local-user-data";
import { AccountMenu } from "@/components/AccountMenu";
import { unsavedWork, useUnsavedGuard } from "@/lib/use-unsaved-guard";

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
  queue.clearAll.mockResolvedValue(undefined);
  signOutMock.mockResolvedValue({});
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
    expect(queue.clearAll).toHaveBeenCalled();
    expect(getActiveTripId()).toBeNull();
    expect(localStorage.getItem("seasons-passport")).toBeNull();
    expect(localStorage.getItem("seasons-nearby:13.756:100.502:food:800")).toBeNull();
  });

  it("removes records and photos of trips the list no longer knows", async () => {
    // A trip deleted from /calendar used to leave its diary behind, and the
    // clear only walked trips still in the list — so they survived sign-out.
    seed();
    upsertRecord<{ id: string; updatedAt: number; text: string }>(JOURNAL_ENTITY, "gone", { id: "j9", text: "orphan" });
    upsertRecord<{ id: string; updatedAt: number }>(EXPENSE_ENTITY, "gone", { id: "e9" });
    await clearLocalUserData();
    expect(loadRecordsRaw(JOURNAL_ENTITY, "gone")).toEqual([]);
    expect(loadRecordsRaw(EXPENSE_ENTITY, "gone")).toEqual([]);
    // Photos are cleared store-wide, not trip by trip.
    expect(queue.clearAll).toHaveBeenCalled();
  });

  it("removes the checklist's pre-records keys", async () => {
    localStorage.setItem("seasons-checklist", JSON.stringify(["passport"]));
    localStorage.setItem("seasons-checklist:peru-cusco,peru-lima", JSON.stringify(["visa"]));
    await clearLocalUserData();
    expect(localStorage.getItem("seasons-checklist")).toBeNull();
    expect(localStorage.getItem("seasons-checklist:peru-cusco,peru-lima")).toBeNull();
  });

  it("clears storage even if the photo store never answers", async () => {
    seed();
    queue.clearAll.mockReturnValue(new Promise(() => {}));
    void clearLocalUserData();
    expect(getSavedTrips()).toEqual([]);
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

describe("flushToCloud — regressions", () => {
  it("migrates pre-July-28 checklist ticks instead of crashing on them", async () => {
    // Legacy format: a bare string[] under the same key the records use.
    // Read raw, it reached toRow with no updatedAt and threw RangeError,
    // which left Sign out doing nothing at all.
    const t = seed();
    localStorage.setItem(recordsKey(CHECKLIST_ENTITY, t.id), JSON.stringify(["passport"]));
    expect(await flushToCloud("me")).toBe(true);
    const pushed = remote.push.mock.calls.find((c) => c[2] === CHECKLIST_ENTITY)!;
    expect(pushed[3]).toEqual([
      expect.objectContaining({ id: "passport", updatedAt: expect.any(Number) }),
    ]);
  });

  it("drops malformed rows rather than letting them break the flush", async () => {
    const t = seed();
    localStorage.setItem(
      recordsKey(EXPENSE_ENTITY, t.id),
      JSON.stringify(["junk", { id: 7 }, { id: "e1", updatedAt: 5 }])
    );
    expect(await flushToCloud("me")).toBe(true);
    const pushed = remote.push.mock.calls.find((c) => c[2] === EXPENSE_ENTITY)!;
    expect(pushed[3]).toEqual([expect.objectContaining({ id: "e1" })]);
  });

  it("reports an unexpected error as not-synced instead of throwing", async () => {
    seed();
    remote.records.mockRejectedValue(new Error("boom"));
    await expect(flushToCloud("me")).resolves.toBe(false);
  });

  it("doesn't upload another account's leftover trip or its diary into this one", async () => {
    // A synced trip carries its owner's id. If the cloud this user sees
    // doesn't have it, it isn't theirs (a previous account's leftover, a
    // revoked share, or deleted elsewhere): nothing of it may go up.
    const t = seed();
    const trips = JSON.parse(localStorage.getItem(SAVED_TRIPS_KEY)!);
    trips[0].ownerId = "someone-else";
    localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(trips));
    expect(await flushToCloud("me")).toBe(true);
    expect(remote.upsert).not.toHaveBeenCalled();
    expect(remote.push).not.toHaveBeenCalledWith("me", t.id, expect.anything(), expect.anything());
  });

  it("still sends records of a trip shared with this user", async () => {
    const t = seed();
    const trips = JSON.parse(localStorage.getItem(SAVED_TRIPS_KEY)!);
    trips[0].ownerId = "owner";
    localStorage.setItem(SAVED_TRIPS_KEY, JSON.stringify(trips));
    remote.trips.mockResolvedValue([{ ...trips[0] }]);
    expect(await flushToCloud("me")).toBe(true);
    expect(remote.push).toHaveBeenCalledWith("me", t.id, JOURNAL_ENTITY, expect.any(Array));
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
    await clickSignOut();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(signOutMock).toHaveBeenCalled();
    expect(getSavedTrips()).toEqual([]);
  });

  it("asks first when something couldn't sync, and keeps everything if cancelled", async () => {
    seed();
    remote.trips.mockResolvedValue(null);
    await clickSignOut();
    expect(screen.getByRole("alertdialog").textContent).toMatch(/haven't reached your account/);
    fireEvent.click(screen.getByText("Stay signed in"));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(getSavedTrips()).toHaveLength(1);
  });

  it("warns about held receipt photos, which only exist on this device", async () => {
    seed();
    queue.list.mockResolvedValue([{ id: "r1" }, { id: "r2" }]);
    await clickSignOut();
    expect(screen.getByRole("alertdialog").textContent).toMatch(/2 receipt photos waiting/);
    await act(async () => {
      fireEvent.click(screen.getByText("Sign out anyway"));
    });
    expect(signOutMock).toHaveBeenCalled();
    expect(getSavedTrips()).toEqual([]);
  });

  it("doesn't depend on window.confirm, which a browser can suppress", async () => {
    // A background tab or "don't let this site prompt" makes confirm()
    // return false without showing anything; sign-out then silently didn't
    // happen. The question is asked in the page instead.
    seed();
    remote.trips.mockResolvedValue(null);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    await clickSignOut();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });

  it("keeps the device intact and says so when the session couldn't be ended (offline)", async () => {
    // auth-js keeps the session when /logout fails. Clearing anyway left the
    // user signed in on an emptied device, and the next sync pulled the
    // whole account back onto it.
    seed();
    remote.trips.mockResolvedValue(null);
    signOutMock.mockResolvedValue({ error: "Failed to fetch" });
    await clickSignOut();
    await act(async () => {
      fireEvent.click(screen.getByText("Sign out anyway"));
    });
    expect(signOutMock).toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/Couldn't sign out/);
    expect(getSavedTrips()).toHaveLength(1);
    expect(localStorage.getItem("seasons-passport")).toBe("US");
  });

  it("still signs out when a trip has legacy checklist ticks", async () => {
    const t = seed();
    localStorage.setItem(recordsKey(CHECKLIST_ENTITY, t.id), JSON.stringify(["passport"]));
    await clickSignOut();
    expect(signOutMock).toHaveBeenCalled();
    expect(getSavedTrips()).toEqual([]);
  });

  it("warns about an unsaved trip draft, which clearing the device would drop", async () => {
    // Sign-out clears in place without navigating, so the trip page's
    // leave-guard never fired and the draft vanished with no question asked.
    seed();
    function Draft() {
      useUnsavedGuard(true, "Leave?", 'changes to "Mine"');
      return null;
    }
    render(<Draft />);
    await clickSignOut();
    expect(screen.getByRole("alertdialog").textContent).toMatch(/Unsaved changes to "Mine" will be lost/);
    fireEvent.click(screen.getByText("Stay signed in"));
    expect(signOutMock).not.toHaveBeenCalled();
    expect(getSavedTrips()).toHaveLength(1);
  });
});

describe("unsavedWork", () => {
  it("lists a draft only while it's dirty and mounted", () => {
    function Draft({ dirty }: { dirty: boolean }) {
      useUnsavedGuard(dirty, "Leave?", "changes to \"A\"");
      return null;
    }
    const { rerender, unmount } = render(<Draft dirty={false} />);
    expect(unsavedWork()).toEqual([]);
    rerender(<Draft dirty />);
    expect(unsavedWork()).toEqual(['changes to "A"']);
    rerender(<Draft dirty={false} />);
    expect(unsavedWork()).toEqual([]);
    rerender(<Draft dirty />);
    unmount();
    expect(unsavedWork()).toEqual([]);
  });
});
