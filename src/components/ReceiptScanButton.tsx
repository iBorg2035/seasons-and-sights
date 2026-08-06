"use client";

import { useRef, useState } from "react";
import { compressForUpload, extractReceipt, type ReceiptExtraction } from "@/lib/receipt";
import { enqueue, isQueueAvailable } from "@/lib/receipt-queue";
import type { CurrencyCode } from "@/lib/money";

/**
 * A button that turns a photo into a form prefill.
 *
 * Knows nothing about Expense or trip storage — just "here's what the photo
 * said." The caller decides what to do with a ReceiptExtraction, including
 * whether it's safe to apply (see ExpenseSection's "never overwrite what
 * someone already typed" rule).
 */
export function ReceiptScanButton({
  currencyHint,
  tripId,
  onExtracted,
  onError,
  onQueued,
}: {
  currencyHint?: CurrencyCode;
  /** Which trip a held photo belongs to, when there's no signal to read it. */
  tripId: string;
  onExtracted: (result: ReceiptExtraction) => void;
  onError: (message: string) => void;
  /** A photo was held for later rather than read now. */
  onQueued?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Hold the photo, and say whether that worked. */
  async function hold(blob: Blob): Promise<boolean> {
    if (!isQueueAvailable()) return false;
    const queued = await enqueue(tripId, blob);
    if (!queued.ok) {
      onError(queued.error ?? "Couldn't hold that photo.");
      return true; // Handled — the user has been told why.
    }
    onError("");
    onQueued?.();
    return true;
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const compressed = await compressForUpload(file);

      // Known offline: don't burn a request that cannot succeed, just hold it.
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        if (await hold(compressed)) return;
      }

      const result = await extractReceipt(compressed, {
        hintCurrency: currencyHint,
      });

      if ("error" in result) {
        // Retryable means the network or the model had a moment — worth
        // keeping. A 400 or 403 fails the same way in an hour, so holding it
        // would only produce a row that dies three attempts later.
        if (result.retryable && (await hold(compressed))) return;
        onError(result.error);
        return;
      }
      if (!result.found) {
        onError("Couldn't read an amount off that receipt — enter it manually.");
        return;
      }
      onExtracted(result);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "Reading receipt…" : "📷 Scan receipt"}
      </button>
      <p className="text-[11px] text-slate-400">Powered by Grok</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        // A hint mobile browsers use to open the camera directly; ignored
        // elsewhere, where it falls back to the ordinary file picker.
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void handleFile(file);
        }}
        className="sr-only"
        aria-label="Scan a receipt photo"
      />
    </div>
  );
}
