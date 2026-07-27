// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  saveReservation,
  listReservations,
  reservationsForStop,
  removeReservation,
  reservationTotalCents,
  stayRangeFor,
  type Reservation,
} from "@/lib/reservations";
import { loadRecordsRaw } from "@/lib/trip-records";
import { MAX_AMOUNT_CENTS } from "@/lib/expenses";

/**
 * Reservations are typed in by hand — nothing arrives from Booking.com, which
 * has no callback and no consumer API for reading someone's bookings. So the
 * module's job is to accept partial, in-progress information without losing
 * it, while still refusing the shapes that are plainly typos.
 */

const T0 = 1_700_000_000_000;

beforeEach(() => localStorage.clear());

const stay = (over: Partial<Parameters<typeof saveReservation>[1]> = {}) =>
  saveReservation(
    "t",
    {
      kind: "stay",
      regionId: "vietnam-hoian",
      provider: "Hotel Royal",
      reference: "BK-12345",
      start: "2026-08-10",
      end: "2026-08-17",
      amountCents: 42000,
      ...over,
    },
    T0
  );

describe("saving a reservation", () => {
  it("keeps everything it was given", () => {
    const r = stay()!;
    expect(r.provider).toBe("Hotel Royal");
    expect(r.reference).toBe("BK-12345");
    expect(r.amountCents).toBe(42000);
    expect(listReservations("t")).toHaveLength(1);
  });

  it("accepts a bare confirmation number with nothing else", () => {
    // People book in stages; a reference alone is still worth keeping.
    const r = saveReservation(
      "t",
      { kind: "flight", regionId: "vietnam-hoian", reference: "VN123" },
      T0
    );
    expect(r).not.toBeNull();
    expect(r!.reference).toBe("VN123");
    expect(r!.amountCents).toBeUndefined();
  });

  it("edits in place rather than duplicating", () => {
    const first = stay()!;
    saveReservation(
      "t",
      {
        id: first.id,
        kind: "stay",
        regionId: "vietnam-hoian",
        amountCents: 45000,
      },
      T0 + 1000
    );
    const rows = listReservations("t");
    expect(rows).toHaveLength(1);
    expect(rows[0].amountCents).toBe(45000);
  });

  it("refuses a stay that ends before it starts", () => {
    expect(stay({ start: "2026-08-17", end: "2026-08-10" })).toBeNull();
  });

  it("refuses an amount that isn't whole positive cents", () => {
    for (const amountCents of [-1, 12.5, NaN, MAX_AMOUNT_CENTS + 1]) {
      expect(stay({ amountCents })).toBeNull();
    }
  });

  it("refuses a reservation with no stop to attach to", () => {
    expect(stay({ regionId: "" })).toBeNull();
  });

  it("drops blank text rather than storing empty strings", () => {
    const r = stay({ provider: "   ", note: "" })!;
    expect(r.provider).toBeUndefined();
    expect(r.note).toBeUndefined();
  });

  it("keeps one trip's reservations off another", () => {
    stay();
    expect(listReservations("other-trip")).toEqual([]);
  });
});

describe("listing", () => {
  it("orders by start date, undated last", () => {
    stay({ start: "2026-08-20", end: "2026-08-25", reference: "later" });
    stay({ start: "2026-08-01", end: "2026-08-05", reference: "earlier" });
    saveReservation(
      "t",
      { kind: "other", regionId: "vietnam-hoian", reference: "undated" },
      T0
    );

    expect(listReservations("t").map((r) => r.reference)).toEqual([
      "earlier",
      "later",
      "undated",
    ]);
  });

  it("filters to a single stop", () => {
    stay();
    stay({ regionId: "japan-kyoto", reference: "KY-1" });

    expect(reservationsForStop("t", "japan-kyoto").map((r) => r.reference)).toEqual(
      ["KY-1"]
    );
  });
});

describe("removal", () => {
  it("leaves a tombstone so a delete survives a sync", () => {
    const r = stay()!;
    removeReservation("t", r.id);

    expect(listReservations("t")).toEqual([]);
    expect(loadRecordsRaw("reservation", "t")[0].deletedAt).toBeTruthy();
  });

  it("does not leave the confirmation number behind in storage", () => {
    const r = stay()!;
    removeReservation("t", r.id);
    expect(localStorage.getItem("seasons-reservation:t")).not.toContain("BK-12345");
  });
});

describe("totals", () => {
  it("sums exactly, ignoring unpriced rows", () => {
    const rows: Reservation[] = [
      { id: "a", kind: "stay", regionId: "x", amountCents: 42000, updatedAt: T0 },
      { id: "b", kind: "flight", regionId: "x", updatedAt: T0 },
      { id: "c", kind: "flight", regionId: "x", amountCents: 31050, updatedAt: T0 },
    ];
    expect(reservationTotalCents(rows)).toBe(73050);
  });

  it("totals nothing as zero", () => {
    expect(reservationTotalCents([])).toBe(0);
  });
});

describe("stayRangeFor", () => {
  it("gives a stay's committed range, ready for bookedDates", () => {
    expect(stayRangeFor(stay()!)).toEqual({
      start: "2026-08-10",
      end: "2026-08-17",
    });
  });

  it("refuses a flight — a flight lands on a day, it isn't a stay", () => {
    const f = saveReservation(
      "t",
      {
        kind: "flight",
        regionId: "vietnam-hoian",
        start: "2026-08-10",
        end: "2026-08-10",
      },
      T0
    )!;
    expect(stayRangeFor(f)).toBeNull();
  });

  it("refuses a half-known stay", () => {
    expect(stayRangeFor(stay({ end: undefined })!)).toBeNull();
  });

  it("refuses a zero-length stay", () => {
    expect(stayRangeFor(stay({ end: "2026-08-10" })!)).toBeNull();
  });
});
