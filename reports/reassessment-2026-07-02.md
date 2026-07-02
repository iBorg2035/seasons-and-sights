# Reassessment — 2026-07-02

**Summary:** The "unified trips redesign" (retiring `/planner`, `/today`, and the anonymous draft in favor of one `/trips/[id]` page) merged clean — checklist isolation, storage scoping, data integrity, bundle hygiene, and most of the `aria-pressed` gaps from the last two reports are all genuinely correct or improved — but the two unhandled-Supabase-rejection sites flagged on 2026-07-01 are still unfixed, a fresh sibling of that same bug pattern was introduced in the very code that fixed it elsewhere, and `docs/QA-JOURNEYS.md` now describes a UI (dual nav badges, `/today`, "the draft") that no longer exists.

Assessed against `origin/main@9fdbda9` (24 commits ahead of the `9eafbd3` baseline the last report reviewed), in a disposable worktree.

## Changed since last report

- **Major:** `/planner` and `/today` are now thin client redirects to the active trip (`src/app/planner/page.tsx`, `src/app/today/page.tsx`, both via `ensureActiveTripId()`); the real UI is the new `/trips` (list) and `/trips/[id]` (`src/components/TripView.tsx` + `RouteSection`/`StopsSection`/`PrepSection`/`MapSection`) — one page with Route/Stops/Prep/Map instead of separate planner/today/checklist surfaces. The anonymous "draft" is retired; `src/lib/trip-migrate.ts` does a one-time, idempotent, flag-gated migration of any leftover `seasons-draft` into a real named trip.
- **Fixed (systemic, not a patch):** `upsertRemoteTrip` (`src/lib/supabase/trips.ts:46-68`) now checks the Supabase `error` and calls `recordSyncResult(...)`, surfaced live via `SyncBadge` — this is the same failure class the 07-01 report flagged as fire-and-forget, fixed at the root this time rather than patched at one call site.
- **Fixed:** the `aria-pressed` gap is closed on 4 of the 5 previously-flagged components — `CompareView.tsx:64,94`, `WhenToGoView.tsx:48`, `SurpriseView.tsx:62,82`, `FestivalsView.tsx:32,48` all now set it. `TripPlanner.tsx` (the 5th) no longer exists — its pill UI was replaced by `StopsSection.tsx`, whose new duration pills (`:166`) correctly ship with `aria-pressed` from day one, and `RegionPlanner.tsx`'s old month-pill row was replaced by a plain event-jump link (not a toggle, so N/A).
- **Reinforced:** per-trip checklist scoping (`checklistStorageKey(tripId)`) survived the rewrite intact — `PreDepartureChecklist` still keys strictly on `tripId` (`src/components/PreDepartureChecklist.tsx:17`), and `PrepSection`'s `key={regionIds.join("|")}` on the same element (`src/components/PrepSection.tsx:39,47`) does not undermine that, since the checklist's own internal reload effect depends on `storageKey`, not the parent's `key`. Two identical-destination trips still stay isolated. Test coverage grew alongside it: 45→69 tests (13 files, +`active-trip`, `saved-trips`, `trip-migrate`, `sync-status`, `components`).
- **Unchanged:** data integrity (all 72 destinations, all checks), `VISA_RULES` coverage (35/35 countries), and the 4/72 destinations still missing events (`ecuador-galapagos`, `philippines-batanes`, `maldives-atolls`, `indonesia-komodo`) — no data edits landed this cycle.

## Confirmed bugs

### 1. (New, medium impact) `deleteRemoteTrip` silently swallows failures — its own sibling function in the same file was just fixed for this exact gap
`src/lib/supabase/trips.ts:71-74`:
```ts
export async function deleteRemoteTrip(id: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("trips").delete().eq("id", id);
}
```
The `{ error }` from `.delete()` is never captured, unlike `upsertRemoteTrip` four lines above it (`:46-68`), which now checks `error` and calls `recordSyncResult(...)`. Both call sites treat it as fire-and-forget: `TripView.tsx:206` (`if (user) void deleteRemoteTrip(trip.id);`) and `CalendarView.tsx:147`, both *after* the local trip is already removed via `deleteSavedTrip`. If the remote delete fails (RLS hiccup, network blip, expired session), nothing surfaces it — no `SyncBadge` state, no console warning, nothing.

**Consequence:** the trip row still exists server-side. The next time `TripView`'s sign-in-sync effect runs (`TripView.tsx:102-132`, `fetchRemoteTrips()` → `mergeTrips(local, remote)`), `mergeTrips` has no tombstone concept — it merges by "present in remote list" — so the trip the user explicitly deleted reappears in their trip list. This is exactly the "failed delete/upsert silently desyncs local vs. cloud state" failure mode the 07-01 report called out, now reproduced as a fresh instance in the one function that wasn't touched when its sibling got fixed.

### 2. (Carried over, unfixed) The two Supabase-rejection sites flagged on 2026-07-01 are still unfixed
- `src/components/SharedTripView.tsx:34` — `fetchSharedTrip(token).then((t) => setState(t ?? "missing"))`, still no `.catch()`. A rejected fetch leaves `state` at `"loading"` forever (infinite skeleton, no error shown).
- `src/components/InviteEditorDialog.tsx:28` (mount effect) and `:58` (post-invite refresh) — both `listEditors(tripId, ownerId).then(setEditors)` calls, still no `.catch()`.

Notably, the fix pattern needed here (add `.catch()`, or route through `recordSyncResult` the way `upsertRemoteTrip` now does) was demonstrated twice more this cycle (auth-context previously, `upsertRemoteTrip` now) without these two sites being swept up.

### 3. (Doc rot) `docs/QA-JOURNEYS.md` describes UI the redesign removed
Journeys 1, 3, 4, 5, and 7 reference `/today`, `/planner`'s "Saved trips" section, "the draft," and — most importantly — **two separate nav badges** ("🧳 (current trip) → Today," "🔖 (saved trips) → Planner"). None of this exists anymore: `SiteNav.tsx` now ships a single `🧳 <count>` badge linking to `/trips` (`src/components/SiteNav.tsx:25-47`), `/today` and `/planner` are redirect stubs, and there is no draft. Journey 2 ("Multi-trip isolation") is still the right test in spirit but tells testers to check ticks "on `/today`" — that page no longer shows a checklist directly, it redirects to `/trips/[id]`'s Prep section. Since this file is the one CLAUDE.md and this task point reviewers at for pre-ship manual QA, a tester following it literally will be testing against a UI that no longer ships.

## Data holes

No change from 2026-07-01: **4 of 72 destinations still have no `events`** (`ecuador-galapagos`, `philippines-batanes`, `maldives-atolls`, `indonesia-komodo`). Same low-priority nature/wildlife-destination pattern as before; `RegionPlanner`/`FestivalsView` still degrade cleanly for these.

## Improvement opportunities

- `src/components/TripView.tsx` is mounted without `key={tripId}` (`src/app/trips/[id]/page.tsx:17`). Every current in-app path between two different trip pages passes through the `/trips` list route first (a full route/component unmount), so this isn't reachable today — but child state isn't trip-aware: `StopsSection`'s `openIdx` accordion state (`src/components/StopsSection.tsx:26`) and the scroll-spy `IntersectionObserver`'s captured section list (`TripView.tsx:142-167`) would carry over stale if a future "quick switch trip" link is added directly between two `/trips/[id]` URLs. Cheap to harden now (`key={tripId}` on `<TripView>`) before that shortcut gets built and this becomes a real instance of the isolation-bug class the codebase has hit twice already.
- Two review cycles in a row have found the *same* "fixed once, recurs at a sibling call site" shape (unhandled-rejection pattern in 07-01; now `upsertRemoteTrip`-vs-`deleteRemoteTrip` in 07-02). Worth a small shared wrapper in `src/lib/supabase/trips.ts` (e.g. a `withSyncResult(promise, kind)` helper all four remote calls funnel through) so the error-surfacing behavior can't be added to one function and skipped on its neighbor.
- Update `docs/QA-JOURNEYS.md` for the unified-trips architecture (single badge, `/trips/[id]` sections instead of `/today`+`/planner`, no draft) — otherwise it actively misdirects the next manual QA pass.

## Healthy / no action

- `npx tsc --noEmit`: 0 errors.
- `npx vitest run`: 69/69 tests passing across 13 files (up from 45/8 — net-new coverage for `active-trip`, `saved-trips`, `trip-migrate`, `sync-status`, and shared `components`, nothing removed).
- `npx next build`: compiles cleanly, 97 static/dynamic routes, no warnings.
- Data integrity (scripted check across all 72 regions, deleted before commit): no duplicate ids, all 12 climate months present for every region, all ≥2 sights, valid non-zero lat/lng, a `public/photos/` file for every region (72/72, no orphans), a `wiki-titles.json` entry, a `toolkits.ts` entry, a `dailyBudget`, and a complete `info` block for all 72. `VISA_RULES` (via `visaFor`) covers all 35 distinct countries with zero gaps.
- Client bundle hygiene: no `"use client"` component imports `@/data/regions`/`sights`/`toolkits`/`events` (checked every "use client" file's imports); verified against the actual `.next/static/chunks/*.js` output again — `Songkran`/`Sawatdee`/sight-blurb strings appear only in the `/festivals`+`/calendar`-specific chunk (367), never in the shared (`255`, `4bd1b696`) or `main-app` chunks.
- `regions-slim.ts` still strips `sights`/`toolkit`/`events` while keeping `climateBlurb`/`info`/`dailyBudget`/`sightCount`/`sightTypes`.
- Storage scoping (`grep -rhoE 'localStorage\.[a-z]+Item\([^,)]+' src`): every per-entity key is scoped correctly — `seasons-checklist:<tripId>` (per trip). All bare/global keys are legitimately global: `theme`, `seasons-onboarded`, `seasons-passport`, `seasons-draft` (write-once, migration-only now), `seasons-saved-trips`, `seasons-active-trip-id` (a pointer, not per-entity data), `seasons-migrated-v2`.
- Per-entity isolation manual trace: `createTrip`/`getTrip`/`updateTrip` (`src/lib/saved-trips.ts`) all operate strictly by id with no cross-trip bleed; `ensureActiveTripId`'s stale-pointer repair (`src/lib/active-trip.ts:31-45`) only repoints, never merges, trip data.
- `ShareTripButton`'s `publishShare` call is properly `await`ed inside `try/catch` (`src/components/ShareTripButton.tsx:21-36`) — no fire-and-forget gap there.
- No `TODO`/`FIXME`/`XXX` markers anywhere in `src/`.
- API routes (`/api/weather`, `/api/climate`, `/api/fx`, `/api/tripadvisor`) and their client callers (`WeatherNow`, `ClimateChart`, `CurrencyConverter`, `TripadvisorRating`) all still chain a `.catch()` and degrade to an empty/hidden state.

## Verification notes
Ran `npx tsc --noEmit`, `npx vitest run`, and `npx next build` in a disposable git worktree checked out at `origin/main` (removed afterward). Data-integrity checks used a throwaway `npx tsx` script placed inside that worktree (importing `src/data/regions.ts`, `src/lib/checklist.ts`'s sibling `visaFor`, `toolkits.ts`, `wiki-titles.json`, `photos.json`), deleted before this report was written — no source files were modified, and the worktree itself was removed via `git worktree remove`. Bundle-content claims re-verified by grepping the actual `.next/static/chunks/*.js` output and `.next/app-build-manifest.json`, not just the import graph.
