# Reassessment — 2026-07-01

**Summary:** All three bugs and both data/doc issues from the 2026-06-30 report are now genuinely fixed (verified against the compiled bundle, not just the source diff), and the events-data hole shrank from 39/72 to 4/72 destinations — but the same two bug *patterns* (unhandled Supabase-promise rejections, toggle buttons with no `aria-pressed`) that were fixed in one spot each have reappeared, unaddressed, at several other call sites/components.

Assessed against `origin/main@9eafbd3` (4 commits ahead of the `351d8d0` baseline the last report reviewed).

## Changed since last report

- **Fixed, verified at the bundle level:** `src/data/regions-core.ts` (new) now holds only the small per-region fields; `src/data/sights.ts`, `src/data/toolkits.ts`, and `src/data/events.ts` (new) hold the heavy per-destination data and are imported only by `src/data/regions.ts` (server-only assembly) and each other's dedicated `-slim` module. Grepping the actual `.next/static/chunks/*.js` output confirms it this time: no sight blurb (`"Wat Phra That Doi Suthep"`), toolkit phrase (`"Sawatdee"`, `"Konnichiwa"`, `"Ayuda"`), or event name (`"Songkran"`) appears in any shared chunk or any page chunk other than `/regions/[id]` (full data) and `/festivals` (events only, 14.9KB raw / 5.6KB gzip, via the new `events-slim.ts`). The shared chunk all 9 slim client views pull in dropped from 35KB gzip to 17.9KB gzip and now contains only `climateBlurb`/`info`/`dailyBudget`-type fields.
- **Fixed:** `src/lib/contexts/auth-context.tsx:50-54` — `sb.auth.getSession().then(...)` now has a `.catch()` that resolves `loading` to `false`.
- **Fixed:** `src/components/ExploreGrid.tsx:85,103,117,137` — all four toggle-button groups (style, season filter, "good to visit now", grid/map view) now set `aria-pressed`.
- **Removed:** `suggestTravelDates()` (dead code, stale "15 nights" doc) and its 3 tests in `src/lib/season.ts` / `test/season.test.ts` — accounts for the vitest count dropping from 48 to 45 (expected, not a regression).
- **Fixed:** `src/lib/report-error.ts` header comment now correctly describes the modern envelope endpoint.
- **Data:** events coverage jumped from 33/72 to 68/72 destinations (see Data holes below), and `src/components/RegionPlanner.tsx:94-133` now renders a graceful "no major festivals here" empty state instead of hiding the section, for the remaining 4.
- **Also landed:** Supabase client is now lazy-loaded (`src/lib/supabase/client.ts` — `getSupabase()` is async, dynamically imports `@supabase/ssr`), and every existing call site was correctly updated to `await` it.

## Confirmed bugs

### 1. (Medium-high impact) The just-fixed unhandled-rejection pattern reappears at three other Supabase call sites
The fix in `auth-context.tsx` (adding `.catch()` around `getSession()`) was a one-off patch, not a systemic guard — the same "no `.catch()` on a Supabase promise" shape exists in:
- `src/components/SharedTripView.tsx:30` — `fetchSharedTrip(token).then((t) => setState(t ?? "missing"))` has no `.catch()`. On a rejected promise (offline, DNS failure), `state` never leaves `"loading"` and the view shows an infinite skeleton pulse with no error surfaced — the exact failure mode the auth-context fix addressed.
- `src/components/InviteEditorDialog.tsx:28,58` — `listEditors(tripId, ownerId).then(setEditors)` (both the mount effect and the post-invite refresh) has no `.catch()`, producing an unhandled rejection on network failure.
- `src/components/TripPlanner.tsx:119,147` — `void deleteRemoteTrip(id)` and `void upsertRemoteTrip(userId, t)` are fire-and-forget with no error handling. Neither `deleteRemoteTrip`/`upsertRemoteTrip` (`src/lib/supabase/trips.ts:41-61`) checks the Supabase `error` field or guards against the underlying fetch throwing, so a failed delete/upsert silently desyncs local vs. cloud trip state with no user-facing indication.

**Fix shape:** the same `.catch()` pattern already applied to `auth-context.tsx`, applied at these three additional sites (and worth auditing `fetchSharedWithMe` callers for the same gap).

### 2. (Medium impact) The just-fixed `aria-pressed` gap reappears on ~11 other toggle-button groups
`ExploreGrid.tsx` was fixed, but the identical visual-only-selected-state pattern (background color changes, no `aria-pressed`) is present in:
- `src/components/CompareView.tsx:62` (destination pills), `:92` (month pills)
- `src/components/TripPlanner.tsx:347` (destination pills), `:373` (start-month pills), `:413` (duration pills)
- `src/components/WhenToGoView.tsx:47` (month pills)
- `src/components/SurpriseView.tsx:61` (month pills), `:80` (continent pills)
- `src/components/FestivalsView.tsx:31,46` (month pills)
- `src/components/RegionPlanner.tsx:112` (event/month pills)

Contrast with the components that already do this correctly (`AddToTripButton`, `SiteNav`, `PreDepartureChecklist`, `SeasonStrip`, `VisaByNationality`, and now `ExploreGrid`) — the app has an established convention, it's just applied inconsistently.

## Data holes

**4 of 72 destinations still have no `events`:** `ecuador-galapagos`, `philippines-batanes`, `maldives-atolls`, `indonesia-komodo` (down from 39). `RegionPlanner.tsx` now shows a proper empty state for these rather than hiding the section, and `FestivalsView` degrades cleanly (they simply contribute no rows). Low priority — mostly nature/wildlife destinations where "when to go" is genuinely driven by season, not festivals.

## Improvement opportunities

- `src/data/sight-summary.json` is a manually-regenerated snapshot (`node scripts/build-sight-summary.mjs`, per its own header comment) of `src/data/sights.ts`, with nothing enforcing it stays in sync — verified it's currently in sync, but a future edit to `sights.ts` without re-running the script would silently drift `sightCount`/`sightTypes` shown in slim views. Worth a `pretest`/CI check that re-runs the script and diffs.
- Given the fix pattern above recurring twice in one cycle (unhandled Supabase rejections, missing `aria-pressed`), consider a small shared helper/lint rule rather than re-discovering each instance one component at a time — e.g. a `useSupabaseCall` hook that always catches, or a `<TogglePill aria-pressed>` component the toggle-button groups share instead of each hand-rolling the button markup.

## Healthy / no action

- `npx tsc --noEmit`: 0 errors.
- `npx vitest run`: 45/45 tests passing across 8 files (48→45 is the expected drop from removing `suggestTravelDates`'s 3 tests, not a regression).
- `npx next build`: compiles cleanly, 94 static pages, no warnings.
- Data integrity (scripted check across all 72 regions): no duplicate ids, all 12 climate months present, all ≥2 sights (no empty sight blurbs), valid non-zero lat/lng, an existing `public/photos/` file for every region (72 files, 72 `photos.json` entries, 1:1, no orphans, no shared paths), a `wiki-titles.json` entry, a `toolkits.ts` entry, a `dailyBudget`, a complete `info` block, and a non-empty `climateBlurb` for all 72.
- `VISA_RULES` in `src/lib/visa.ts` covers all 35 distinct countries in the dataset with zero gaps and zero orphans.
- No orphaned `toolkits.ts`/`wiki-titles.json`/`photos.json` keys.
- Client bundle hygiene is now genuinely correct (see "Changed since last report") — no client component reaches heavy sights/toolkit/events data, verified against the actual build output, not just the import graph.
- `regions-slim.ts` keeps `climateBlurb`/`info`/`dailyBudget` while structurally stripping `sights`/`toolkit`/`events`.
- No `TODO`/`FIXME`/`XXX` markers anywhere in `src/`; no other stale/contradictory comments found.
- `src/lib/visa.ts` and `src/data/regions-core.ts` spot-checked for month/season logic errors (Patagonia, Galápagos, Rio, Sydney, Cape Town, Nepal, Japan) — none found.
- API routes (`/api/weather`, `/api/climate`, `/api/fx`, `/api/tripadvisor`) all handle failures cleanly (try/catch or safe fallback).
- Every `getSupabase()` call site correctly `await`s the now-async client (no leftover synchronous callers from the lazy-load change).

## Verification notes
Ran `npx tsc --noEmit`, `npx vitest run`, and `npx next build` in a disposable git worktree checked out at `origin/main`; data-integrity checks used a throwaway `npx tsx` script importing `src/data/regions.ts` (deleted before this report was written — no source files were modified). Bundle-content claims were verified by grepping the actual `.next/static/chunks/*.js` output, not just the source import graph.
