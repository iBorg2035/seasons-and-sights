"use client";

import { useEffect, useState } from "react";

/**
 * Whether the dark theme is currently on.
 *
 * Reads the `dark` class on <html> — the one the inline theme script sets
 * before first paint and ThemeToggle flips — rather than duplicating the
 * preference in React state. One source of truth; this just observes it.
 *
 * Starts `true` because the app is dark unless someone explicitly chose light
 * (see themeScript in layout.tsx). Guessing dark means a light-mode user sees
 * one frame of dark map; guessing light would flash white into a dark page for
 * everyone else, which is the more jarring way to be wrong.
 */
export function useDarkTheme(): boolean {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const read = () => setDark(document.documentElement.classList.contains("dark"));
    read();

    // ThemeToggle mutates the class directly, so observe it rather than
    // requiring every toggle to remember to notify anyone.
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return dark;
}
