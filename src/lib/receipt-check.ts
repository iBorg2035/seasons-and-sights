/**
 * Server-side sanity check on what the receipt model returns.
 *
 * Asked to read a receipt, the model will happily invent one: a blank white
 * image came back as "The Coffee Club, 4.50, 2025-08-12" with found: true.
 * Its own found flag can't be trusted on its own, so it must also copy the
 * total exactly as printed, and the amount it reports has to be that printed
 * number. A made-up answer rarely manages both — and when the check fails the
 * traveler gets "enter it manually", which is always safe, instead of a
 * plausible wrong expense waiting to be saved.
 */

export interface ModelReceipt {
  found: boolean;
  /** The total exactly as printed, symbols and separators included. */
  totalAsPrinted: string | null;
  merchant: string | null;
  amount: string | null;
  currency: string | null;
  category: string | null;
  day: string | null;
}

export type CheckedReceipt = Omit<ModelReceipt, "totalAsPrinted">;

export const NOT_FOUND: CheckedReceipt = {
  found: false,
  merchant: null,
  amount: null,
  currency: null,
  category: null,
  day: null,
};

/**
 * Every number printed in `text`, read the way receipts print them: "," or
 * "." followed by one or two digits at the end is a decimal point, any other
 * separator ("250.000", "1,234", "1 234") groups thousands.
 */
export function printedNumbers(text: string): number[] {
  const runs = text.match(/\d[\d.,'   ]*\d|\d/g) ?? [];
  return runs.map((run) => {
    const s = run.replace(/['   ]/g, "");
    const m = /^(.*)[.,](\d{1,2})$/.exec(s);
    const whole = (m ? m[1] : s).replace(/[.,]/g, "");
    return Number(m ? `${whole}.${m[2]}` : whole);
  });
}

/** Whether the reported amount is a number actually printed as the total. */
export function amountMatchesPrinted(amount: string, printed: string): boolean {
  if (!/^\d+(\.\d+)?$/.test(amount)) return false;
  const value = Number(amount);
  if (!(value > 0)) return false;
  return printedNumbers(printed).some((n) => Math.abs(n - value) < 0.005);
}

export function checkReceipt(r: ModelReceipt): CheckedReceipt {
  const amount = r.amount?.trim() ?? "";
  const printed = r.totalAsPrinted?.trim() ?? "";
  if (!r.found || !printed || !amountMatchesPrinted(amount, printed)) {
    return { ...NOT_FOUND };
  }
  const { totalAsPrinted: _drop, ...rest } = r;
  return { ...rest, amount };
}
