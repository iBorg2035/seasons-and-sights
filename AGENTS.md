# AGENTS.md — Seasons & Sights

Next.js 15 (App Router) + React 19 + TS + Tailwind. Data-driven dry/wet-season
travel planner. Trips live in `localStorage` (offline-first) and optionally sync
to Supabase when signed in. `main` auto-deploys to Vercel.

## Commands
- `npm run dev` · `npm run build` · `npm start` · `npx vitest run` · `npx tsc --noEmit`

## AI assistant (SpaceXAI / Grok)
- `/assistant` and the trip co-pilot on `/trips/[id]` call `POST /api/assistant`.
- Requires server env `XAI_API_KEY` (never `NEXT_PUBLIC_*`). Optional `XAI_MODEL` (default `grok-4.5`).
- Tool implementations live in `src/lib/assistant/tools-data.ts` (server-only; full `REGIONS`).
- Client chat UI: `AssistantChat` + `TripCopilot`. Roadmap: `docs/AI-ROADMAP.md`.

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

## Checkpointing (a session can end without warning)

An assistant **cannot see its own usage** and gets no warning before a limit
cuts a session off. Do not claim to be watching a threshold, and do not save
work "when usage gets high" — there is no signal to act on. Make the cutoff
cheap instead:

- **Commit at every green point, not every stage boundary.** tsc + `npx vitest
  run` + `npm run build` passing, and the work coherent? Commit it — mid-stage
  is fine, live QA still outstanding is fine. Record what's unverified in the
  commit message rather than holding the commit until it is.
- **Push immediately.** A local commit still dies with the machine.
- **Write "where we are" only where it survives**: the commit message, the plan
  file, `reports/`. Conversation context does not survive; those do.
- **A cold resume should need only `git log` plus the plan file** — no
  re-deriving decisions that were already made.

## Architecture notes
- Client views import the slim data modules (`@/data/regions-slim`,
  `@/data/events-slim`), never the heavy `@/data/regions` (server-only). Adding
  rows to `regions.ts`/`sights.ts` must not grow client-route bundles.
- Trips model: named trips in `src/lib/saved-trips.ts` (key +
  `SAVED_TRIPS_EVENT` + create/update/delete helpers) are the single source;
  `src/lib/active-trip.ts` holds the "currently editing" pointer (self-repairs
  if it points at a deleted trip). `/trips` is the home base, `/trips/[id]`
  the unified trip page (TripView); the calendar, nav badge, and account menu
  all read the same store. `/planner` and `/today` are legacy client-side
  redirects, and `src/lib/trip-migrate.ts` one-time-migrates the old
  anonymous draft (flag `seasons-migrated-v2`).
- Auth/Supabase is lazy-loaded (`getSupabase()` dynamic-imports `@supabase/ssr`)
  and must degrade gracefully when env vars are absent. `/debug-sync` is a
  read-only cloud-sync diagnostic page (intentionally deployed, not in nav).
