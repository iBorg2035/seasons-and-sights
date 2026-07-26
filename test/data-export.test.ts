// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  buildExportPayload,
  downloadExport,
  EXPORT_FILENAME,
} from "@/lib/data-export";
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
  // jsdom implements neither of these; define them so they can be spied on.
  URL.createObjectURL = () => "blob:test";
  URL.revokeObjectURL = () => {};
});

afterEach(() => {
  vi.restoreAllMocks();
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

  it("hands the download the same data it built", () => {
    // The button was untested wiring until the DOM work moved into the module.
    // This asserts the file the user actually receives, not just the payload.
    const trip = createTrip("Peru", { start: 9, stops: [["peru-cusco", 1]] })!;
    saveEntry(trip.id, { day: "2026-09-05", text: "Machu Picchu at dawn" });
    saveExpense(trip.id, { day: "2026-09-05", amountCents: 4275, category: "food" });

    // jsdom's Blob has no .text(), so capture the content at construction.
    const RealBlob = globalThis.Blob;
    let blobText = "";
    let blobType = "";
    globalThis.Blob = class extends RealBlob {
      constructor(parts: BlobPart[], opts?: BlobPropertyBag) {
        blobText = String(parts[0]);
        blobType = opts?.type ?? "";
        super(parts, opts);
      }
    } as typeof Blob;

    let filename: string | null = null;
    const createObjectURL = vi.spyOn(URL, "createObjectURL");
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        filename = this.download;
      });

    expect(downloadExport(NOW)).toBe(true);
    globalThis.Blob = RealBlob;

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(filename).toBe(EXPORT_FILENAME);
    expect(blobType).toBe("application/json");

    const written = JSON.parse(blobText);
    expect(written.trips).toHaveLength(1);
    expect(written.journal[trip.id][0].text).toBe("Machu Picchu at dawn");
    expect(written.expenses[trip.id][0].amountCents).toBe(4275);
    expect(written.exportedAt).toBe(NOW.toISOString());
  });

  it("does not leave a blob URL leaked on the page", () => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadExport(NOW);

    // The anchor has to be appended for Firefox, so it must also come back out.
    expect(document.querySelectorAll("a[download]")).toHaveLength(0);
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
