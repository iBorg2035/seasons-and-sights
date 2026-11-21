"use client";

import { useDarkTheme } from "@/lib/use-dark-theme";
import { THEME_KEY } from "@/lib/theme";

export function ThemeToggle() {
  // Read from the <html> class, so the nav's desktop and mobile copies of
  // this button always agree with each other and with the page.
  const dark = useDarkTheme();

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    // Storage first: ThemeSync restores the class to whatever is stored.
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // ignore storage failures
    }
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="ml-1 rounded-lg px-2.5 py-1.5 text-stone-600 transition hover:bg-teal-50 hover:text-stone-900"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
