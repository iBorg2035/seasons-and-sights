// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { ThemeSync } from "@/components/ThemeSync";
import { ThemeToggle } from "@/components/ThemeToggle";
import { THEME_SCRIPT, prefersDark } from "@/lib/theme";

const html = document.documentElement;
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  localStorage.clear();
  html.className = "";
});
afterEach(cleanup);

describe("theme rule", () => {
  it.each([[null], ["dark"], ["light"], ["junk"]])(
    "the inline script and prefersDark agree for stored %s",
    (stored) => {
      if (stored !== null) localStorage.setItem("theme", stored);
      html.className = "";
      new Function(THEME_SCRIPT)();
      expect(html.classList.contains("dark")).toBe(prefersDark(stored));
    }
  );
});

describe("ThemeSync", () => {
  // Regression: notFound() on a dynamic route makes React clear <html>'s
  // attributes, dropping the class the inline script added.
  it("restores dark for a visitor who never chose (the default)", () => {
    render(<ThemeSync />);
    expect(html.classList.contains("dark")).toBe(true);
  });

  it("restores a stored dark choice", () => {
    localStorage.setItem("theme", "dark");
    render(<ThemeSync />);
    expect(html.classList.contains("dark")).toBe(true);
  });

  it("leaves an explicit light choice light", () => {
    localStorage.setItem("theme", "light");
    html.classList.add("dark");
    render(<ThemeSync />);
    expect(html.classList.contains("dark")).toBe(false);
  });

  it("puts the class back when it's wiped after mount", async () => {
    render(<ThemeSync />);
    html.removeAttribute("class");
    await act(flush);
    expect(html.classList.contains("dark")).toBe(true);
  });
});

describe("ThemeToggle", () => {
  it("switching to light sticks, and both nav copies agree", async () => {
    render(
      <>
        <ThemeSync />
        <ThemeToggle />
        <ThemeToggle />
      </>
    );
    await act(flush);
    const [first, second] = document.querySelectorAll("button");
    expect(first.getAttribute("aria-label")).toBe("Switch to light mode");
    await act(async () => {
      first.click();
      await flush();
    });
    expect(localStorage.getItem("theme")).toBe("light");
    expect(html.classList.contains("dark")).toBe(false);
    expect(second.getAttribute("aria-label")).toBe("Switch to dark mode");
  });
});
