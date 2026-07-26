// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { isProviderEnabled } from "@/lib/supabase/auth-providers";

/**
 * The dialog only draws a social button when the project actually has that
 * provider on. Getting this backwards means either a dead button that errors
 * with "provider is not enabled" (looks broken), or hiding sign-in from
 * someone who could have used it (worse).
 */

describe("isProviderEnabled", () => {
  it("is true for a provider the project has on", () => {
    expect(isProviderEnabled(new Set(["email", "google"]), "google")).toBe(true);
  });

  it("is false for one it doesn't", () => {
    // The state this project is in right now: email only.
    expect(isProviderEnabled(new Set(["email"]), "google")).toBe(false);
  });

  it("is false when the project has nothing configured", () => {
    expect(isProviderEnabled(new Set(), "google")).toBe(false);
  });

  it("is true for everything when the probe couldn't tell", () => {
    // A probe that failed is far more likely to be a network blip than a
    // disabled provider, so the button stays and its error explains itself.
    expect(isProviderEnabled(new Set(["*"]), "google")).toBe(true);
    expect(isProviderEnabled(new Set(["*"]), "apple")).toBe(true);
  });
});
