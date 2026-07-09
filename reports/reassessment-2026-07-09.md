# Reassessment — 2026-07-09

**Summary:** No changes on `main` since the 07-08 report — `origin/main` is still exactly `b9f4d2f`, zero new commits — so this cycle is again a pure re-verification pass: all health checks (`tsc`, `vitest`, `next build`), data integrity, bundle hygiene, storage scoping, and per-entity isolation were re-run from scratch in a disposable worktree and every result is identical to 07-08/07-07. No bugs, no new holes. This is the last scheduled run in the review window (2026-06-30 – 2026-07-09).

Assessed against `origin/main@b9f4d2f` (same commit the 07-07/07-08 reports reviewed), read via a disposable git worktree — nothing merged into `reassessment-reports` and no source files modified.

## Changed since last report

Nothing. `git log b9f4d2f..origin/main` is empty — no commits have landed since the 07-08 audit. This report exists to confirm the codebase hasn't silently drifted (dependency updates, environment changes, flaky tests) rather than to review new code.

## Confirmed bugs

None.

## Data holes

Unchanged from 07-01 through 07-08 (no data files touched): **4 of 72 destinations still have no `events`** (`ecuador-galapagos`, `philippines-batanes`, `maldives-atolls`, `indonesia-komodo`); 9 orphaned `ADVISORY` keys in `src/data/advisories.ts` (`Laos`, `South Korea`, `Taiwan`, `China`, `Argentina`, `Spain`, `Portugal`, `Croatia`, `Kenya`) with no matching region country. Every country present in `REGIONS` still resolves via `visaFor()`; no orphaned `wiki-titles.json`/`toolkits.ts` keys; no unreferenced files under `public/photos/`.

## Improvement opportunities

- **Minor dead field, still open (unchanged):** `TripHealthRegion.dailyBudget` (`src/lib/trip-health.ts:13`) remains declared but unused inside `assessTripHealth`. Low priority.
- **Minor, no test guard (unchanged):** `src/data/crowd-overrides.json` is a generated artifact with no CI check that it's regenerated after an `events.ts` edit. Still in sync today; low priority.
- **Still open (unchanged), `mergeTrips` tombstone gap** — `src/lib/supabase/trips.ts`: a trip deleted on one device while offline on another can be resurrected on next sync (no tombstone/delete-marker in the merge logic). Untouched since first flagged 07-02.
- **The 4-destination events hole and 9 orphaned advisory keys** remain the only open data-completeness items; both are low-effort content additions rather than bugs.
- No new opportunities identified this cycle — nothing changed to surface any.

## Healthy / no action

- `npx tsc --noEmit`: 0 errors.
- `npx next build`: compiles cleanly, no warnings, all 98 routes/pages present (unchanged route set).
- `npx vitest run`: **128/128 pass**, no regressions, no flakiness observed on re-run.
- Client bundle hygiene: zero `"use client"` files import `@/data/regions`/`sights`/`events`/`toolkits` — all consume only `@/data/regions-slim`. `REGIONS_SLIM` still correctly ships `sights: []` and `toolkit`/`events: undefined` while keeping `climateBlurb`/`info` intact.
- Data integrity across all 72 destinations: no duplicate ids, all 12 months present, ≥2 sights each, non-zero lat/lng, resolvable photo file, `wiki-titles.json` entry, `toolkits.ts` entry, `dailyBudget`, `info` block. No orphaned photo files, no orphaned `wiki-titles.json`/`toolkits.ts` keys.
- **Storage scoping** (`grep -rhoE 'localStorage\.[a-z]+Item\([^,)]+' src`): every key is either correctly per-entity (`checklistStorageKey(tripId)`) or legitimately global (`theme`, `seasons-onboarded`, `seasons-passport`, `ACTIVE_TRIP_KEY`, `MIGRATED_FLAG`, `SAVED_TRIPS_KEY`, `seasons-draft`). No new keys.
- **Per-entity isolation:** `test/checklist.test.ts` and `test/stops-section.test.tsx` (the position-vs-id-keyed collapse-state regression test) both still pass — no isolation bleed introduced.
- **Remote-write error handling:** `upsertRemoteTrip`/`deleteRemoteTrip` (`src/lib/supabase/trips.ts`) both still correctly propagate failures via `reportSync`; the only remaining `.catch(() => {})` sites (`ServiceWorkerRegister.tsx`, `TripadvisorRating.tsx`, `report-error.ts`) are legitimate best-effort/self-referential swallows, unchanged from prior cycles.

## Verification notes

`origin/main` is unchanged at `b9f4d2f` since the 07-08 audit — no new commits to diff-review. To rule out silent drift, the full check suite was re-run from a clean disposable `git worktree` off `origin/main`: fresh `npm install`, `npx tsc --noEmit`, `npx vitest run`, `npx next build`. A throwaway `npx tsx` script (placed inside the worktree so relative imports resolved, then deleted before worktree removal) imported `regions.ts`/`regions-slim.ts`/`toolkits.ts`/`wiki-titles.json` plus `visaFor()` and did an `fs.readdirSync` of `public/photos` to re-check data integrity, visa coverage, and orphaned/unreferenced files; `advisories.ts` orphan keys were re-checked with a small inline Node script. Re-grepped every `"use client"` file for heavy-data imports and every `localStorage.*Item(` call site for scoping, and re-ran the two isolation-critical regression tests (`checklist.test.ts`, `stops-section.test.tsx`) directly. All results are bit-for-bit consistent with the 07-08 report. The worktree and scratch script were removed after the audit; `git status` on `reassessment-reports` is clean apart from the two files committed with this report.

## Note on run window

This is the 10th and final scheduled run in the 2026-06-30 → 2026-07-09 window configured for this routine. No further daily reassessments will run unless the user re-enables/extends the schedule.
