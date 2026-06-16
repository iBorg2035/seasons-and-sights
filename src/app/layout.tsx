import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seasons & Sights — travel in the right season",
  description:
    "Know the dry and wet seasons (and the crowds) for destinations across Asia, South America, Europe, and Africa — find local sights and book your stay at the right time of year.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-[1000] border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
              <span className="text-xl" aria-hidden>
                🌦️
              </span>
              <span>
                Seasons<span className="text-amber-500">&amp;</span>Sights
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium">
              <Link
                href="/"
                className="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Explore
              </Link>
              <Link
                href="/when-to-go"
                className="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                When to go
              </Link>
              <Link
                href="/planner"
                className="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Planner
              </Link>
              <Link
                href="/festivals"
                className="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Festivals
              </Link>
              <Link
                href="/compare"
                className="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Compare
              </Link>
              <Link
                href="/surprise"
                className="rounded-lg px-3 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Surprise
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-slate-400">
          Season data is curated climatology; live weather from Open-Meteo.
          Accommodation links open Booking.com.
        </footer>
      </body>
    </html>
  );
}
