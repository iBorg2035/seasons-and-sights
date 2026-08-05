/**
 * Per-trip exchange rates.
 *
 * Stored as trip-records (entity `fxrate`, id = currency code), so they are
 * scoped to a trip, work offline, sync, and merge last-write-wins — all of it
 * inherited from the store the journal, expenses, checklist and packing lists
 * already use. `trip_records.data` is jsonb, so this needed no schema change.
 *
 * The app never fetches a rate. It suggests one from a committed snapshot and
 * the traveller confirms or corrects it, which is the only design that works
 * on a train with no signal — the situation the feature exists for.
 */

import snapshot from "@/data/fx-rates.json";
import {
  deleteRecord,
  loadRecords,
  upsertRecord,
  type TripRecord,
} from "@/lib/trip-records";
import { isCurrencyCode, type CurrencyCode } from "@/lib/money";

export const FX_ENTITY = "fxrate";

/** `id` is the currency code. */
export interface FxRate extends TripRecord {
  /** Units of this currency that buy one US dollar. 25400 for đồng. */
  unitsPerUsd: number;
}

/** How old a suggestion can get before the UI admits it's guessing. */
export const SNAPSHOT_MAX_AGE_DAYS = 90;

export const SNAPSHOT_CAPTURED_AT: string = snapshot.capturedAt;

const SUGGESTED = snapshot.unitsPerUsd as Record<string, number>;

/** Whether the committed snapshot is old enough to be worth flagging. */
export function isSnapshotStale(now: Date = new Date()): boolean {
  const captured = Date.parse(SNAPSHOT_CAPTURED_AT);
  if (!Number.isFinite(captured)) return true;
  const days = (now.getTime() - captured) / 86_400_000;
  return days > SNAPSHOT_MAX_AGE_DAYS;
}

/** The committed suggestion for a currency, if there is one. */
export function suggestedRate(currency: CurrencyCode): number | undefined {
  const v = SUGGESTED[currency];
  return isUsableRate(v) ? v : undefined;
}

/** A rate is a number someone types at 2am in an airport. */
export function isUsableRate(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

/** Every rate this trip has confirmed, keyed by currency. */
export function loadRates(tripId: string): Partial<Record<CurrencyCode, number>> {
  const out: Partial<Record<CurrencyCode, number>> = {};
  for (const row of loadRecords<FxRate>(FX_ENTITY, tripId)) {
    // Rows are untrusted: they arrive from localStorage and from the cloud.
    if (isCurrencyCode(row.id) && isUsableRate(row.unitsPerUsd)) {
      out[row.id] = row.unitsPerUsd;
    }
  }
  return out;
}

export type RateSource = "trip" | "suggested";

/**
 * The rate to use for a currency, and where it came from — the caller needs
 * the provenance to decide whether to show the staleness warning.
 */
export function rateFor(
  tripId: string,
  currency: CurrencyCode
): { unitsPerUsd: number; source: RateSource } | undefined {
  const confirmed = loadRates(tripId)[currency];
  if (confirmed !== undefined) {
    return { unitsPerUsd: confirmed, source: "trip" };
  }
  const suggestion = suggestedRate(currency);
  return suggestion === undefined
    ? undefined
    : { unitsPerUsd: suggestion, source: "suggested" };
}

/** Confirm or correct this trip's rate for a currency. */
export function setRate(
  tripId: string,
  currency: CurrencyCode,
  unitsPerUsd: number
): boolean {
  if (!isUsableRate(unitsPerUsd)) return false;
  return upsertRecord<FxRate>(FX_ENTITY, tripId, {
    id: currency,
    unitsPerUsd,
  });
}

/** Forget a trip's override, falling back to the suggestion. */
export function clearRate(tripId: string, currency: CurrencyCode): boolean {
  return deleteRecord(FX_ENTITY, tripId, currency);
}
