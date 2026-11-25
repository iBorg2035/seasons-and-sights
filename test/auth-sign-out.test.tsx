// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

/**
 * auth-js returns { error } from signOut() — and keeps the session — when
 * /logout fails for anything but an already-dead token (offline, 5xx). The
 * provider used to drop that error, so callers cleared the device while the
 * user was still signed in.
 */

const auth = {
  signOut: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })),
};
vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: true,
  getSupabase: async () => ({ auth }),
}));

import { AuthProvider, useAuth } from "@/lib/contexts/auth-context";

async function signOutResult() {
  let api: ReturnType<typeof useAuth> | null = null;
  function Grab() {
    api = useAuth();
    return null;
  }
  await act(async () => {
    render(
      <AuthProvider>
        <Grab />
      </AuthProvider>
    );
  });
  return api!.signOut();
}

beforeEach(() => {
  auth.signOut.mockReset();
  auth.getSession.mockReset();
  auth.getSession.mockResolvedValue({ data: { session: null } });
});

describe("AuthProvider.signOut", () => {
  it("succeeds when the session ends", async () => {
    auth.signOut.mockResolvedValue({ error: null });
    expect(await signOutResult()).toEqual({});
  });

  it("reports an error when /logout failed and the session is still there", async () => {
    auth.signOut.mockResolvedValue({ error: { message: "Failed to fetch" } });
    auth.getSession
      .mockResolvedValueOnce({ data: { session: null } }) // initial mount
      .mockResolvedValue({ data: { session: { user: { id: "me" } } } });
    expect(await signOutResult()).toEqual({ error: "Failed to fetch" });
  });

  it("counts an error as success when the session was removed anyway (dead token)", async () => {
    auth.signOut.mockResolvedValue({ error: { message: "Session not found" } });
    expect(await signOutResult()).toEqual({});
  });

  it("reports a thrown error with a live session", async () => {
    auth.signOut.mockRejectedValue(new Error("network down"));
    auth.getSession
      .mockResolvedValueOnce({ data: { session: null } })
      .mockResolvedValue({ data: { session: { user: { id: "me" } } } });
    expect(await signOutResult()).toEqual({ error: "network down" });
  });
});
