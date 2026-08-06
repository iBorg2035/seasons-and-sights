"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { extractReceipt } from "@/lib/receipt";
import {
  claimNext,
  completeExtraction,
  dequeue as dequeueRow,
  failExtraction,
  isQueueAvailable,
  listQueue,
  retryFailed,
  type QueuedReceipt,
} from "@/lib/receipt-queue";
import { useRefreshOnFocus } from "@/lib/use-refresh-on-focus";
import type { CurrencyCode } from "@/lib/money";

/**
 * Works through the held receipts whenever there's a chance of signal.
 *
 * Sequential by construction: ten queued photos must not become ten
 * concurrent vision calls, which would trip the route's own rate limiter and
 * cost ten times as much to end up in the same place. One at a time, stopping
 * early when the server says it's had enough.
 */
export function useReceiptQueue(
  tripId: string,
  opts: { hintCurrency?: CurrencyCode } = {}
) {
  const [items, setItems] = useState<QueuedReceipt[]>([]);
  // A ref, not state: two drains overlapping is the thing being prevented, so
  // the guard has to be readable synchronously rather than after a re-render.
  const draining = useRef(false);
  const hintRef = useRef(opts.hintCurrency);
  hintRef.current = opts.hintCurrency;

  const refresh = useCallback(async () => {
    if (!isQueueAvailable()) return;
    setItems(await listQueue(tripId));
  }, [tripId]);

  const drain = useCallback(async () => {
    if (!isQueueAvailable() || draining.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    draining.current = true;
    try {
      // No upper bound on iterations beyond the queue emptying: every pass
      // either completes a row, fails it, or breaks out, so this cannot spin.
      for (;;) {
        const row = await claimNext(tripId);
        if (!row || !row.blob) break;

        const result = await extractReceipt(row.blob, {
          hintCurrency: hintRef.current,
        });

        if ("error" in result) {
          await failExtraction(row.id, result.error, !result.retryable);
          await refresh();
          // Throttled or unavailable: the rest of the queue will get the same
          // answer, so stop rather than working through it.
          if (result.backOff) break;
          continue;
        }

        await completeExtraction(row.id, result);
        await refresh();
      }
    } finally {
      draining.current = false;
    }
    await refresh();
  }, [tripId, refresh]);

  useEffect(() => {
    void refresh().then(() => drain());
  }, [refresh, drain]);

  // Coming back online is the most direct signal that a held receipt might go
  // through now.
  useEffect(() => {
    const onOnline = () => void drain();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [drain]);

  // And on tab focus, reusing the throttled hook the cloud sync already uses
  // — same reasoning, same 15s floor.
  useRefreshOnFocus(() => void drain());

  const discard = useCallback(
    async (id: string) => {
      await dequeueRow(id);
      await refresh();
    },
    [refresh]
  );

  const retry = useCallback(
    async (id: string) => {
      await retryFailed(id);
      await refresh();
      void drain();
    },
    [refresh, drain]
  );

  return {
    items,
    waiting: items.filter((i) => i.status === "pending" || i.status === "extracting"),
    ready: items.filter((i) => i.status === "ready"),
    failed: items.filter((i) => i.status === "failed"),
    discard,
    retry,
    refresh,
  };
}
