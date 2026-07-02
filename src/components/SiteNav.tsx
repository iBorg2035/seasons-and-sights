"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountMenu } from "@/components/AccountMenu";
import { getSavedTrips, SAVED_TRIPS_EVENT } from "@/lib/saved-trips";

// Primary nav items (the two main entry points)
const PRIMARY = [
  { href: "/", label: "Explore" },
  { href: "/trips", label: "My trips" },
];

// Secondary (discovery tools)
const SECONDARY = [
  { href: "/when-to-go", label: "When to go" },
  { href: "/compare", label: "Compare" },
  { href: "/calendar", label: "Calendar" },
  { href: "/festivals", label: "Festivals" },
  { href: "/surprise", label: "Surprise" },
  { href: "/where-can-i-go", label: "For me" },
];

function TripsBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const sync = () => setCount(getSavedTrips().length);
    sync();
    window.addEventListener(SAVED_TRIPS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SAVED_TRIPS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  if (count === 0) return null;
  return (
    <Link
      href="/trips"
      className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-amber-600"
      title={`${count} saved ${count === 1 ? "trip" : "trips"}`}
    >
      🧳 {count}
    </Link>
  );
}

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <nav className="hidden flex-wrap items-center gap-0.5 text-sm font-medium sm:flex">
        {PRIMARY.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg px-2.5 py-1.5 font-semibold text-stone-800 transition hover:bg-orange-100/70 hover:text-stone-900"
          >
            {item.label}
          </Link>
        ))}
        {SECONDARY.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg px-2.5 py-1.5 text-stone-600 transition hover:bg-orange-100/70 hover:text-stone-900"
          >
            {item.label}
          </Link>
        ))}
        <TripsBadge />
        <ThemeToggle />
        <AccountMenu />
      </nav>

      {/* Mobile controls */}
      <div className="flex items-center gap-1 sm:hidden">
        <TripsBadge />
        <ThemeToggle />
        <AccountMenu />
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="rounded-lg px-2.5 py-1.5 text-stone-600 transition hover:bg-orange-100/70 hover:text-stone-900"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown (wraps to full width inside the flex-wrap header) */}
      {open && (
        <nav className="w-full sm:hidden">
          <div className="flex flex-col gap-0.5 border-t border-[var(--hairline)] pt-2 text-sm font-medium">
            {PRIMARY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2.5 py-2 text-stone-700 transition hover:bg-orange-100/70 hover:text-stone-900"
              >
                {item.label}
              </Link>
            ))}
            {SECONDARY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2.5 py-2 text-stone-700 transition hover:bg-orange-100/70 hover:text-stone-900"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
