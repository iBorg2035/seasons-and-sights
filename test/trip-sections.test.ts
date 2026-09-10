import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The trip page's anchor nav and its scroll-spy both address sections by DOM
 * id, so every id must be unique and every nav entry must have exactly one
 * target.
 *
 * This shipped broken: extracting `switchMode` left the old hand-inlined copy
 * of its logic in place AND introduced a second `<section id="stops">` that
 * actually rendered Route — so the page drew the Route controls and the mode
 * toggle twice, "Stops" in the nav jumped to a Route block, and the
 * IntersectionObserver saw two elements claiming the same id.
 *
 * Source-level assertions, deliberately, matching record-sync-wiring.test.ts:
 * the defect is a duplicated block, and a rendering test happily renders a
 * duplicate without complaining.
 */

const SRC = readFileSync("src/components/TripView.tsx", "utf8");

function renderedSectionIds(): string[] {
  return [...SRC.matchAll(/<section id="([^"]+)"/g)].map((m) => m[1]);
}

function navSectionIds(): string[] {
  const block = SRC.match(/const SECTIONS = \[([\s\S]*?)\] as const;/);
  if (!block) throw new Error("SECTIONS array not found in TripView.tsx");
  return [...block[1].matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
}

describe("trip page sections", () => {
  it("renders each section id exactly once", () => {
    const ids = renderedSectionIds();
    const duplicated = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(duplicated).toEqual([]);
  });

  it("gives every nav entry a section to scroll to", () => {
    const rendered = new Set(renderedSectionIds());
    // "copilot" is rendered by TripCopilot rather than a bare <section>.
    const missing = navSectionIds().filter(
      (id) => id !== "copilot" && !rendered.has(id)
    );
    expect(missing).toEqual([]);
  });

  it("renders Route and Stops once each, not one of them twice", () => {
    expect(SRC.match(/<RouteSection/g)?.length ?? 0).toBe(1);
    expect(SRC.match(/<StopsSection/g)?.length ?? 0).toBe(1);
    expect(SRC.match(/<TripModeToggle/g)?.length ?? 0).toBe(1);
  });

  it("keeps the mode-switch logic in switchMode rather than re-inlining it", () => {
    // The duplicate block was born from a copy of this logic living in JSX.
    // seedBookedDates belongs to switchMode; a second call site means the
    // extraction has been undone again.
    expect(SRC.match(/seedBookedDates\(/g)?.length ?? 0).toBe(1);
  });
});
