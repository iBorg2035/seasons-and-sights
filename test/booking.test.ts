import { describe, it, expect } from "vitest";
import { buildBookingUrl, buildFlightsUrl } from "@/lib/booking";

describe("buildBookingUrl", () => {
  it("builds a Booking.com search URL with the destination", () => {
    const url = new URL(buildBookingUrl({ dest: "Cusco, Peru" }));
    expect(url.hostname).toBe("www.booking.com");
    expect(url.pathname).toBe("/searchresults.html");
    expect(url.searchParams.get("ss")).toBe("Cusco, Peru");
  });

  it("includes dates, guests, rooms, and a tracking label", () => {
    const url = new URL(
      buildBookingUrl({
        dest: "Bali, Indonesia",
        checkin: "2026-07-10",
        checkout: "2026-07-15",
        adults: 3,
        rooms: 2,
      })
    );
    expect(url.searchParams.get("checkin")).toBe("2026-07-10");
    expect(url.searchParams.get("checkout")).toBe("2026-07-15");
    expect(url.searchParams.get("group_adults")).toBe("3");
    expect(url.searchParams.get("no_rooms")).toBe("2");
    expect(url.searchParams.get("label")).toBe("seasons-and-sights");
  });

  it("defaults to 2 adults and 1 room", () => {
    const url = new URL(buildBookingUrl({ dest: "Cartagena, Colombia" }));
    expect(url.searchParams.get("group_adults")).toBe("2");
    expect(url.searchParams.get("no_rooms")).toBe("1");
  });

  it("adds lat/lng when provided and omits aid when unset", () => {
    const url = new URL(
      buildBookingUrl({ dest: "Cusco, Peru", lat: -13.53, lng: -71.97 })
    );
    expect(url.searchParams.get("latitude")).toBe("-13.53");
    expect(url.searchParams.get("longitude")).toBe("-71.97");
    // No NEXT_PUBLIC_BOOKING_AID in the test env → no aid param.
    expect(url.searchParams.has("aid")).toBe(false);
  });

  it("attaches the affiliate id when passed explicitly", () => {
    const url = new URL(
      buildBookingUrl({ dest: "Cusco, Peru", aid: "1234567" })
    );
    expect(url.searchParams.get("aid")).toBe("1234567");
  });
});

describe("buildFlightsUrl", () => {
  it("builds a Google Flights search for the destination", () => {
    const url = buildFlightsUrl("Cusco, Peru");
    expect(url).toContain("google.com/travel/flights");
    expect(url).toContain(encodeURIComponent("flights to Cusco, Peru"));
  });
});
