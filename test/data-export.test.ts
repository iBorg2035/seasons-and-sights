// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { buildExportPayload } from "@/lib/data-export";
import { createTrip } from "@/lib/saved-trips";
import { saveEntry, removeEntry } from "@/lib/journal";
import { saveExpense } from "@/lib/expenses";

/**
 * The export is the user's copy of their own data. An export that silently
 * omitted journal entries would be worse than none at all, because it reads
 * as "this is all of it".
 */

const NOW = new Date(2026, 6, 26);

beforeEach(() => {
  localStorage.clear();
});

describe("buildExportPayload", () => {
  it("includes journal entries and expenses, not just trips", () => {
    const trip = createTrip("Peru", { start: 9, stops: [["peru-cusco", 1]] })!;
    saveEntry(trip.id, { day: "2026-09-05", text: "Machu Picchu at dawn" });
    saveExpense(trip.id, {
      day: "2026-09-05",
      amountCents: 4275,
      category: "activities",
    });

    const payload = buildExportPayload(NOW);

    expect(payload.trips).toHaveLength(1);
    expect(payload.journal[trip.id][0].text).toBe("Machu Picchu at dawn");
    expect(payload.expenses[trip.id][0].amountCents).toBe(4275);
    expect(payload.exportedAt).toBe(NOW.toISOString());
  });

  it("covers every trip, not only the first", () => {
    const a = createTrip("A", { start: 1, stops: [["peru-cusco", 1]] })!;
    const b = createTrip("B", { start: 1, stops: [["japan-kyoto", 1]] })!;
    saveEntry(a.id, { day: "2026-09-05", text: "from A" });
    saveEntry(b.id, { day: "2026-09-05", text: "from B" });

    const payload = buildExportPayload(NOW);

    expect(payload.journal[a.id][0].text).toBe("from A");
    expect(payload.journal[b.id][0].text).toBe("from B");
  });

  it("leaves out deleted entries", () => {
    const trip = createTrip("Peru", { start: 9, stops: [["peru-cusco", 1]] })!;
    const entry = saveEntry(trip.id, { day: "2026-09-05", text: "regretted" })!;
    removeEntry(trip.id, entry.id);

    const payload = buildExportPayload(NOW);

    // A deleted entry isn't the user's data any more, and the store already
    // discarded its text — the tombstone must not leak into the export.
    expect(payload.journal[trip.id]).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain("regretted");
  });

  it("omits trips with nothing logged rather than emitting empty arrays", () => {
    const trip = createTrip("Bare", { start: 1, stops: [["peru-cusco", 1]] })!;

    const payload = buildExportPayload(NOW);

    expect(payload.trips).toHaveLength(1);
    expect(payload.journal[trip.id]).toBeUndefined();
    expect(payload.expenses).toEqual({});
  });

  it("produces valid JSON for an empty account", () => {
    const payload = buildExportPayload(NOW);
    expect(payload).toEqual({
      exportedAt: NOW.toISOString(),
      trips: [],
      journal: {},
      expenses: {},
    });
    expect(() => JSON.parse(JSON.stringify(payload))).not.toThrow();
  });
});
