# Reassessment — 2026-07-06

**Summary:** A big feature cycle (trip cost tracking, local time/in-stay festival highlights, Rome2Rio links, curated crowd overrides, per-trip travel interests) lands clean on isolation, storage-scoping, and bundle hygiene, and the long-open failing test is now fixed — but the pure-black OLED re-theme missed one CSS rule (`divide-slate-100`) leaving stale navy-tinted dividers, and three older bugs (position-keyed stop collapse, the invite-enumeration side channel, and the `role`/`aria-controls` a11y gaps) remain unfixed.

Assessed against `origin/main@04b767d` (7 commits ahead of the `9d73b15` baseline the 07-05 report reviewed), read via a disposable git worktree — nothing merged into `reassessment-reports` and no source files modified.

## Changed since last report

- **Fix: `stop-detail.test.tsx` failing test** (`311ac3c`) — the assertion now anchors on `"Very safe."` (with the trailing period) instead of a bare prefix, so it can't false-match `TravelEssentials`' longer sentence sharing the same words. `npx vitest run` is fully green again (123/123) after being red for two prior cycles (07-04, 07-05).
- **Re-theme: pure-black OLED dark mode** (`4ab2668`) — shifts `--background` from navy-black (`#0b1418`) to `#000000` and re-tunes card/border/hover shades (`bg-white`, `bg-slate-50`, `border-slate-*`, hovers, Leaflet background) to stay distinguishable against true black. See bug #2 below for a rule this pass missed.
- **Fix: unreadable teal/emerald/rose/violet badges in dark mode** (`04b767d`) — extends the existing amber/sky `-50`→retint treatment to `bg-emerald-50`, `bg-rose-50`, `bg-violet-50`, `bg-teal-50` (previously only their `-100` shades were covered), fixing near-invisible text on the trip-progress banner, budget line, festival highlight, and Trip Health warnings/strengths introduced this same cycle. Verified complete — no other `-50` badge class is left uncovered.
- **Feature: trip cost estimate + spend-so-far tracker** (`85e3892`) — `estimateTripCost`/`estimateSpendSoFar` (`src/lib/season.ts:322-362`) reuse the existing per-region `dailyBudget` and the planner's own date ranges; spend-so-far is explicitly prorated from the same total so the two numbers always reconcile (no second cost model). Well covered by 12 new `season.test.ts` cases.
- **Feature: local time, trip-day progress, in-stay festival highlights** (`496d808`) — `WeatherNow` now shows the destination's local clock time (via `Intl.DateTimeFormat` with a defensive `try/catch` on the IANA string), `RouteSection` shows "day N of M" for the currently-active leg, and `StopDetail` badges festivals that actually fall inside the stay's months. All three reuse already-fetched/computed data; no new client-bundle or storage surface.
- **Feature: Rome2Rio route-comparison link** (`5bc2006`) — `buildRome2RioUrl` (`src/lib/booking.ts`) adds a "Compare routes ↗" link next to the existing flight/overland estimate in `GettingThere.tsx`, opened with `target="_blank" rel="noopener noreferrer"`. Tested.
- **Feature: curated crowd overrides + per-trip travel interests** (`7bc2032`) — `scripts/build-crowd-overrides.mjs` derives festival months from `events.ts` into the committed `src/data/crowd-overrides.json` (verified in sync with current `events.ts` by re-running the script and diffing — no drift); `regions-core.ts:1518-1526` applies it correctly, only pushing a month to `"high"` and never clobbering an existing manual `crowd` override. Travelers can now pick sight-type "interests" (`trip.interests`, part of the per-trip object, mutated via `persistTripEdit(trip.id, …)` — correctly scoped, no cross-trip bleed) and `assessTripHealth` folds an `interestFit` metric into the score only when interests are set (backward-compatible for trips without the field).
- **Not fixed (2nd cycle running):** the `InviteEditorDialog` editor-list-refresh enumeration side channel from 07-05 (`src/components/InviteEditorDialog.tsx:43-63`) — untouched this cycle (no commits touch this file since `1faca84`).
- **Not fixed (5th cycle running):** `StopsSection.tsx:33`'s `collapsedIdx` is still a `Set<number>` of array positions, not `region.id` — reordering still silently collapses/expands the wrong stop.
- **Not fixed (4th cycle running):** the `role="status"`/`role="alert"`/`aria-controls` a11y gaps in `StopDetail`/`StopsSection` (`StopDetail.tsx:30-32` `Skeleton` has only `aria-label`, no `role="status"`; the retry banner still has no `role="alert"`; `StopsSection.tsx`'s expand toggle still has no `aria-controls`/`id` link to the panel it expands).

## Confirmed bugs

### 1. (Carried over, medium) Editor-invite email enumeration still leaks via the post-invite "Current editors" refresh
`src/components/InviteEditorDialog.tsx:43-63`. Unchanged from 07-05 — see that report for the full trace. `invite()` still re-fetches and re-renders `listEditors` immediately after every invite attempt, so the inviter can tell a real-account invite from a no-such-account one just by watching whether the list grows, defeating the enumeration-safe `invite_trip_editor_by_email` RPC this same feature introduced. Fix is still narrow: stop auto-refreshing the list right after an invite, or delay/batch it.

### 2. (New, low-medium) OLED re-theme missed `divide-slate-100`, leaving stale navy dividers on a pure-black background
`src/app/globals.css` (`.dark .divide-slate-100 > *`, currently line 117) vs. the `4ab2668` re-theme.

`4ab2668` moved the dark background from navy-black (`#0b1418`) to pure black (`#000000`) and updated the matching border/hover shades accordingly: `border-slate-200/100/300` and `ring-slate-200` both moved from the old `#1f3540` to the new `#1a242c`, and `bg-white`/`bg-slate-50`/hovers/Leaflet all got matching near-black updates. But `.dark .divide-slate-100 > *` (the divider rule used by `divide-y divide-slate-100` lists) was left at the old `#1f3540` — it's the one dark-mode border/hairline rule in the file that wasn't touched by the commit.

This is used by three components: `RouteSection.tsx`'s per-leg detail list, `SightsList.tsx`, and `RegionPlanner.tsx`. In dark mode, the horizontal rules between rows in these lists render a shade lighter/bluer (`#1f3540`) than every other border in the app (`#1a242c`), a small but visible inconsistency introduced by this cycle's own re-theme.

Fix: update `.dark .divide-slate-100 > *` to `#1a242c` to match `border-slate-200`/`ring-slate-200`.

### 3. (Carried over, medium) Reorder/collapse-state bug — 5th cycle open
`src/components/StopsSection.tsx:33`. `collapsedIdx` is still `Set<number>` keyed on array position; reordering stops (via the ▲/▼ buttons) still silently collapses/expands the wrong destination. No commits touched this logic this cycle (`StopsSection.tsx`'s one-line change in `496d808` only threaded `stayMonths` through, unrelated).

## Data holes

No change from 07-01 through 07-05 (no data files touched by content this cycle beyond the generated `crowd-overrides.json`, which is in sync): **4 of 72 destinations still have no `events`** (`ecuador-galapagos`, `philippines-batanes`, `maldives-atolls`, `indonesia-komodo`); 9 orphaned `ADVISORY` keys in `src/data/advisories.ts` (`Laos`, `South Korea`, `Taiwan`, `China`, `Argentina`, `Spain`, `Portugal`, `Croatia`, `Kenya`) with no matching region country. Every country present in `REGIONS` still resolves via `visaFor()`; no orphaned `wiki-titles.json`/`toolkits.ts` keys; no unreferenced files under `public/photos/`.

## Improvement opportunities

- **Fix the divide-slate-100 dark-mode color** (#2 above) — one-line CSS fix, small visual polish.
- **Fix the invite-enumeration side channel** (#1 above, 2 cycles open).
- **Fix the reorder/collapse-state bug** (`StopsSection.tsx:33`, 5 cycles open) by keying `collapsedIdx` off `region.id` (`Set<string>`).
- **Still open, 4 cycles running:** the `role="status"`/`role="alert"`/`aria-controls` gaps in `StopDetail`/`StopsSection`.
- **Minor dead field, still open:** `TripHealthRegion.dailyBudget` (`src/lib/trip-health.ts:13`) remains declared but unused inside `assessTripHealth`. Notably this cycle *did* add a real, working `dailyBudget`-driven feature (the cost/spend tracker in `season.ts`), just via a separate, parallel accessor rather than this typed field — reinforcing that the field is vestigial and should be wired in (e.g. into the "prep" score) or removed.
- **Minor, no test guard:** `src/data/crowd-overrides.json` is a generated artifact (from `scripts/build-crowd-overrides.mjs` reading `events.ts`) with no CI/test check that it's actually regenerated after an `events.ts` edit — it happens to be in sync today (verified by re-running the script and diffing), but nothing would catch drift if a future edit to `events.ts` forgets the regeneration step. Low priority; a small test comparing the committed JSON to a fresh run of the script would close the gap.
- The `mergeTrips` tombstone gap (flagged 07-02 through 07-05, `src/lib/supabase/trips.ts`) is still open and untouched this cycle.

## Healthy / no action

- `npx tsc --noEmit`: 0 errors.
- `npx next build`: compiles cleanly, no warnings, all 98 routes/pages present (unchanged route set).
- `npx vitest run`: **123/123 pass** — the previously-failing `stop-detail.test.tsx` case is now fixed (see above); no new failures despite 6 feature commits and ~27 new test cases this cycle.
- Client bundle hygiene: zero of 49 `"use client"` files import `@/data/regions`/`sights`/`events`/`toolkits`, including the new cost-tracker/local-time/crowd-override/interests code paths — all consume only `@/data/regions-slim` (`SlimRegion`) and `@/lib/season`/`@/lib/trip-health`.
- `REGIONS_SLIM` still correctly ships `sights: []` and `toolkit`/`events: undefined` while keeping `climateBlurb`/`info` intact (`regions-slim.ts:26-33`).
- Data integrity across all 72 destinations: no duplicate ids, all 12 months present, ≥2 sights, non-zero lat/lng, resolvable photo file, `wiki-titles.json` entry, `toolkits.ts` entry, `dailyBudget`, `info` block. No orphaned photo files, no orphaned `wiki-titles.json`/`toolkits.ts` keys.
- **Curated crowd overrides applied correctly:** `regions-core.ts:1518-1526`'s loop only sets `crowd = "high"` where a month has no pre-existing manual override and never downgrades — verified both by reading the loop and by the passing `season.test.ts` cases that check a wet-season festival month still reads `"high"` while a manually-curated override (Rio's Réveillon) survives untouched.
- **Storage scoping** (`grep -rhoE 'localStorage\.[a-z]+Item\([^,)]+' src`): every key is either correctly per-entity (`checklistStorageKey(tripId)`) or legitimately global (`theme`, `seasons-onboarded`/`ACTIVE_TRIP_KEY`/`MIGRATED_FLAG`/`SAVED_TRIPS_KEY`/`seasons-draft` family). No new keys this cycle; the new `interests` field lives inside the existing per-trip object, not a separate storage key.
- **Per-entity isolation:** the new `trip.interests` toggle (`RouteSection` → `TripView.tsx:439-443`) mutates via `persistTripEdit(trip.id, …)`, scoped to the specific trip like every other per-trip field; no bleed across saved trips. `checklistStorageKey` regression test still passes.
- Rome2Rio and other new external links use `target="_blank" rel="noopener noreferrer"` correctly.

## Verification notes
Checked out `origin/main` (`04b767d`) into a disposable `git worktree` (not merged into `reassessment-reports`), ran `npm install`, `npx tsc --noEmit`, `npx vitest run`, and `npx next build` there. Wrote a throwaway `npx tsx` script inside the worktree importing `regions.ts`/`regions-slim.ts`/`toolkits.ts`/`wiki-titles.json`/`advisories.ts` plus `visaFor()` and a `fs.readdirSync` of `public/photos` to re-check data integrity, visa/advisory coverage, and orphaned/unreferenced files (deleted before removing the worktree, not committed). Re-ran `scripts/build-crowd-overrides.mjs` against current `events.ts` and diffed against the committed `crowd-overrides.json` to confirm no drift. Grepped every `"use client"` file for heavy-data imports and every `localStorage.*Item(` call site for scoping. Read all 7 new commits' diffs directly (`git show`) rather than relying on file listings, which is how the stale `divide-slate-100` rule (bug #2) was found — it wasn't in any commit's diff, which is exactly the point (a rule the re-theme commit should have touched but didn't). The worktree and scratch script were removed after the audit; `git status` on `reassessment-reports` is clean apart from the two files committed with this report.
