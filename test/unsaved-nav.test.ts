import { describe, it, expect } from "vitest";
import { shouldGuardNavigation, type ClickIntent } from "@/lib/unsaved-nav";

/**
 * The predicate behind the unsaved-changes guard. It has to be right in both
 * directions: guard too little and someone's edits vanish when they click the
 * header, guard too much and the page starts prompting on clicks that never
 * navigate — including its own #section anchors.
 */

const HERE = "https://seasons.example/trips/abc";

const plainClick: ClickIntent = {
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
};

const guard = (
  href: string | null,
  intent: Partial<ClickIntent> = {},
  extra: { target?: string | null; download?: boolean } = {},
  here = HERE
) =>
  shouldGuardNavigation(
    href === null ? null : { href, ...extra },
    { ...plainClick, ...intent },
    here
  );

describe("navigations that must be guarded", () => {
  it("guards a link to another page in the app", () => {
    // The case this exists for: the global header, which the trip page
    // doesn't render and so can't guard link by link.
    expect(guard("https://seasons.example/calendar")).toBe(true);
    expect(guard("https://seasons.example/trips")).toBe(true);
  });

  it("guards a link to a different trip", () => {
    expect(guard("https://seasons.example/trips/other")).toBe(true);
  });

  it("guards a sub-route of this trip", () => {
    expect(guard("https://seasons.example/trips/abc/journal")).toBe(true);
  });

  it("guards a link that changes the query on the same path", () => {
    expect(guard("https://seasons.example/trips/abc?add=peru-cusco")).toBe(true);
  });
});

describe("clicks that must NOT be guarded", () => {
  it("ignores the page's own section anchors", () => {
    // The trip page's nav is #route / #stops / #prep / #map. These scroll;
    // they don't navigate, and prompting on them would be maddening.
    expect(guard("https://seasons.example/trips/abc#stops")).toBe(false);
    expect(guard("https://seasons.example/trips/abc#route")).toBe(false);
  });

  it("ignores clicks that aren't on a link at all", () => {
    expect(guard(null)).toBe(false);
  });

  it("ignores modified clicks, which open a new tab and leave this one alone", () => {
    for (const mod of ["metaKey", "ctrlKey", "shiftKey", "altKey"] as const) {
      expect(guard("https://seasons.example/calendar", { [mod]: true })).toBe(
        false
      );
    }
  });

  it("ignores middle and right clicks", () => {
    expect(guard("https://seasons.example/calendar", { button: 1 })).toBe(false);
    expect(guard("https://seasons.example/calendar", { button: 2 })).toBe(false);
  });

  it("ignores a click something else already handled", () => {
    expect(
      guard("https://seasons.example/calendar", { defaultPrevented: true })
    ).toBe(false);
  });

  it("ignores links that open elsewhere", () => {
    expect(
      guard("https://seasons.example/calendar", {}, { target: "_blank" })
    ).toBe(false);
    // _self is an explicit "this tab", so it still counts.
    expect(
      guard("https://seasons.example/calendar", {}, { target: "_self" })
    ).toBe(true);
  });

  it("ignores downloads — the page stays put", () => {
    expect(
      guard("https://seasons.example/trip.ics", {}, { download: true })
    ).toBe(false);
  });

  it("ignores external links, which beforeunload already covers", () => {
    // Guarding here as well would prompt twice for one navigation.
    expect(guard("https://booking.com/searchresults")).toBe(false);
  });

  it("ignores non-navigating schemes", () => {
    expect(guard("mailto:hello@seasons.example")).toBe(false);
    expect(guard("tel:+441234567890")).toBe(false);
  });

  it("survives an unparseable href instead of throwing", () => {
    expect(guard("::::not a url")).toBe(false);
  });
});
