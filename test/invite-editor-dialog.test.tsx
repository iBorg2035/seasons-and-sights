// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const fake = {
  inviteError: undefined as string | undefined,
};

vi.mock("@/lib/supabase/collaborate", () => ({
  inviteEditorByEmail: vi.fn(async () => ({ error: fake.inviteError })),
  listEditors: vi.fn(async () => []),
  removeEditor: vi.fn(async () => {}),
}));

import { InviteEditorDialog } from "@/components/InviteEditorDialog";
import { listEditors } from "@/lib/supabase/collaborate";

beforeEach(() => {
  fake.inviteError = undefined;
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("<InviteEditorDialog>", () => {
  it("does not re-fetch the editor list right after a successful invite (regression: invite-by-email enumeration side-channel)", async () => {
    render(
      <InviteEditorDialog tripId="trip-1" ownerId="owner-1" onClose={() => {}} />
    );

    await waitFor(() => expect(listEditors).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText(/Partner email/i), {
      target: { value: "partner@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Invite/i }));

    await waitFor(() => expect(screen.getByText(/Invite sent/i)).toBeTruthy());

    // A successful invite must not trigger an immediate list refresh — doing
    // so would let the inviter infer, from whether the list grew, whether
    // the invited email has an account (the exact enumeration the
    // security-definer RPC is designed to prevent).
    expect(listEditors).toHaveBeenCalledTimes(1);
  });
});
