// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GettingThere } from "@/components/GettingThere";
import { buildFlightsUrl } from "@/lib/booking";

/**
 * The flight search link. buildFlightsUrl existed with no caller at all, while
 * the about, privacy and terms pages all told users the app links out to
 * Google Flights — so the claim was true of the code and false of the app.
 */

const CUSCO = { lat: -13.53, lng: -71.97, name: "Cusco", dest: "Cusco, Peru" };
// ~200km from Cusco: flightHop calls anything under 350km overland.
const NEARBY = { lat: -11.7, lng: -71.97, name: "Nearby", dest: "Nearby, Peru" };
// Far enough apart that flightHop treats it as a flight, not an overland hop.
const BANGKOK = { lat: 13.75, lng: 100.5, name: "Bangkok", dest: "Bangkok, Thailand" };

afterEach(cleanup);

describe("buildFlightsUrl", () => {
  it("builds a Google Flights search for the destination", () => {
    const url = buildFlightsUrl("Cusco, Peru");
    expect(url).toContain("google.com/travel/flights");
    expect(decodeURIComponent(url)).toContain("flights to Cusco, Peru");
  });

  it("escapes a destination rather than breaking the query", () => {
    expect(buildFlightsUrl("Nice & Antibes")).not.toContain("&Antibes");
  });
});

describe("the first stop", () => {
  it("offers a flight search, not just the words", () => {
    // It used to read "search flights for your dates" as plain prose.
    render(<GettingThere isFirst to={CUSCO} regionName="Cusco" />);

    const href = screen
      .getByRole("link", { name: /search flights/i })
      .getAttribute("href")!;
    expect(href).toContain("google.com/travel/flights");
    expect(decodeURIComponent(href)).toContain("Cusco, Peru");
  });

  it("keeps a curated getting-there note and still links out", () => {
    render(
      <GettingThere
        isFirst
        to={CUSCO}
        regionName="Cusco"
        note="Cusco (CUZ) via Lima"
      />
    );
    expect(screen.getByText(/Cusco \(CUZ\) via Lima/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /search flights/i })).toBeTruthy();
  });
});

describe("later stops", () => {
  it("offers flights alongside the route comparison when it's a flight", () => {
    render(
      <GettingThere isFirst={false} from={CUSCO} to={BANGKOK} regionName="Bangkok" />
    );

    expect(screen.getByRole("link", { name: /compare routes/i })).toBeTruthy();
    const flights = screen.getByRole("link", { name: /^flights/i });
    expect(decodeURIComponent(flights.getAttribute("href")!)).toContain(
      "Bangkok, Thailand"
    );
  });

  it("offers no flight search for an overland hop", () => {
    render(
      <GettingThere
        isFirst={false}
        from={CUSCO}
        to={NEARBY}
        regionName="Nearby"
      />
    );
    expect(screen.getByRole("link", { name: /compare routes/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /^flights/i })).toBeNull();
  });
});
