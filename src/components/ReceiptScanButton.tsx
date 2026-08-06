"use client";

import { useRef, useState } from "react";
import { compressForUpload, extractReceipt, type ReceiptExtraction } from "@/lib/receipt";
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
  onExtracted,
  onError,
}: {
  currencyHint?: CurrencyCode;
  onExtracted: (result: ReceiptExtraction) => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const compressed = await compressForUpload(file);
      const result = await extractReceipt(compressed, {
        hintCurrency: currencyHint,
      });
      if ("error" in result) {
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
