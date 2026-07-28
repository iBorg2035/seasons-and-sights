"use client";

import { useEffect, useRef } from "react";

/**
 * Re-run a sync when the tab becomes visible again.
 *
 * Syncing only at mount is why two open browsers disagree: whichever one was
 * already loaded keeps showing what it had, and nothing short of a manual
 * reload changes that. Coming back to a tab is the exact moment someone
 * expects it to be current — it's when they've just done something elsewhere.
 *
 * Throttled, because "visible again" fires on every alt-tab and would
 * otherwise mean a round trip per window switch.
 */
export function useRefreshOnFocus(run: () => void, minIntervalMs = 15_000) {
  const lastRun = useRef(0);
  const runRef = useRef(run);
  runRef.current = run;

  useEffect(() => {
    const maybeRun = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRun.current < minIntervalMs) return;
      lastRun.current = now;
      runRef.current();
    };

    // Both: visibilitychange covers tab switches, focus covers moving between
    // windows of different apps without changing tab.
    window.addEventListener("focus", maybeRun);
    document.addEventListener("visibilitychange", maybeRun);
    return () => {
      window.removeEventListener("focus", maybeRun);
      document.removeEventListener("visibilitychange", maybeRun);
    };
  }, [minIntervalMs]);
}
