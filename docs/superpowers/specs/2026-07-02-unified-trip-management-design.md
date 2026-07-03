# Unified Trip Management — Design Spec

**Date:** 2026-07-02
**Status:** Approved (brainstorm complete, pending implementation plan)
**Origin:** User report — "everything is scattered," "no place to manage a trip A→Z," and "nothing is saved / sign-in does nothing across devices."

## Problem

The app's trip features are split across five pages with no through-line, and several
actions live on exactly one page:

| Action | Only available on |
|---|---|
| Add a destination | Explore grid, region page, planner |
| Edit order / duration | Planner only |
| Pre-departure checklist | Today only |
| Rename a trip | Calendar only |
| Invite a co-editor | Planner only |
| Share a link | Planner only |
| Save / delete | Planner + Calendar |

Two parallel localStorage stores (an anonymous **draft** and named **saved trips**)
underpin this, so "which trip am I on?" is never clear, and the two header badges even
disagree — the draft badge links to `/calendar`, the saved-trips badge to `/planner`.

Separately, cloud sync silently fails: `upsertRemoteTrip` logs a `console.warn` on
failure and `fetchRemoteTrips` returns `[]` on error, so a missing `trips` table or RLS
policy looks identical to "no trips" — the user sees sign-in appear to do nothing.

## Goals

1. One place to build and manage a trip from discovery to departure.
2. Remove the draft/saved duality — trips are first-class named entities.
3. Stop swallowing sync errors; make failures visible and fixable.

## Non-goals

- No color/palette picker (considered, rejected — keeps the orange accent + light/dark).
- No change to season data colors (dry/shoulder/wet carry meaning).
- No change to the region detail page's content (it stays the deep reference).
- Not redesigning the discovery tools (When to go, Compare, Festivals, Surprise, For me)
  — only their relationship to trips.

---

## 1. Data model

### 1.1 Kill the draft; trips are first-class

Every trip is a named, persistent entity from creation. There is always an **active
trip** (the one being edited). "Add to trip" always targets the active trip.

**Retired:**
- `seasons-draft` (the anonymous working state)
- `src/lib/trip-draft.ts`, `DRAFT_EVENT`, the draft concept entirely

**Replaced with:**
- `seasons-saved-trips` — unchanged shape, now *the* single trip store
- `seasons-active-trip-id` — **new**, single global key pointing to the active trip.
  Correctly global (like `theme`, `seasons-onboarded`), never per-entity.

### 1.2 Re-key the checklist per trip

The pre-departure checklist is currently keyed by sorted region-id set
(`seasons-checklist:<sorted-regionIds>`). Re-key to **`seasons-checklist:<tripId>`** so
the checklist belongs to a trip, not a destination fingerprint. This both fits the new
trip-centric model and closes a latent isolation bug (two trips with the same stop set
currently share checklist state).

### 1.3 Active-trip contract

- `getActiveTripId()` → returns the id, or null.
- `setActiveTripId(id)` → writes the key, dispatches `ACTIVE_TRIP_EVENT`.
- On any trip open/edit, the active id is set. New users start with one auto-created
  "Untitled trip" as their active trip, so there is always a valid target for "Add to
  trip."
- The `/debug-sync` diagnostic page already on `main` stays as the ops tool.

### 1.4 Migration (one-time, for existing users)

On first load under the new code:
- The existing `seasons-draft` (if any) is promoted into a saved trip named
  "Untitled trip" and prepended to `seasons-saved-trips`.
- `seasons-active-trip-id` is set to the most-recently-edited saved trip (or the
  migrated draft trip if no saved trips exist).
- `seasons-draft` is then deleted.
- Migration is idempotent: a `seasons-migrated-v2` flag prevents re-running.

---

## 2. Routes & navigation

### 2.1 Route map

| Route | Status | Purpose |
|---|---|---|
| `/` | unchanged | Explore (destination grid + map) |
| `/trips` | **new** | Home base — list of all trips as cards |
| `/trips/[id]` | **new** | The unified trip page (long scroll + sticky section nav) |
| `/planner` | **retired** | Redirects to `/trips/<active-trip-id>` |
| `/today` | **retired** | Redirects to `/trips/<active-trip-id>` |
| `/calendar` | adapted | Global cross-trip year-grid; click a row → `/trips/[id]` |
| `/regions/[id]` | adapted | "Add to trip" now jumps into the trip page with that destination staged |
| `/compare`, `/when-to-go`, `/festivals`, `/surprise`, `/where-can-i-go` | unchanged | Discovery tools (read-only; some carry AddToTripButton) |
| `/trip/[token]` | unchanged | Public read-only shared-trip view |
| `/debug-sync` | unchanged | Cloud-sync diagnostic (ops tool) |

### 2.2 Navigation

**Primary:** `Explore` (/) · `My trips` (/trips, with the 🧳 badge = total trip count)
**Secondary (discovery):** When to go · Compare · Festivals · Surprise · For me · Calendar

The two old badge chips (🧳 draft count → calendar, 🔖 saved count → planner) are replaced
by a single 🧳 badge = total trips, linking to `/trips`.

---

## 3. `/trips` — the home base

Grid of trip cards. Each card:
- Gradient thumbnail (derived from the trip's first destination)
- Name · flags + stop count · start month + duration
- Mini season timeline (same dry/shoulder colors as the rest of the app)
- Date range · last-edited time
- The active trip is tagged `Active`

Interactions:
- Click a card → `/trips/[id]`.
- `+ New trip` card → creates a fresh "Untitled trip", sets it active, opens its page.
- Card menu (⋯): rename, duplicate, delete.

The 🧳 header badge links here; the trip page's `← Trips` back-link returns here.

---

## 4. `/trips/[id]` — the unified trip page

Long scroll with a **sticky section nav**. The sticky bar has two rows:

- **Row 1 (always visible):** `← Trips` back-link · trip name · `Saved ✓` indicator ·
  Rename · Share · ⋯ (delete, invite, duplicate)
- **Row 2 (section jumps):** `Route` · `Stops` · `Prep` (with pending-count badge) ·
  `Map`. The current section underlines on scroll; click to jump.

### 4.1 Route section
One-glance summary: stops in order (chips with flags + duration), the season timeline
bar across the trip's months, total duration, start month, and a "every stop in
dry/shoulder ✓" fit indicator.

### 4.2 Stops section
Accordion per stop.
- **Collapsed:** number · name · flag · duration · season fit
- **Expanded:** compact summary inline — visa status, one-line climate, daily cost, top
  3–4 sights, packing essentials count — plus a **"Full guide →"** deep link to
  `/regions/[id]` (which keeps the climate chart, live weather, full packing list, all
  sights, currency converter, phrases, etc.).
- Inline controls: drag-to-reorder, duration selector (1–3 mo), remove (✕).

The split rationale: putting the *entire* region page inline would make a 6-stop trip a
~10,000px wall. The inline summary answers planning-time questions (visa? weather? worth
it?) without a page-hop; the deep link handles the rest.

### 4.3 Prep section
The trip-scoped pre-departure checklist, inline (re-keyed per trip per §1.2). Section
nav badge shows the pending count. Items grouped by category (documents, health,
bookings, gear). This is the checklist currently rendered only on `/today`.

### 4.4 Map section
The big Leaflet map (stops plotted, route line) + the per-trip year timeline. The
global cross-trip view remains on `/calendar`.

### 4.5 Add-to-trip entry
Per decision #2, "Add to trip" from Explore / a region page / a discovery tool jumps the
user **into this trip page** with the destination staged for confirmation, rather than
silently appending to invisible state. The user always lands on the trip they're
building.

---

## 5. Cloud sync (fixing the silent-failure bug)

The sync plumbing is already correct and wired (gated on `user`, merge on sign-in). The
fix is **visibility**:

- `upsertRemoteTrip` and `fetchRemoteTrips` currently swallow errors
  (`console.warn` / `return []`). Surface them: a **sync-status indicator** in the trip
  page sticky bar — `Saved ✓` (local + cloud), `Saved locally · sync failed` (with a link
  to `/debug-sync`), or `Synced` (cloud confirmed).
- The sign-in merge effect moves from `TripPlanner` into the trip page and runs on
  `user` change, pulling remote trips and pushing local-only ones (unchanged logic).
- A failed read/write no longer looks like "nothing saved" — the user sees the real
  state and a path to diagnose. The most common cause (missing `trips` table / RLS,
  i.e. `supabase/schema.sql` not run) shows up clearly in `/debug-sync`.

Theming and account/sign-in UI are otherwise unchanged.

---

## 6. Files affected

### New
- `src/app/trips/page.tsx` — `/trips` home base
- `src/app/trips/[id]/page.tsx` — unified trip page (server shell)
- `src/components/TripView.tsx` — the client long-scroll trip surface (sections + sticky nav)
- `src/components/TripCard.tsx` — card for the home base
- `src/components/StopsSection.tsx`, `PrepSection.tsx`, `RouteSection.tsx`,
  `MapSection.tsx` — the four trip-page sections
- `src/lib/active-trip.ts` — `getActiveTripId` / `setActiveTripId` + `ACTIVE_TRIP_EVENT`

### Retired / removed
- `src/lib/trip-draft.ts` and all callers
- `src/components/TripPlanner.tsx` (folded into `TripView` + sections)
- `src/components/TodayView.tsx` (status block → Route section; checklist → Prep section)
- The `/planner` and `/today` route directories (replaced by redirects)

### Adapted
- `src/lib/saved-trips.ts` — becomes the single trip store; gains the active-id helpers
- `src/lib/checklist.ts` — re-keyed per trip id
- `src/components/CalendarView.tsx` — becomes the global cross-trip view; rows link to
  `/trips/[id]`
- `src/components/PreDepartureChecklist.tsx` — rendered inside the Prep section
- `src/components/AddToTripButton.tsx` — now navigates to the active trip page with the
  destination staged
- `src/components/SiteNav.tsx` — restructured nav + single 🧳 badge
- `src/app/regions/[id]/page.tsx` — AddToTripButton behavior updated

### Touched
- `src/lib/supabase/trips.ts` — surface (not swallow) sync errors
- Tests in `test/` covering checklist re-keying, active-trip pointer, migration, sync
  error visibility (per CLAUDE.md "every fixed bug leaves a regression test")

---

## 7. Open implementation questions (to resolve in the plan)

1. **Active-trip persistence across devices:** should `seasons-active-trip-id` be a
   client-only pointer, or also mirrored to the cloud (so the active trip follows a
   signed-in user)? Recommend client-only for v1 — it's a UI pointer, not trip data.
2. **Drag-to-reorder library:** the app has no DnD dependency today. Evaluate a minimal
   option (e.g. `@dnd-kit/core`) vs. up/down-arrow buttons. Affects bundle size on the
   trip page (already heavy with Leaflet).
3. **URL shape for "staged add":** when AddToTripButton jumps to the trip page, how is
   the staged destination encoded? Recommend `/trips/[id]?add=<regionId>` and the page
   shows a confirm prompt.
4. **Shared-trip deep link:** `/trip/[token]` currently deep-links to `/planner?…`;
   update to `/trips/[id]?…` or to the viewer's active trip.

---

## 8. Out of scope / explicitly deferred

- Color/palette picker (rejected during brainstorm).
- Redesigning the discovery tools or the region detail page content.
- Offline-first sync conflict resolution beyond the existing last-write-wins merge.
- The Supabase `get_user_emails` RPC migration from the prior QA pass — still pending the
  operator running it; independent of this work.
