// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ThemeToggle } from "@/components/ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  // Regression: notFound() on a dynamic route re-renders <html> and drops the
  // class the inline theme script added.
  it("restores the stored dark theme when <html> has lost its class", () => {
    localStorage.setItem("theme", "dark");
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("leaves an explicit light choice light", () => {
    localStorage.setItem("theme", "light");
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
