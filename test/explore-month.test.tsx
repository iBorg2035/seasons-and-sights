// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { REGIONS_SLIM } from "@/data/regions-slim";
import { monthOf, seasonFitScore, MONTH_NAMES_LONG } from "@/lib/season";

/**
 * The explore page used to judge every destination against the current month
 * and nothing else — the filter, the map pin colours, and each card's badge
 * and strip all read the clock directly. "When should I go to X" is the
 * question this app exists to answer, so it has to answer it for all twelve.
 *
 * The failure worth guarding is a partial wiring: one consumer left reading
 * the clock while the rest follow the picker, which looks fine until you
 * change month and one panel disagrees with the others.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

// Leaflet can't run here, and the real map is not what's under test — but
// which month it is handed very much is.
vi.mock("@/components/WorldMap", () => ({
  WorldMap: ({ month, regions }: { month: number; regions: unknown[] }) => (
    <div data-testid="worldmap" data-month={month} data-count={regions.length} />
  ),
}));

const { ExploreGrid } = await import("@/components/ExploreGrid");

const NOW = monthOf();
/** A month whose in-season set differs from today's, so the test can tell them apart. */
const OTHER = (() => {
  const inSeason = (m: number) =>
    REGIONS_SLIM.filter((r) => seasonFitScore(r, m) >= 60)
      .map((r) => r.id)
      .sort()
      .join(",");
  const now = inSeason(NOW);
  for (let i = 1; i <= 12; i++) if (i !== NOW && inSeason(i) !== now) return i;
  throw new Error("dataset has no month that differs from the current one");
})();

function expectedInSeason(month: number): string[] {
  return REGIONS_SLIM.filter((r) => seasonFitScore(r, month) >= 60).map(
    (r) => r.name
  );
}

function selectMonth(month: number) {
  fireEvent.change(screen.getByLabelText(/month to judge/i), {
    target: { value: String(month) },
  });
}

describe("explore month picker", () => {
  afterEach(cleanup);

  it("defaults to the current month and says so", () => {
    render(<ExploreGrid />);
    const select = screen.getByLabelText(/month to judge/i) as HTMLSelectElement;
    expect(Number(select.value)).toBe(NOW);
    expect(
      within(select).getByRole("option", { name: `${MONTH_NAMES_LONG[NOW - 1]} (now)` })
    ).toBeTruthy();
  });

  it("offers all twelve months", () => {
    render(<ExploreGrid />);
    const select = screen.getByLabelText(/month to judge/i);
    expect(within(select).getAllByRole("option")).toHaveLength(12);
  });

  it("filters against the chosen month, not the clock", () => {
    render(<ExploreGrid />);
    fireEvent.click(screen.getByRole("button", { name: /good to visit/i }));

    const countFor = (m: number) => expectedInSeason(m).length;
    expect(screen.getByText(`${countFor(NOW)} destinations`)).toBeTruthy();

    selectMonth(OTHER);
    expect(screen.getByText(`${countFor(OTHER)} destinations`)).toBeTruthy();

    // ...and the listed destinations are the ones in season THEN.
    const shown = expectedInSeason(OTHER);
    expect(screen.getAllByRole("heading", { level: 3 }).length).toBe(shown.length);
  });

  it("hands the map the chosen month", () => {
    render(<ExploreGrid />);
    fireEvent.click(screen.getByRole("button", { name: /^map$/i }));
    expect(screen.getByTestId("worldmap").dataset.month).toBe(String(NOW));

    selectMonth(OTHER);
    expect(screen.getByTestId("worldmap").dataset.month).toBe(String(OTHER));
  });

  it("stops claiming 'now' once another month is chosen", () => {
    render(<ExploreGrid />);
    expect(screen.getByRole("button", { name: /good to visit now/i })).toBeTruthy();

    selectMonth(OTHER);
    expect(screen.queryByRole("button", { name: /good to visit now/i })).toBeNull();
    expect(screen.getByRole("button", { name: /good to visit in/i })).toBeTruthy();

    // Back to today and the wording returns — the label tracks state, it isn't
    // a one-way switch.
    selectMonth(NOW);
    expect(screen.getByRole("button", { name: /good to visit now/i })).toBeTruthy();
  });
});
