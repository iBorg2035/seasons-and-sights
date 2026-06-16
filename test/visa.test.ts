import { describe, it, expect } from "vitest";
import { visaFor, visaCheckUrl } from "@/lib/visa";

describe("visaFor", () => {
  it("returns the default status for common passports", () => {
    expect(visaFor("Thailand", "UK")).toMatch(/visa-free/i);
    expect(visaFor("Japan", "AU")).toMatch(/visa-free/i);
  });

  it("applies passport-specific overrides", () => {
    expect(visaFor("Brazil", "US")).toMatch(/evisa/i);
    expect(visaFor("Brazil", "EU")).toMatch(/visa-free/i);
    expect(visaFor("Bolivia", "US")).toMatch(/visa required/i);
    expect(visaFor("Bolivia", "UK")).not.toMatch(/required/i);
  });

  it("returns null for uncurated countries", () => {
    expect(visaFor("Atlantis", "US")).toBeNull();
  });
});

describe("visaCheckUrl", () => {
  it("builds a tailored search link", () => {
    const url = new URL(visaCheckUrl("Vietnam", "CA"));
    expect(url.hostname).toBe("www.google.com");
    expect(url.searchParams.get("q")).toContain("Vietnam");
    expect(url.searchParams.get("q")).toContain("Canadian");
  });
});
