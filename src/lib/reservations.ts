import type { DayStamp } from "@/lib/saved-trips";
import {
  deleteRecord,
  loadRecords,
  upsertRecord,
  type TripRecord,
} from "@/lib/trip-records";
import { MAX_AMOUNT_CENTS } from "@/lib/expenses";

/**
 * What you actually booked, typed in by hand.
 *
 * Nothing arrives here automatically and nothing can: clicking through to
 * Booking.com opens an affiliate link in a new tab, and there is no callback
 * and no consumer API that would let this app read someone's reservations.
 * So this is manual entry — which is still worth having, because it's the only
 * place the app learns the real cost of a stay, the confirmation you'll want
 * offline at a check-in desk, and a flight number.
 */

export const RESERVATION_ENTITY = "reservation";

export const RESERVATION_KINDS = ["stay", "flight", "train", "other"] as const;
export type ReservationKind = (typeof RESERVATION_KINDS)[number];

export const KIND_META: Record<ReservationKind, { icon: string; label: string }> = {
  stay: { icon: "🛏️", label: "Stay" },
  flight: { icon: "✈️", label: "Flight" },
  train: { icon: "🚆", label: "Train or bus" },
  other: { icon: "🎫", label: "Other" },
};

export interface Reservation extends TripRecord {
  kind: ReservationKind;
  /** Which stop this belongs to, by region id. */
  regionId: string;
  /** Hotel, airline, operator — whoever you booked with. */
  provider?: string;
  /** Booking reference / PNR / flight number. The thing you'll be asked for. */
  reference?: string;
  /** Start day; for a stay this is check-in, for a flight the departure. */
  start?: DayStamp;
  /** Check-out. Exclusive, matching BookedRange — the day you leave. */
  end?: DayStamp;
  /** USD, integer cents. Same reason as expenses: these get summed. */
  amountCents?: number;
  note?: string;
}

export interface ReservationDraft {
  id?: string;
  kind: ReservationKind;
  regionId: string;
  provider?: string;
  reference?: string;
  start?: DayStamp;
  end?: DayStamp;
  amountCents?: number;
  note?: string;
}

/** A trip's reservations, earliest first; undated ones last. */
export function listReservations(tripId: string): Reservation[] {
  return loadRecords<Reservation>(RESERVATION_ENTITY, tripId).sort((a, b) => {
    if (!a.start && !b.start) return b.updatedAt - a.updatedAt;
    if (!a.start) return 1;
    if (!b.start) return -1;
    return a.start.localeCompare(b.start);
  });
}

export function reservationsForStop(
  tripId: string,
  regionId: string
): Reservation[] {
  return listReservations(tripId).filter((r) => r.regionId === regionId);
}

/**
 * Create or update a reservation. Null means rejected and not saved.
 *
 * Almost every field is optional on purpose: people book in stages, and a
 * confirmation number with nothing else attached is still worth keeping. Only
 * the kind and the stop it belongs to are required.
 */
export function saveReservation(
  tripId: string,
  draft: ReservationDraft,
  now: number = Date.now()
): Reservation | null {
  if (!RESERVATION_KINDS.includes(draft.kind)) return null;
  if (!draft.regionId) return null;
  if (draft.amountCents != null) {
    if (
      !Number.isInteger(draft.amountCents) ||
      draft.amountCents < 0 ||
      draft.amountCents > MAX_AMOUNT_CENTS
    ) {
      return null;
    }
  }
  // A stay that leaves before it arrives is a typo, not a booking.
  if (draft.start && draft.end && draft.end < draft.start) return null;

  const trimmed = (v?: string) => v?.trim() || undefined;
  const reservation: Reservation = {
    id: draft.id || crypto.randomUUID(),
    kind: draft.kind,
    regionId: draft.regionId,
    provider: trimmed(draft.provider),
    reference: trimmed(draft.reference),
    start: draft.start || undefined,
    end: draft.end || undefined,
    amountCents: draft.amountCents,
    note: trimmed(draft.note),
    updatedAt: now,
  };
  return upsertRecord<Reservation>(RESERVATION_ENTITY, tripId, reservation, now)
    ? reservation
    : null;
}

export function removeReservation(tripId: string, id: string): boolean {
  return deleteRecord(RESERVATION_ENTITY, tripId, id);
}

/** What the reservations add up to. Undated or unpriced ones contribute 0. */
export function reservationTotalCents(reservations: Reservation[]): number {
  return reservations.reduce((sum, r) => sum + (r.amountCents ?? 0), 0);
}

/**
 * The committed range a stay reservation implies, ready for `bookedDates`.
 *
 * Only stays: a flight lands on a day, it doesn't define how long you're
 * somewhere. Returns null unless both ends are present, since a half-known
 * stay can't seed a range.
 */
export function stayRangeFor(
  reservation: Reservation
): { start: DayStamp; end: DayStamp } | null {
  if (reservation.kind !== "stay") return null;
  if (!reservation.start || !reservation.end) return null;
  if (reservation.end <= reservation.start) return null;
  return { start: reservation.start, end: reservation.end };
}
