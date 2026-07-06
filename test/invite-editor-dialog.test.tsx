// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";

const listEditorsMock = vi.fn();
const inviteEditorByEmailMock = vi.fn();

vi.mock("@/lib/supabase/collaborate", () => ({
  listEditors: (...args: unknown[]) => listEditorsMock(...args),
  inviteEditorByEmail: (...args: unknown[]) => inviteEditorByEmailMock(...args),
  removeEditor: vi.fn(),
}));

import { InviteEditorDialog } from "@/components/InviteEditorDialog";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("<InviteEditorDialog> (regression: invite must not leak account existence via list refresh)", () => {
  it("does not re-fetch the editor list after a successful invite", async () => {
    listEditorsMock.mockResolvedValue([
      { tripId: "t1", ownerId: "owner", editorId: "e1", editorEmail: "existing@x.com" },
    ]);
    inviteEditorByEmailMock.mockResolvedValue({});

    render(
      <InviteEditorDialog tripId="t1" ownerId="owner" onClose={() => {}} />
    );

    await waitFor(() => expect(listEditorsMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText("existing@x.com")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Partner email"), {
      target: { value: "maybe@x.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /invite/i }));

    await waitFor(() =>
      expect(screen.getByText(/Invite sent/i)).toBeTruthy()
    );

    // The invite succeeding must not trigger a second listEditors call —
    // that call's presence/absence, or the resulting list length, is exactly
    // the side channel that let an inviter infer whether the email had an
    // account.
    expect(listEditorsMock).toHaveBeenCalledTimes(1);
  });

  it("also does not re-fetch the list when the invite fails", async () => {
    listEditorsMock.mockResolvedValue([]);
    inviteEditorByEmailMock.mockResolvedValue({ error: "Not configured" });

    render(
      <InviteEditorDialog tripId="t1" ownerId="owner" onClose={() => {}} />
    );

    await waitFor(() => expect(listEditorsMock).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("Partner email"), {
      target: { value: "someone@x.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /invite/i }));

    await waitFor(() => expect(screen.getByText("Not configured")).toBeTruthy());
    expect(listEditorsMock).toHaveBeenCalledTimes(1);
  });
});
