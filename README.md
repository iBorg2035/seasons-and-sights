# Seasons & Sights

A travel app for **Southeast Asia**, **South America**, and the **Mediterranean
Balkans** built around the one question that makes or breaks a trip in these
regions: *is it the dry or wet season here, right now?* (In the Balkans the
pattern simply inverts — dry summers, wet winters.) Each destination shows a
12-month dry/wet calendar,
local sights on a map, live weather, and a Booking.com link with dates
pre-set to the best season.

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

## How it works

- **Season data** is curated, accurate climatology in [`src/data/regions.ts`](src/data/regions.ts):
  each region has a 12-month `dry`/`wet`/`shoulder` calendar with notes (peak
  trekking, typhoon risk, the Uyuni mirror effect, etc.). This makes the app
  instant and fully functional offline.
- **Live weather** ([`src/lib/weather.ts`](src/lib/weather.ts)) is a non-blocking
  enhancement fetched through `/api/weather` and cached for an hour.
- **Booking links** ([`src/lib/booking.ts`](src/lib/booking.ts)) are prefilled
  Booking.com search deep-links — no partner API required. Check-in dates default
  to the region's next best season via `suggestTravelDates`.

## Pages

- `/` — **Explore**: browse destinations, filter by region or "good to visit now".
- `/when-to-go` — **Season planner**: pick a month, see where it's dry vs. wet
  across both continents.
- `/regions/[id]` — **Destination**: full season calendar, sights map, live
  weather, and a season-aware Booking.com link.

## Adding a destination

Append a `Region` to `src/data/regions.ts`. The 12-char `climate()` pattern is
`D`=dry, `W`=wet, `S`=shoulder, January→December. Everything else (badges,
strips, best-time, booking dates, static page) derives automatically.
