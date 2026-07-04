import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = {
  rpcCalls: [] as { fn: string; args: Record<string, string> }[],
  rpcError: null as { message: string } | null,
};

vi.mock("@/lib/supabase/client", () => ({
  getSupabase: async () => ({
    rpc: async (fn: string, args: Record<string, string>) => {
      fake.rpcCalls.push({ fn, args });
      return { error: fake.rpcError };
    },
  }),
}));

import { inviteEditorByEmail } from "@/lib/supabase/collaborate";

describe("collaboration invites", () => {
  beforeEach(() => {
    fake.rpcCalls = [];
    fake.rpcError = null;
  });

  it("uses the generic invite RPC without resolving the email client-side", async () => {
    await expect(
      inviteEditorByEmail("trip-1", " partner@example.com ")
    ).resolves.toEqual({ error: undefined });

    expect(fake.rpcCalls).toEqual([
      {
        fn: "invite_trip_editor_by_email",
        args: { p_trip_id: "trip-1", p_email: "partner@example.com" },
      },
    ]);
  });
});
