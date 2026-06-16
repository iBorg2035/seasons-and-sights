// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeasonBadge } from "@/components/SeasonBadge";
import { SeasonStrip } from "@/components/SeasonStrip";
import { CrowdStrip } from "@/components/CrowdStrip";
import { getRegion } from "@/data/regions";
import type { Region } from "@/types";

const cusco = getRegion("peru-cusco") as Region;

describe("<SeasonBadge>", () => {
  it("renders the season label with a suffix", () => {
    render(<SeasonBadge season="dry" suffix="now" />);
    expect(screen.getByText(/Dry season now/)).toBeTruthy();
  });
});

describe("<SeasonStrip>", () => {
  it("renders all twelve months and the legend", () => {
    const { container } = render(
      <SeasonStrip region={cusco} highlightMonth={6} />
    );
    for (const m of ["Jan", "Jun", "Dec"]) {
      expect(container.textContent).toContain(m);
    }
    expect(container.textContent).toContain("Dry season");
  });

  it("renders clickable buttons when interactive", () => {
    const { container } = render(
      <SeasonStrip region={cusco} selectedMonth={6} onSelectMonth={() => {}} />
    );
    // 12 month buttons.
    expect(container.querySelectorAll("button").length).toBe(12);
  });
});

describe("<CrowdStrip>", () => {
  it("renders the crowd legend", () => {
    render(<CrowdStrip region={cusco} />);
    expect(screen.getByText(/Busy & pricey/)).toBeTruthy();
    expect(screen.getByText(/Quiet & cheap/)).toBeTruthy();
  });
});
