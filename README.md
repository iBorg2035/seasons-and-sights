# Seasons & Sights

A travel app for **70+ destinations across Southeast Asia, South America,
Europe, Africa, North America, and Oceania**, built around the one question
that makes or breaks a trip: *is it the dry or wet season here, right now — and
is it worth the crowds?* Each destination shows a 12-month dry/wet calendar, a
matching crowds/price strip, real historical climate data, local sights on a
map, live weather, festivals, a travel toolkit, and a Booking.com link with
dates pre-set to the best season. Trips can be planned, saved, laid out on a
year calendar, shared by link, and (optionally, via Supabase) synced to an
account and co-edited.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Leaflet** + OpenStreetMap tiles (no API key) for maps
- **Open-Meteo** for live weather (no API key)
- **Vitest** for unit tests

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm test         # unit tests
```

Optional: copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_BOOKING_AID`
to your Booking.com affiliate id so accommodation links are attributed for
commission. Links work without it.

## Deploy (Vercel)

The app is a standard Next.js project with no database and no required secrets,
so it deploys to Vercel as-is.

1. **Create an empty GitHub repo** at https://github.com/new (no README or
   `.gitignore` — they already exist here).
2. **Push:**
   ```bash
   git remote add origin https://github.com/<your-username>/seasons-and-sights.git
   git push -u origin main
   ```
3. **Import to Vercel** at https://vercel.com/new → select the repo. Vercel
   auto-detects Next.js; no build settings to change. Click **Deploy**. Every
   push to `main` then redeploys automatically.

**Environment variables:** none required. Optionally set `NEXT_PUBLIC_BOOKING_AID`
in the Vercel project settings for affiliate attribution.

**Before real traffic:** the map defaults to OpenStreetMap's public tiles, which
are fine for development but not meant for production load. Point it at a keyed
provider (MapTiler / Stadia / Carto — all have free tiers) by setting
`NEXT_PUBLIC_MAP_TILE_URL` and `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` in your Vercel
env (see [`.env.example`](.env.example)). No code change needed.

## How it works

- **Season data** is curated, accurate climatology in [`src/data/regions.ts`](src/data/regions.ts):
  each region has a 12-month `dry`/`wet`/`shoulder` calendar with notes (peak
  trekking, typhoon risk, the Uyuni mirror effect, etc.). This makes the app
  instant and fully functional offline.
- **Crowds & prices** are a second seasonal dimension: `crowdForMonth`
  ([`src/lib/season.ts`](src/lib/season.ts)) derives a peak/moderate/quiet level
  from the season, with per-month overrides for divergences (Rio's Carnival,
  Japan's Obon, holiday spikes).
- **Live weather** ([`src/lib/weather.ts`](src/lib/weather.ts)) and **historical
  climate normals** (2019–2023 avg rain + temperature) are fetched through
  `/api/weather` and `/api/climate` and cached; both are non-blocking
  enhancements over the curated data.
- **Booking links** ([`src/lib/booking.ts`](src/lib/booking.ts)) are prefilled
  Booking.com search deep-links — no partner API required. Check-in dates default
  to the selected month (15-night stay) via `datesForMonth`.

## Pages

- `/` — **Explore**: browse destinations, filter by style/region/search or
  "good to visit now", with a map view.
- `/when-to-go` — **Season planner**: pick a month, see where it's dry vs. wet
  across all regions.
- `/planner` — **Trip planner**: pick destinations + a start month + a duration
  per stop; it sequences the stops so each lands in its dry/shoulder window
  (`planItinerary`). Plans are encoded in the URL, so they're shareable, and can
  be saved (locally, or to an account when Supabase is configured).
- `/calendar` — **Trip calendar**: every saved trip as a bar across a Jan–Dec
  timeline, coloured by each stop's season.
- `/today` — **Dashboard**: where you are (or what's next) on the current trip,
  live weather, this month's festivals, and a pre-departure checklist.
- `/compare` — side-by-side destination comparison for a chosen month.
- `/festivals` — month-by-month festival calendar across all destinations.
- `/surprise` — random destination picker with month/region filters.
- `/where-can-i-go` — reverse planner: constraints in, destinations out.
- `/regions/[id]` — **Destination**: season calendar, crowds/price strip,
  historical climate chart, sights map, live weather, festivals, travel
  toolkit, and a season-aware Booking.com link.
- `/trip/[token]` — public read-only view of a shared trip.

## Adding a destination

The dataset is split so client bundles only ship the lightweight fields:

1. Add the core fields (id, name, coords, `climate()` pattern, blurb) to
   `REGIONS_CORE` in [`src/data/regions-core.ts`](src/data/regions-core.ts) —
   the 12-char pattern is `D`=dry, `W`=wet, `S`=shoulder, January→December —
   plus entries in its `DAILY_BUDGET` and `TRAVEL_INFO` maps.
2. Add sights to [`src/data/sights.ts`](src/data/sights.ts), then run
   `node scripts/build-sight-summary.mjs` to refresh the slim summary.
3. Add a toolkit entry (`src/data/toolkits.ts`), a Wikipedia photo title
   (`src/data/wiki-titles.json`, then `node scripts/fetch-photos.mjs` and
   `node scripts/download-photos.mjs`), and optionally festivals
   (`src/data/events.ts`).

Everything else (badges, strips, best-time, booking dates, static page)
derives automatically.
