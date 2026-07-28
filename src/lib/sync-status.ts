// In-memory (not persisted) record of the last cloud sync outcome, so the
// SyncBadge can show "Saved ✓" vs "Saved locally · sync failed" instead of
// silently swallowing the error like the old console.warn did.

export type SyncStatus = "unknown" | "synced" | "failed";
export const SYNC_STATUS_EVENT = "seasons-sync-status-change";

interface SyncResult {
  kind: "read" | "write";
  ok: boolean;
  message?: string;
}

let current: SyncStatus = "unknown";
let lastMessage: string | null = null;

export function getSyncStatus(): SyncStatus {
  return current;
}

export function getLastErrorMessage(): string | null {
  return lastMessage;
}

/**
 * Back to "nothing has been attempted yet".
 *
 * Real use is sign-out: the previous account's sync outcome shouldn't linger
 * on the badge for whoever signs in next. It also lets tests assert the
 * initial state without depending on being the first to run — this module's
 * state is process-wide, so a test that recorded a result used to make every
 * later "starts as unknown" assertion fail depending on order.
 */
export function resetSyncStatus(): void {
  current = "unknown";
  lastMessage = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SYNC_STATUS_EVENT));
  }
}

export function recordSyncResult(r: SyncResult): void {
  if (r.ok) {
    current = "synced";
    lastMessage = null;
  } else {
    current = "failed";
    lastMessage = r.message ?? null;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SYNC_STATUS_EVENT));
  }
}
