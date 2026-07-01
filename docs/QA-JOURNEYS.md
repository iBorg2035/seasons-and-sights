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

### 1. Save and come back to a trip
Plan a trip → **Save trip** → reload the page. The trip must still be in
"Saved trips" (planner) and load back correctly. If signed in, it must also
appear on a second browser/device (cloud sync).

### 2. Multi-trip isolation ← the one that keeps biting us
Do a **per-trip** action on trip A, switch to trip B, and confirm B is
independent; switch back and confirm A persisted. Concretely:
- On `/today` with trip A, tick some **Before you go** checklist items.
- Load a *different* saved trip (B). B's checklist must be **clean**.
- Load A again. A's ticks must **still be there**.
Repeat the same "do X on A → switch to B → assert B clean → back → assert A
kept" shape for any state that is stored per trip.

### 3. Blocked / full storage (private mode)
With `localStorage.setItem` throwing (private mode, blocked site data, full
quota), saving must show an honest error and **not** claim "Saved!" or leave a
phantom saved-trip chip.

### 4. Nav badges
- 🧳 (current trip) → **Today** (its trip is the hero, not the planner picker).
- 🔖 (saved trips) → **Planner** (the Saved trips section).
- Counts update live: save → 🔖 +1; load a saved trip → 🧳 reflects its stops;
  delete → 🔖 −1.

### 5. Festivals on Today
A trip with a destination that has an event **this calendar month** shows a
"Festivals in <month>" card; a trip with none hides the card entirely.

### 6. Signed-in vs anonymous
Both must save locally. Signed-in additionally persists to the account (survives
a different device); anonymous is local-only. Neither should hang on load if the
network/Supabase is unreachable.

### 7. Empty states
No draft → `/today` shows "plan a trip" **and** any saved trips (so you can load
one). No saved trips → the badges/sections simply don't render.

## Pre-ship static audit

- **Storage scoping:** grep every `localStorage` key. Any key holding
  *per-entity* state (per-trip, per-destination) **must** include the entity id.
  A bare global key for per-trip data is the checklist-isolation bug.
  `grep -rhoE 'localStorage\.[a-z]+Item\([^,)]+' src`
  Correctly-global keys: `theme`, `seasons-onboarded`, `seasons-passport`
  (per-device/user), `seasons-draft`, `seasons-saved-trips` (single instances).
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
