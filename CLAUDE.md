# CLAUDE.md — Seasons & Sights

Next.js 15 (App Router) + React 19 + TS + Tailwind. Data-driven dry/wet-season
travel planner. Trips live in `localStorage` (offline-first) and optionally sync
to Supabase when signed in. `main` auto-deploys to Vercel.

## Commands
- `npm run dev` · `npm run build` · `npm start` · `npx vitest run` · `npx tsc --noEmit`

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

## Architecture notes
- Client views import the slim data modules (`@/data/regions-slim`,
  `@/data/events-slim`), never the heavy `@/data/regions` (server-only). Adding
  rows to `regions.ts`/`sights.ts` must not grow client-route bundles.
- Saved trips: `src/lib/saved-trips.ts` (key + `SAVED_TRIPS_EVENT` + load helper)
  is the single source; planner, Today, nav badge, and account menu all use it.
- Auth/Supabase is lazy-loaded (`getSupabase()` dynamic-imports `@supabase/ssr`)
  and must degrade gracefully when env vars are absent.
