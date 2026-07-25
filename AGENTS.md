# AGENTS.md — Seasons & Sights

Next.js 15 (App Router) + React 19 + TS (strict) + Tailwind 4. Data-driven
dry/wet-season travel planner over 72 curated destinations. Trips live in
`localStorage` (offline-first) and optionally sync to Supabase when signed in;
every cloud/API feature must degrade to a working local app when its env vars
are absent. `main` auto-deploys to Vercel.

`CLAUDE.md` mirrors this file (same content, different title) and
`.cursor/rules/travel-app.mdc` is a short pointer to it — update them together.

## Commands
- `npm run dev` · `npm run build` · `npm start` · `npx vitest run` · `npx tsc --noEmit`
- Data regeneration (run after editing the source data module, commit the JSON):
  `node scripts/build-sight-summary.mjs` (after `sights.ts`) ·
  `node scripts/build-crowd-overrides.mjs` (after `events.ts`) ·
  `node scripts/fetch-photos.mjs` + `node scripts/download-photos.mjs` (after
  `wiki-titles.json`) · `node scripts/check-seasons.mjs` (audits curated
  seasons against Open-Meteo rainfall).

## Review & QA norms (read before shipping)
Most bugs here hide at **state transitions** and **isolation boundaries**, not in
the lines a diff changed. So:

- **Test the transition, not the state.** For anything stored per-entity, run
  "do X on A → switch to B → assert B is clean → back → assert A kept." See
  [docs/QA-JOURNEYS.md](docs/QA-JOURNEYS.md).
- **Scope per-entity storage.** Any `localStorage`/DB key holding per-trip or
  per-destination state MUST include the entity id. A bare global key for
  per-entity data was the checklist-isolation bug. Grep keys when reviewing.
- **UI-state / multi-entity changes get a high-effort review** — `/code-review
  high`, or `ultra` for shared infra (trips, auth, the checklist/draft state).
- **Every fixed bug leaves a regression test** (e.g. `checklistStorageKey`).
- **Verify against a production build and hard-refresh** — `next dev` Fast
  Refresh and CDN/browser caches hide real bugs.
- **One rule, one module.** The same rule reimplemented per call site is how the
  flexible-start bug shipped (six copies, four rules, one view with none). When
  you find a rule duplicated across views, consolidate it into `src/lib/` and
  inject what varies (see `trip-plan.ts`) rather than adding a seventh copy.

## Architecture notes

### Data layer (client-bundle hygiene)
- `src/data/regions-core.ts` holds the 72 destinations' light fields (id,
  coords, 12-month `D`/`W`/`S` climate pattern, blurb, budget, travel info) and
  imports nothing heavy. Everything else layers on top:
  - `@/data/regions` = core + `sights.ts` + `toolkits.ts` + `events.ts`.
    **Server-only** — no `"use client"` module may import it.
  - `@/data/regions-slim` / `@/data/events-slim` = what client views import.
    Slim regions carry `sightCount`/`sightTypes` from the generated
    `sight-summary.json` instead of the sights themselves.
- The sanctioned way for a client view to reach heavy data is the
  `/api/region-detail?id=` route (sights, toolkit, events, advisory), fetched
  lazily when a stop is expanded (`StopDetail`).
- Generated, committed JSON: `sight-summary.json`, `crowd-overrides.json`,
  `photos.json` (+ `public/photos/`). Regenerate with the scripts above; never
  hand-edit.
- Adding rows to `regions.ts` / `sights.ts` must not grow client-route bundles.
  For adding a destination, follow the checklist in [README.md](README.md).

### Trips model
- `src/lib/saved-trips.ts` is the single source of truth (`seasons-saved-trips`
  + `SAVED_TRIPS_EVENT` + create/update/rename/delete helpers). Writes return a
  boolean — a blocked or full `localStorage` must surface as a save error, not a
  phantom trip.
- `src/lib/active-trip.ts` holds the "currently editing" pointer and
  self-repairs (`ensureActiveTripId`) when it points at a deleted trip.
- `src/lib/trip-plan.ts` is the **only** implementation of
  `[regionId, months][] → PlannerStop[] → ItineraryLeg[]`, including the
  flexible-start rule (a `start` outside 1–12 means "current month") and the
  duration clamp. It takes an injected region lookup so client views and
  server-only callers share the logic without sharing an import; client code
  must go through `src/lib/trip-plan-slim.ts` (`tripToSlimStops` /
  `tripSlimLegs`).
- `src/lib/season.ts` is the domain core: season/crowd lookup, `planItinerary`
  (sequences stops into their dry/shoulder windows), leg date ranges,
  `findActiveLeg`, cost estimates, booking dates, and the
  `SEASON_META`/`CROWD_META` display tables. `trip-health.ts` scores a planned
  itinerary (weather / crowds / pace / prep, plus optional interest fit) into
  warnings and strengths.
- Routes: `/trips` is the home base, `/trips/[id]` the unified trip page
  (`TripView` → Route / Stops / Prep / Map sections; `?add=<regionId>` stages a
  destination coming from `AddToTripButton`). `/calendar`, the 🧳 nav badge, and
  the account menu all read the same store. `/planner` and `/today` are legacy
  client-side redirects, and `src/lib/trip-migrate.ts` one-time-migrates the old
  anonymous draft (flag `seasons-migrated-v2`).

### Cloud sync, sharing, auth (all optional)
- `getSupabase()` dynamic-imports `@supabase/ssr` so ~180 kB stays out of every
  route's initial JS; it resolves to `null` when env vars are missing and the
  account UI hides itself. `isSupabaseConfigured` gates anything account-shaped.
- Every trips-table call funnels through `reportSync` in
  `src/lib/supabase/trips.ts` → `sync-status.ts` → `SyncBadge`. Never swallow a
  remote failure in a `console.warn`; that asymmetry (upsert reported, delete
  silent) is exactly what this indirection exists to prevent. Merge is
  last-write-wins on `updatedAt`.
- `src/lib/supabase/collaborate.ts` handles co-editor invites by email via the
  `invite_trip_editor_by_email` RPC — deliberately opaque about whether an
  account exists. Public share links (`/trip/[token]`, `SharedTripView`) are
  read-only and resolve through the `get_shared_trip` security-definer function
  so shares can't be enumerated.
- `supabase/schema.sql` is the whole server contract (RLS, share-payload size
  caps, GDPR `delete_account`); see [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
  `/debug-sync` is a read-only cloud-sync diagnostic page (intentionally
  deployed, not in nav).

### Theming — no `dark:` variants
Components write plain light-mode Tailwind utilities (`bg-white`,
`text-slate-500`, `bg-teal-100`); dark mode is a block of scoped remaps at the
bottom of `src/app/globals.css`, and the theme class is set pre-paint in
`layout.tsx` (**dark is the default**, pure black for OLED). There are zero
`dark:` utilities in `src/` — keep it that way.
**Consequence:** any color utility you introduce that has no remap renders as an
unreadable pastel on black. When you add a new `bg-*` / `text-*` / `border-*`
family, add its dark remap in the same commit and eyeball both themes. Season
and crowd colors are *data* (dry=amber, wet=sky, shoulder=emerald) and keep
their meaning in both themes.

### Everything else
- API routes (`/api/weather`, `/api/climate`, `/api/fx`, `/api/tripadvisor`,
  `/api/region-detail`) are cached, non-blocking enhancements over the curated
  data; they validate coordinates and return a null-ish payload instead of
  throwing. `TRIPADVISOR_API_KEY` is server-only; every other env var is
  optional and documented in `.env.example`.
- `public/sw.js` is a stale-while-revalidate offline cache. **Bump `CACHE` on
  every release** or returning visitors keep rendering the old bundle.
- `report-error.ts` posts to Sentry's envelope endpoint only when
  `NEXT_PUBLIC_SENTRY_DSN` is set — otherwise a no-op, with no added dependency.

## Storage keys
Global by design: `theme`, `seasons-onboarded`, `seasons-passport`,
`seasons-saved-trips`, `seasons-active-trip-id`, `seasons-migrated-v2`
(`seasons-draft` is legacy, read only by the one-time migration).
Per-entity, must carry the id: `seasons-checklist:<tripId>` via
`checklistStorageKey`. Audit with
`grep -rhoE 'localStorage\.[a-z]+Item\([^,)]+' src`.

## Tests
Vitest 3 + Testing Library in `test/*.test.{ts,tsx}` (24 files, 141 tests as of
this writing). The environment defaults to `node`; component tests opt into
jsdom with a `// @vitest-environment jsdom` docblock on line 1. `@/` resolves to
`src/`. "Green" for a change means all three of `npx vitest run`,
`npx tsc --noEmit`, and `npm run build`.

## Docs map
[README.md](README.md) (product overview, page list, adding a destination) ·
[docs/QA-JOURNEYS.md](docs/QA-JOURNEYS.md) (manual pre-ship journeys) ·
[SUPABASE_SETUP.md](SUPABASE_SETUP.md) · `docs/superpowers/` (historical design
specs and implementation plans — context for *why*, not current API reference).
