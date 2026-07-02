"use client";
import { useEffect, useState } from "react";
import {
  getSyncStatus,
  getLastErrorMessage,
  SYNC_STATUS_EVENT,
} from "@/lib/sync-status";

/**
 * Shows the last cloud-sync outcome: "Synced ✓" when the most recent cloud
 * read/write landed, "Sync failed" (linking to /debug-sync) when it didn't.
 * Renders nothing until the first sync attempt ("unknown"), so signed-out or
 * sync-light views stay uncluttered.
 */
export function SyncBadge() {
  const [status, setStatus] = useState(getSyncStatus());
  useEffect(() => {
    const sync = () => setStatus(getSyncStatus());
    window.addEventListener(SYNC_STATUS_EVENT, sync);
    return () => window.removeEventListener(SYNC_STATUS_EVENT, sync);
  }, []);

  if (status === "synced") {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
        Synced ✓
      </span>
    );
  }
  if (status === "failed") {
    return (
      <a
        href="/debug-sync"
        title={getLastErrorMessage() ?? undefined}
        className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 hover:underline"
      >
        Sync failed
      </a>
    );
  }
  return null; // unknown — show nothing until we've tried
}
