"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Re-apply the stored theme rather than trusting the class on <html>. The
    // inline script in the root layout sets it before paint, but when a
    // dynamic route calls notFound() React re-renders <html> with its own
    // className and the "dark" class is lost — a mistyped /regions/ link
    // flashed a dark-mode reader into light mode. Same rule as that script:
    // anything but an explicit "light" is dark.
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("theme");
    } catch {
      // storage blocked — fall back to whatever the page already has
    }
    const isDark =
      stored === null
        ? document.documentElement.classList.contains("dark")
        : stored !== "light";
    document.documentElement.classList.toggle("dark", isDark);
    setDark(isDark);
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // ignore storage failures
    }
    setDark(next);
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
