import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Seasons & Sights — travel in the right season",
  description:
    "Know the dry and wet seasons (and the crowds) for destinations across Asia, South America, Europe, and Africa — find local sights and book your stay at the right time of year.",
};

const NAV = [
  { href: "/", label: "Explore" },
  { href: "/when-to-go", label: "When to go" },
  { href: "/planner", label: "Planner" },
  { href: "/compare", label: "Compare" },
  { href: "/festivals", label: "Festivals" },
  { href: "/surprise", label: "Surprise" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-[1000] border-b border-[#e7ddca] bg-[#f7f1e6]/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
            <Link
              href="/"
              className="font-display flex items-center gap-2 text-lg font-semibold text-stone-900"
            >
              <span className="text-xl" aria-hidden>
                🌤️
              </span>
              <span>
                Seasons<span className="italic text-orange-500">&amp;</span>Sights
              </span>
            </Link>
            <nav className="flex flex-wrap items-center gap-0.5 text-sm font-medium">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-2.5 py-1.5 text-stone-600 transition hover:bg-orange-100/70 hover:text-stone-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-stone-400">
          Season data is curated climatology; live weather & historical normals
          from Open-Meteo. Accommodation links open Booking.com.
        </footer>
      </body>
    </html>
  );
}
