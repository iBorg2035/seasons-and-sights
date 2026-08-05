/**
 * Currency primitives: what a currency is, how to parse one, how to format it,
 * and how to convert it to USD.
 *
 * Domain-free on purpose — no expense, no trip, no storage. Expenses use it
 * today; reservations can adopt it later without a second migration.
 */

/**
 * `digits` is the number of minor units, per ISO 4217. It is the whole reason
 * this table exists: ₫250,000 is 250000 minor units, not 25,000,000, and
 * assuming two everywhere is how a đồng amount ends up a hundred times wrong.
 *
 * Covers every currency the destination dataset references, plus the ones a
 * traveller passes through. A code that isn't here simply can't be selected.
 */
export const CURRENCIES = {
  USD: { symbol: "$", digits: 2, name: "US dollar" },
  EUR: { symbol: "€", digits: 2, name: "Euro" },
  GBP: { symbol: "£", digits: 2, name: "Pound sterling" },
  // ── Zero-decimal ──────────────────────────────────────────────────────────
  VND: { symbol: "₫", digits: 0, name: "Vietnamese đồng" },
  JPY: { symbol: "¥", digits: 0, name: "Japanese yen" },
  KRW: { symbol: "₩", digits: 0, name: "South Korean won" },
  CLP: { symbol: "$", digits: 0, name: "Chilean peso" },
  XPF: { symbol: "₣", digits: 0, name: "CFP franc" },
  ISK: { symbol: "kr", digits: 0, name: "Icelandic króna" },
  UGX: { symbol: "USh", digits: 0, name: "Ugandan shilling" },
  // ── Three-decimal ─────────────────────────────────────────────────────────
  JOD: { symbol: "JD", digits: 3, name: "Jordanian dinar" },
  KWD: { symbol: "KD", digits: 3, name: "Kuwaiti dinar" },
  BHD: { symbol: "BD", digits: 3, name: "Bahraini dinar" },
  OMR: { symbol: "﷼", digits: 3, name: "Omani rial" },
  TND: { symbol: "DT", digits: 3, name: "Tunisian dinar" },
  // ── Two-decimal ───────────────────────────────────────────────────────────
  ALL: { symbol: "L", digits: 2, name: "Albanian lek" },
  AUD: { symbol: "$", digits: 2, name: "Australian dollar" },
  BOB: { symbol: "Bs", digits: 2, name: "Boliviano" },
  BRL: { symbol: "R$", digits: 2, name: "Brazilian real" },
  CAD: { symbol: "$", digits: 2, name: "Canadian dollar" },
  CHF: { symbol: "Fr", digits: 2, name: "Swiss franc" },
  CNY: { symbol: "¥", digits: 2, name: "Chinese yuan" },
  COP: { symbol: "$", digits: 2, name: "Colombian peso" },
  CRC: { symbol: "₡", digits: 2, name: "Costa Rican colón" },
  EGP: { symbol: "E£", digits: 2, name: "Egyptian pound" },
  HKD: { symbol: "$", digits: 2, name: "Hong Kong dollar" },
  IDR: { symbol: "Rp", digits: 2, name: "Indonesian rupiah" },
  INR: { symbol: "₹", digits: 2, name: "Indian rupee" },
  KHR: { symbol: "៛", digits: 2, name: "Cambodian riel" },
  LKR: { symbol: "Rs", digits: 2, name: "Sri Lankan rupee" },
  MAD: { symbol: "DH", digits: 2, name: "Moroccan dirham" },
  MVR: { symbol: "Rf", digits: 2, name: "Maldivian rufiyaa" },
  MXN: { symbol: "$", digits: 2, name: "Mexican peso" },
  MYR: { symbol: "RM", digits: 2, name: "Malaysian ringgit" },
  NPR: { symbol: "Rs", digits: 2, name: "Nepalese rupee" },
  NZD: { symbol: "$", digits: 2, name: "New Zealand dollar" },
  PEN: { symbol: "S/", digits: 2, name: "Peruvian sol" },
  PHP: { symbol: "₱", digits: 2, name: "Philippine peso" },
  SGD: { symbol: "$", digits: 2, name: "Singapore dollar" },
  THB: { symbol: "฿", digits: 2, name: "Thai baht" },
  TRY: { symbol: "₺", digits: 2, name: "Turkish lira" },
  TZS: { symbol: "TSh", digits: 2, name: "Tanzanian shilling" },
  ZAR: { symbol: "R", digits: 2, name: "South African rand" },
} as const;

/** A currency the app knows how to handle. Never a bare `string`: a typo'd
 *  "VMD" should fail to compile, and the picker enumerates the same table the
 *  validator checks against. */
export type CurrencyCode = keyof typeof CURRENCIES;

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

/**
 * Guard for values crossing a trust boundary.
 *
 * Stored records are not trusted input: they come back from localStorage and
 * from Supabase jsonb as whatever some client version wrote, which may be a
 * newer build or a currency since removed from the table above.
 */
export function isCurrencyCode(v: unknown): v is CurrencyCode {
  return typeof v === "string" && Object.hasOwn(CURRENCIES, v);
}

/**
 * Parse typed input into integer minor units of `currency`, or null if it
 * isn't a usable amount.
 *
 * Parsed as a decimal string rather than via parseFloat: `Math.round(1.005 *
 * 100)` is 100, not 101, because 1.005 isn't representable in binary floating
 * point. Money should not round wrong on a value someone typed exactly.
 *
 * Accepts "$1,234.5" and "1234.50"; rejects negatives — a refund is a real
 * thing but it isn't this, and silently storing one would quietly understate a
 * category total. Digits beyond the currency's precision are rounded, not
 * truncated, so "0.005" is a cent and "250000.5 ₫" is 250,001 đồng.
 */
export function parseAmountToMinor(
  input: string,
  currency: CurrencyCode
): number | null {
  const { digits, symbol } = CURRENCIES[currency];
  // Strip grouping, whitespace and this currency's own symbol — nothing more.
  // A broader "remove non-digits" sweep would quietly accept "12 bananas".
  const cleaned = input
    .trim()
    .split(symbol)
    .join("")
    .replace(/[$,\s]/g, "");
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === "" || cleaned === ".") {
    return null;
  }

  const [whole, frac = ""] = cleaned.split(".");
  const kept = frac.slice(0, digits).padEnd(digits, "0");
  const roundUp = frac.length > digits && Number(frac[digits]) >= 5 ? 1 : 0;

  const minor = Number(whole || "0") * 10 ** digits + Number(kept || "0") + roundUp;
  if (!Number.isSafeInteger(minor) || minor <= 0) return null;
  return minor;
}

/** `₫250,000`, `$9.84`, `KD1.500` — precision follows the currency. */
export function formatMoney(minor: number, currency: CurrencyCode): string {
  const { symbol, digits } = CURRENCIES[currency];
  return `${symbol}${(minor / 10 ** digits).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

/**
 * Convert to USD cents, or null if the inputs can't produce a real amount.
 *
 * `unitsPerUsd` is how many units of `currency` buy one US dollar — 25400 for
 * đồng — which is the direction written on every exchange-booth board. The
 * name says it because this is the number people invert.
 *
 * Multiplies before dividing so a large minor amount keeps its precision on
 * the way through, and clamps to a single cent: ₫100 is $0.0039, which would
 * round to zero, and a zero-cost expense is rejected downstream. Something you
 * paid for costs at least a cent.
 */
export function toUsdCents(
  amountMinor: number,
  currency: CurrencyCode,
  unitsPerUsd: number
): number | null {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return null;
  if (!Number.isFinite(unitsPerUsd) || unitsPerUsd <= 0) return null;

  const { digits } = CURRENCIES[currency];
  const cents = Math.round((amountMinor * 100) / (10 ** digits * unitsPerUsd));
  return Math.max(1, cents);
}

/**
 * The ISO code inside a destination's practical currency line —
 * "Vietnamese đồng (VND)" → "VND".
 *
 * Takes the string rather than a whole region so it stays trivially testable.
 * 71 of the 72 destinations carry a parenthesised code; the one that doesn't
 * ("Argentine & Chilean peso") returns undefined, and callers fall back to USD
 * rather than guessing between two countries' pesos.
 */
export function currencyFromInfo(
  info: string | undefined
): CurrencyCode | undefined {
  const code = info?.match(/\(([A-Z]{3})\)/)?.[1];
  return isCurrencyCode(code) ? code : undefined;
}
