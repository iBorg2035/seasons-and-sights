// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Every per-trip entity must push each write as it happens, not only reconcile
 * at mount.
 *
 * This is the bug that shipped twice. Journal and reservations called
 * mirrorRecord on write; checklist and packing were wired only into the
 * mount-time syncRecords, so a tick made after the page loaded never left the
 * device — two browsers open on the same trip disagreed indefinitely and no
 * amount of ticking changed it. Behavioural tests didn't catch it because the
 * local write was perfectly correct; what was missing was a call.
 *
 * Source-level assertions, deliberately: the defect is the absence of wiring,
 * and absence is what a rendering test is worst at noticing.
 */
const read = (p: string) => readFileSync(`${process.cwd()}/${p}`, "utf8");

const WRITERS = [
  { file: "src/components/PreDepartureChecklist.tsx", what: "checklist ticks" },
  { file: "src/components/PackingList.tsx", what: "packing ticks" },
  { file: "src/components/TripJournalView.tsx", what: "journal and expenses" },
  { file: "src/components/ExpenseSection.tsx", what: "confirmed FX rates" },
  { file: "src/components/TripView.tsx", what: "reservations" },
];

describe("per-trip writes reach the cloud immediately", () => {
  for (const { file, what } of WRITERS) {
    it(`${what} are mirrored on write`, () => {
      // Match the CALL, not the import. Asserting the bare name passes on the
      // import line alone, which is how a file with the wiring deleted still
      // looks correct to a careless check.
      expect(read(file)).toMatch(/mirrorRecord\(\s*user/);
    });
  }
});

describe("open tabs don't sit on a stale copy", () => {
  it("re-syncs trips when the tab regains focus", () => {
    // Syncing only at mount is why the browser left open kept showing what it
    // had while the other one moved on.
    expect(read("src/components/TripCloudSync.tsx")).toContain(
      "useRefreshOnFocus"
    );
  });

  it("re-syncs trip records when the tab regains focus", () => {
    expect(read("src/components/TripView.tsx")).toContain("useRefreshOnFocus");
  });
});

describe("every record entity is reconciled on the trip page", () => {
  // A new entity that nobody wires into syncRecords looks fine on one device
  // and is invisible on every other one.
  const tripView = read("src/components/TripView.tsx");

  for (const entity of [
    "RESERVATION_ENTITY",
    "CHECKLIST_ENTITY",
    "PACKING_ENTITY",
  ]) {
    it(`syncs ${entity}`, () => {
      expect(tripView).toContain(`syncRecords(userId, tripId, ${entity})`);
    });
  }

  it("reconciles FX rates on the journal page, where they're entered", () => {
    // Not on the trip page: the rate form lives with the expenses.
    expect(read("src/components/TripJournalView.tsx")).toContain("FX_ENTITY");
  });

  it("clears every entity when the trip is deleted", () => {
    for (const entity of [
      "JOURNAL_ENTITY",
      "EXPENSE_ENTITY",
      "RESERVATION_ENTITY",
      "CHECKLIST_ENTITY",
      "PACKING_ENTITY",
      "FX_ENTITY",
    ]) {
      expect(tripView).toContain(`clearRecords(${entity}`);
    }
  });
});
