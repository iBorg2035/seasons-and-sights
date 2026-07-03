# QA journeys

Manual pre-ship checks for Seasons & Sights. Most bugs here have **not** been in
the code that changed — they hide at **state transitions** and **isolation
boundaries**, which per-feature "does it render?" testing never exercises. Run
the relevant journeys below before shipping, especially after touching trips,
the draft, the checklist, auth, or the nav badges.

## How to run

- Prefer a **production build** (`npm run build && npm start`), not `next dev` —
  Fast Refresh resets React state mid-test and hides prod-only bugs.
- **Hard-refresh** between builds (Cmd/Ctrl+Shift+R). Content-hashed chunks and
  CDN/browser caches will otherwise serve stale code and fake you out.
- To inspect state, read `localStorage` in DevTools: keys are `seasons-*`.

## Critical journeys

### 1. Create, edit, and come back to a trip
`/trips` → create a trip → add stops on `/trips/[id]` → reload. The trip and
its stops must survive, appear as a card on `/trips` and a bar on `/calendar`,
and reopen correctly. If signed in, it must also appear on a second
browser/device (cloud sync — `/debug-sync` diagnoses failures).

### 2. Multi-trip isolation ← the one that keeps biting us
Do a **per-trip** action on trip A, switch to trip B, and confirm B is
independent; switch back and confirm A persisted. Concretely:
- On trip A's page (Prep section), tick some **Before you go** checklist items.
- Open a *different* trip (B). B's checklist must be **clean**.
- Open A again. A's ticks must **still be there**.
Repeat the same "do X on A → switch to B → assert B clean → back → assert A
kept" shape for any state that is stored per trip (checklist, stops, name).

### 3. Blocked / full storage (private mode)
With `localStorage.setItem` throwing (private mode, blocked site data, full
quota), trip changes must fail honestly — no phantom trips or "Saved!" claims.

### 4. Nav badge + legacy redirects
- 🧳 (active trip) → **/trips**; count reflects the trips list and updates
  live on create/delete.
- Old URLs `/planner` and `/today` must redirect to the active trip page (or
  `/trips` when none) — including for a first-time visitor with legacy
  `seasons-draft` data, which must migrate into a trip exactly once
  (`seasons-migrated-v2` flag).

### 5. Festivals
A trip whose stop has an event that month shows it (trip page Prep + white
dots on `/calendar` bars); a trip with none shows no festival UI.

### 6. Signed-in vs anonymous
Both must persist locally. Signed-in additionally syncs trips to the account
(survives a different device); anonymous is local-only. Neither should hang on
load if the network/Supabase is unreachable.

### 7. Empty states
No trips → `/trips` and `/calendar` show a friendly "plan a trip" state; the
🧳 badge doesn't render; `/trips/<unknown-id>` shows "trip couldn't be found"
with a way back.

## Pre-ship static audit

- **Storage scoping:** grep every `localStorage` key. Any key holding
  *per-entity* state (per-trip, per-destination) **must** include the entity id.
  A bare global key for per-trip data is the checklist-isolation bug.
  `grep -rhoE 'localStorage\.[a-z]+Item\([^,)]+' src`
  Correctly-global keys: `theme`, `seasons-onboarded`, `seasons-passport`
  (per-device/user), `seasons-saved-trips`, `seasons-active-trip-id`,
  `seasons-migrated-v2` (single instances); `seasons-draft` is legacy, read
  only by the one-time migration.
- **Regression tests:** every fixed bug leaves a test behind (see
  `checklistStorageKey` tests for the isolation bug).
- `npx tsc --noEmit`, `npx vitest run`, `npm run build` all green.
- No `"use client"` component imports the heavy `@/data/regions` (use the slim
  modules); adding data to `regions.ts` shouldn't grow client routes.

## Review & QA norms

- **UI-state / multi-entity changes get a high-effort review.** Run
  `/code-review high` (or `ultra` for shared infra like trips/auth/checklist) —
  it reasons across files and catches latent bugs in code the diff didn't touch.
- **Test the transition, not the state.** Verify differentiation and isolation
  (A vs B, before/after a switch), not just "does each thing render."
- **Verify against a production build + hard refresh** before declaring done.
