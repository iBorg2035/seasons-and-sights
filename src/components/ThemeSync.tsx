"use client";

import { useEffect } from "react";
import { prefersDark, readStoredTheme } from "@/lib/theme";

/**
 * Keeps the `dark` class on <html> matching the stored theme. Renders nothing;
 * mounted once, in the root layout.
 *
 * The inline theme script sets the class before paint, but React clears every
 * attribute on <html> when it takes it over or replaces it — which is what
 * happens when a dynamic route calls notFound() — and the class went with it,
 * turning a mistyped /regions/ link light for dark-mode readers. So: apply
 * the stored theme on mount, and again whenever the class is changed away
 * from it. ThemeToggle writes storage before the class, so its own changes
 * always agree and are left alone.
 */
export function ThemeSync() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const stored = readStoredTheme();
      if (stored === undefined) return; // storage blocked: keep what's there
      const dark = prefersDark(stored);
      if (root.classList.contains("dark") !== dark) {
        root.classList.toggle("dark", dark);
      }
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return null;
}
