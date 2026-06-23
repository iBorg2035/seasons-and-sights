import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ErrorReporter } from "@/components/ErrorReporter";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#f97316",
};

// Set the theme class before paint to avoid a flash of the wrong theme.
const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`;

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const SITE_URL = "https://seasons-and-sights.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Seasons & Sights — travel in the right season",
    template: "%s · Seasons & Sights",
  },
  description:
    "Know the dry and wet seasons (and the crowds) for destinations across Asia, South America, Europe, and Africa — find local sights and book your stay at the right time of year.",
  openGraph: {
    title: "Seasons & Sights — travel in the right season",
    description:
      "Dry/wet seasons, crowds, festivals, sights, and a season-optimizing trip planner across 69 destinations.",
    url: SITE_URL,
    siteName: "Seasons & Sights",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Seasons & Sights — travel in the right season",
    description:
      "Dry/wet seasons, crowds, festivals, sights, and a season-optimizing trip planner across 69 destinations.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable}`}
    >
      <body className="min-h-screen antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ServiceWorkerRegister />
        <ErrorReporter />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[2000] focus:rounded-lg focus:bg-stone-900 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <AuthProvider>
        <header className="sticky top-0 z-[1000] border-b border-[var(--hairline)] bg-[var(--chrome)] backdrop-blur">
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
            <SiteNav />
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 py-10">
          {children}
        </main>
        <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-stone-400">
          <p>
            Season data is curated climatology; live weather & historical normals
            from Open-Meteo; photos via Wikipedia. Accommodation links open
            Booking.com.
          </p>
          <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/about" className="hover:text-stone-600">
              About the data
            </Link>
            <Link href="/privacy" className="hover:text-stone-600">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-stone-600">
              Terms
            </Link>
          </nav>
        </footer>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
