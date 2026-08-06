"use client";

import { isCurrencyCode, type CurrencyCode } from "@/lib/money";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/expenses";

/**
 * Client side of receipt scanning: shrink the photo before it leaves the
 * device, send it, and treat whatever comes back as untrusted — a network
 * response deserves exactly the same scrutiny as a record arriving from
 * sync, on the same reasoning as the read-normalisation in expenses.ts.
 */

/**
 * What the form is safe to prefill from — already validated.
 *
 * `amount` is deliberately still text, not minor units: how many digits are
 * "cents" depends on the currency, and the currency the form ends up using
 * may not be the one the model returned (see the resolution order where this
 * is consumed). Parsing happens once, in the caller, against whatever
 * currency actually gets used — exactly like typed input, through the same
 * `parseAmountToMinor`, so there is only ever one place that turns receipt
 * text into money.
 */
export interface ReceiptExtraction {
  found: boolean;
  merchant: string | null;
  /** Plain digits with at most one decimal point — validated as numeric
   *  shaped, not yet parsed to an amount. */
  amount: string | null;
  currency: CurrencyCode | null;
  category: ExpenseCategory | null;
  /** ISO date, only when it parsed to a real calendar date. */
  day: string | null;
}

const EMPTY: ReceiptExtraction = {
  found: false,
  merchant: null,
  amount: null,
  currency: null,
  category: null,
  day: null,
};

/**
 * Downscale to JPEG before upload. A phone photo can be 5–12MB; sending that
 * raw over the mobile connection this feature is actually used on is slow
 * and needlessly expensive per call.
 *
 * Falls back to the original file on any canvas failure — an old browser or
 * an unusual image shouldn't block the upload, just skip the optimization.
 */
export async function compressForUpload(
  file: File,
  maxDim = 1600,
  quality = 0.82
): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

/** ISO date, but only when it's a real calendar date — not just digit-shaped. */
function validDay(v: string | null): string | null {
  if (v == null || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : v;
}

/**
 * Send a receipt photo, get back a form-ready result.
 *
 * Every field is re-validated against the same closed sets the manual form
 * uses (`isCurrencyCode`, `EXPENSE_CATEGORIES`, `parseAmountToMinor`) before
 * it's trusted — the server already constrains the model to these sets, but
 * this is the boundary that actually matters: what crosses the network is
 * what gets checked, not what the server intended to send.
 */
export async function extractReceipt(
  blob: Blob,
  opts: { hintCurrency?: CurrencyCode } = {}
): Promise<ReceiptExtraction | { error: string }> {
  const form = new FormData();
  form.set("image", blob, "receipt.jpg");
  if (opts.hintCurrency) form.set("hintCurrency", opts.hintCurrency);

  let res: Response;
  try {
    res = await fetch("/api/receipt/extract", { method: "POST", body: form });
  } catch {
    return { error: "Couldn't reach the server — check your connection." };
  }

  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    return { error: "Couldn't read that receipt — enter it manually." };
  }

  if (!res.ok) {
    const message =
      typeof raw === "object" && raw && "error" in raw && typeof raw.error === "string"
        ? raw.error
        : "Couldn't read that receipt — enter it manually.";
    return { error: message };
  }

  if (typeof raw !== "object" || raw === null) return { ...EMPTY };
  const r = raw as Record<string, unknown>;

  if (r.found !== true) return { ...EMPTY };

  // Shape-checked only — numeric-looking, at most one decimal point. The real
  // parse happens once the caller knows which currency it's actually using.
  const amount =
    typeof r.amount === "string" && /^\d+(\.\d+)?$/.test(r.amount.trim())
      ? r.amount.trim()
      : null;
  const currency = isCurrencyCode(r.currency) ? r.currency : null;
  const category =
    typeof r.category === "string" &&
    (EXPENSE_CATEGORIES as readonly string[]).includes(r.category)
      ? (r.category as ExpenseCategory)
      : null;

  return {
    found: amount != null,
    merchant: typeof r.merchant === "string" ? r.merchant.trim() || null : null,
    amount,
    currency,
    category,
    day: validDay(typeof r.day === "string" ? r.day : null),
  };
}
