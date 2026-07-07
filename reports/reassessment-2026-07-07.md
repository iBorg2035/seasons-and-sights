# Reassessment — 2026-07-07

**Summary:** A clean, no-new-features bug-fix cycle: all four issues carried over from 07-06 (the invite-enumeration side channel, the position-keyed stop-collapse bug, the stale OLED divider color, and the a11y role/aria-controls gaps) are now fixed correctly, each with a solid regression test, and nothing new was introduced in the process — `tsc`, `vitest`, and `next build` are all green and the codebase is fully caught up on every previously-tracked bug.

Assessed against `origin/main@b9f4d2f` (4 commits ahead of the `04b767d` baseline the 07-06 report reviewed), read via a disposable git worktree — nothing merged into `reassessment-reports` and no source files modified.

## Changed since last report

- **Fix: invite-list refresh leaking account existence** (`acde2c6`) — `InviteEditorDialog.tsx:53-60` no longer re-fetches `listEditors` after a successful (or failed) invite; the list only loads once, on dialog mount. This fully closes the side channel flagged 07-05/07-06 (an inviter could previously infer whether an email had an account by watching whether the "Current editors" list grew). Two new regression tests (`test/invite-editor-dialog.test.tsx`) assert `listEditors` is called exactly once regardless of invite outcome.
- **Fix: reordering stops collapsing the wrong destination** (`10dc6a6`) — `StopsSection.tsx`'s `collapsedIdx: Set<number>` (array position) is replaced with `collapsedIds: Set<string>` keyed on `region.id`. Closes the bug open since 07-04 (3 cycles). New regression test in `test/stops-section.test.tsx` collapses a stop, reorders it, and asserts the collapsed state followed the region id rather than staying at the old index.
- **Fix: stale `divide-slate-100` divider color** (`559e13b`) — `src/app/globals.css`'s `.dark .divide-slate-100 > *` rule updated from the old navy-black `#1f3540` to the pure-black-era `#1a242c`, matching every other border/ring color the OLED re-theme (`4ab2668`) updated. One-line fix, exactly as flagged 07-06.
- **Fix: missing ARIA roles/linkage in StopDetail/StopsSection** (`b9f4d2f`) — closes all three gaps open since 07-03 (4 cycles): `Skeleton` now has `role="status"`, the retry error banner has `role="alert"`, and each stop's toggle button now links to its panel via `id`/`aria-controls`/`aria-labelledby` (the standard disclosure-widget pattern). Two new regression tests plus an existing test updated to assert on `getByRole("alert")` instead of raw text.

All four fixes were read directly (`git show`) and verified correct — no partial fixes, no new side effects introduced. No feature work landed this cycle.

## Confirmed bugs

None. Every bug tracked as of 07-06 is now fixed and regression-tested.

## Data holes

No change from 07-01 through 07-06 (no data files touched this cycle): **4 of 72 destinations still have no `events`** (`ecuador-galapagos`, `philippines-batanes`, `maldives-atolls`, `indonesia-komodo`); 9 orphaned `ADVISORY` keys in `src/data/advisories.ts` (`Laos`, `South Korea`, `Taiwan`, `China`, `Argentina`, `Spain`, `Portugal`, `Croatia`, `Kenya`) with no matching region country. Every country present in `REGIONS` still resolves via `visaFor()`; no orphaned `wiki-titles.json`/`toolkits.ts` keys; no unreferenced files under `public/photos/`.

## Improvement opportunities

- **Minor dead field, still open (unchanged):** `TripHealthRegion.dailyBudget` (`src/lib/trip-health.ts:13`) remains declared but unused inside `assessTripHealth` — the cost/spend tracker (`season.ts`) uses a separate accessor. Low priority; either wire it in or remove it.
- **Minor, no test guard (unchanged):** `src/data/crowd-overrides.json` is a generated artifact with no CI check that it's regenerated after an `events.ts` edit. Still in sync today; low priority.
- **Still open (unchanged), `mergeTrips` tombstone gap** — `src/lib/supabase/trips.ts`: a trip deleted on one device while offline on another can be resurrected on next sync, since there's no tombstone/delete-marker in the merge logic. Untouched since first flagged 07-02.
- **The 4-destination events hole and 9 orphaned advisory keys** (Data holes above) remain the only open data-completeness items; both are low-effort content additions rather than bugs.

## Healthy / no action

- `npx tsc --noEmit`: 0 errors.
- `npx next build`: compiles cleanly, no warnings, all 98 routes/pages present (unchanged route set).
- `npx vitest run`: **128/128 pass** — 5 new tests this cycle (2 invite-dialog, 1 reorder-collapse, 2 a11y), all passing; no regressions.
- Client bundle hygiene: zero `"use client"` files import `@/data/regions`/`sights`/`events`/`toolkits` — all consume only `@/data/regions-slim`. `REGIONS_SLIM` still correctly ships `sights: []` and `toolkit`/`events: undefined` while keeping `climateBlurb`/`info` intact.
- Data integrity across all 72 destinations: no duplicate ids, all 12 months present, ≥2 sights each, non-zero lat/lng, resolvable photo file, `wiki-titles.json` entry, `toolkits.ts` entry, `dailyBudget`, `info` block. No orphaned photo files, no orphaned `wiki-titles.json`/`toolkits.ts` keys.
- **Storage scoping** (`grep -rhoE 'localStorage\.[a-z]+Item\([^,)]+' src`): every key is either correctly per-entity (`checklistStorageKey(tripId)`) or legitimately global (`theme`, `seasons-onboarded`, `seasons-passport`, `ACTIVE_TRIP_KEY`, `MIGRATED_FLAG`, `SAVED_TRIPS_KEY`, `seasons-draft`). No new keys this cycle.
- **Per-entity isolation:** checklist isolation regression test (`test/checklist.test.ts`) still passes; the newly-fixed stop-collapse state is now correctly keyed per-region-id, closing the last remaining position-keyed (non-entity-scoped) UI state bug in the trip view.
- **Remote-write error handling:** `upsertRemoteTrip`/`deleteRemoteTrip` (`src/lib/supabase/trips.ts`) both still correctly propagate failures via `reportSync` — the 07-02 fix holds; the only remaining `.catch(() => {})` sites (`ServiceWorkerRegister.tsx`, `TripadvisorRating.tsx`, `report-error.ts`) are legitimate best-effort/self-referential swallows, not silently-dropped write failures.

## Verification notes
Checked out `origin/main` (`b9f4d2f`) into a disposable `git worktree` (not merged into `reassessment-reports`), ran `npm install`, `npx tsc --noEmit`, `npx vitest run`, and `npx next build` there. Read all 4 new commits' diffs directly (`git show`) to verify each fix matches what was flagged in the 07-06 report — including checking the new regression tests actually exercise the failure mode (e.g. the stops-section reorder test explicitly moves a stop and asserts collapse state follows by id, not index). Wrote a throwaway `npx tsx` script inside the worktree importing `regions.ts`/`regions-slim.ts`/`toolkits.ts`/`wiki-titles.json`/`advisories.ts` plus `visaFor()` and a `fs.readdirSync` of `public/photos` to re-check data integrity, visa/advisory coverage, and orphaned/unreferenced files (deleted before removing the worktree, not committed). Grepped every `"use client"` file for heavy-data imports and every `localStorage.*Item(` call site for scoping. Re-checked `mergeTrips`/`upsertRemoteTrip`/`deleteRemoteTrip` and all `.catch(() => {})` sites since those were prior-cycle findings. The worktree and scratch script were removed after the audit; `git status` on `reassessment-reports` is clean apart from the two files committed with this report.
