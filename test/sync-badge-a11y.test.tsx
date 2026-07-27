// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SyncBadge } from "@/components/SyncBadge";
import { recordSyncResult } from "@/lib/sync-status";

/**
 * The sync badge is the only place a cloud read/write failure surfaces, and it
 * appears without anything moving focus. Without a live region a screen reader
 * user is never told their trip failed to reach the cloud.
 */

beforeEach(() => cleanup());
afterEach(() => cleanup());

describe("SyncBadge", () => {
  it("says nothing before the first sync attempt", () => {
    // "unknown" renders nothing at all — no empty live region to announce.
    const { container } = render(<SyncBadge />);
    expect(container.textContent).toBe("");
  });

  it("announces a success politely", () => {
    recordSyncResult({ kind: "write", ok: true });
    render(<SyncBadge />);

    const el = screen.getByRole("status");
    expect(el.textContent).toContain("Synced");
    expect(el.getAttribute("aria-live")).toBe("polite");
  });

  it("announces a failure assertively, and stays reachable", () => {
    recordSyncResult({ kind: "write", ok: false, message: "network down" });
    render(<SyncBadge />);

    // A failed sync is the one outcome that must not be missed.
    const el = screen.getByRole("alert");
    expect(el.textContent).toContain("Sync failed");
    expect(el.getAttribute("aria-live")).toBe("assertive");
    // Still a link to the debug page, so it can be acted on.
    expect(el.getAttribute("href")).toBe("/debug-sync");
  });

  it("carries the underlying error as the title", () => {
    recordSyncResult({ kind: "read", ok: false, message: "permission denied" });
    render(<SyncBadge />);
    expect(screen.getByRole("alert").getAttribute("title")).toBe(
      "permission denied"
    );
  });
});
