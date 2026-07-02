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
