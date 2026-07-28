// test/sync-status.test.ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  recordSyncResult,
  resetSyncStatus,
  getSyncStatus,
  SYNC_STATUS_EVENT,
} from "@/lib/sync-status";

describe("sync-status", () => {
  // The status is module-level and outlives a test, so it has to be reset —
  // otherwise "starts as unknown" only holds if this test happens to run first.
  beforeEach(() => {
    localStorage.clear();
    resetSyncStatus();
  });

  it("starts as 'unknown'", () => {
    expect(getSyncStatus()).toBe("unknown");
  });

  it("records a successful write as 'synced'", () => {
    recordSyncResult({ kind: "write", ok: true });
    expect(getSyncStatus()).toBe("synced");
  });

  it("records a failed write as 'failed'", () => {
    recordSyncResult({ kind: "write", ok: false, message: "relation trips does not exist" });
    expect(getSyncStatus()).toBe("failed");
  });

  it("dispatches SYNC_STATUS_EVENT on change", () => {
    let fired = false;
    window.addEventListener(SYNC_STATUS_EVENT, () => (fired = true));
    recordSyncResult({ kind: "write", ok: true });
    expect(fired).toBe(true);
  });

  it("a later success clears a failure", () => {
    recordSyncResult({ kind: "write", ok: false, message: "boom" });
    recordSyncResult({ kind: "write", ok: true });
    expect(getSyncStatus()).toBe("synced");
  });
});
