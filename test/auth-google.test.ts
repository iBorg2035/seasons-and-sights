// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { safeNext } from "@/lib/contexts/auth-context";

/**
 * `next` is round-tripped through Google and comes back on a URL we redirect
 * to, so it's attacker-influenceable: anyone can hand out a link with any
 * `next` they like. It must never send the user off-site.
 */

describe("safeNext", () => {
  it("keeps a same-origin path", () => {
    expect(safeNext("/trips/abc/journal")).toBe("/trips/abc/journal");
    expect(safeNext("/trips?add=peru-cusco")).toBe("/trips?add=peru-cusco");
  });

  it("falls back when there's nothing to go back to", () => {
    expect(safeNext(null)).toBe("/trips");
    expect(safeNext(undefined)).toBe("/trips");
    expect(safeNext("")).toBe("/trips");
  });

  it("refuses absolute URLs", () => {
    expect(safeNext("https://evil.example/phish")).toBe("/trips");
    expect(safeNext("http://evil.example")).toBe("/trips");
  });

  it("refuses protocol-relative URLs", () => {
    // "//evil.example" is a valid absolute URL to a browser — the classic way
    // a naive startsWith("/") check becomes an open redirect.
    expect(safeNext("//evil.example")).toBe("/trips");
    expect(safeNext("//evil.example/path")).toBe("/trips");
  });

  it("refuses schemes that aren't navigation at all", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/trips");
    expect(safeNext("data:text/html,<script>alert(1)</script>")).toBe("/trips");
  });

  it("refuses a bare path with no leading slash", () => {
    // "evil.example" would resolve relative to the current directory, but a
    // bare host-looking value is never something we meant to produce.
    expect(safeNext("evil.example")).toBe("/trips");
  });
});
