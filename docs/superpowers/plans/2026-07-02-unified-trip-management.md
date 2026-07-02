# Unified Trip Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scattered planner/today/calendar + anonymous-draft model with a single unified trip page (`/trips/[id]`) and a trips home base (`/trips`), making every trip a first-class named entity and surfacing silent cloud-sync failures.

**Architecture:** Retire the `seasons-draft` localStorage store in favor of an `seasons-active-trip-id` pointer over the existing `seasons-saved-trips` list. Build a new long-scroll trip page (Route / Stops / Prep / Map sections behind a sticky nav) that folds in planner editing, the Today checklist, and the per-trip map. Old `/planner` and `/today` routes redirect to the active trip. Re-key the checklist per-trip. Surface sync errors instead of swallowing them.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind CSS 4, Vitest 3 + Testing Library, Supabase (optional/lazy), localStorage-first.

**Spec:** `docs/superpowers/specs/2026-07-02-unified-trip-management-design.md`

**Key conventions (from CLAUDE.md):**
- Verify against `npx tsc --noEmit`, `npx vitest run`, and `npm run build` (not just `next dev`).
- Every fixed bug leaves a regression test.
- Per-entity localStorage keys MUST include the entity id. Correctly-global keys: `theme`, `seasons-onboarded`, `seasons-passport`, `seasons-saved-trips`, and now `seasons-active-trip-id`.
- Client views import only `@/data/regions-slim` / `@/data/events-slim`, never heavy `@/data/regions`.

---

## File Structure

### New files
| File | Responsibility |
|---|---|
| `src/lib/active-trip.ts` | `getActiveTripId`, `setActiveTripId`, `ensureActiveTrip`, `ACTIVE_TRIP_EVENT` |
| `src/lib/trip-migrate.ts` | One-time draft→trips migration (idempotent, flagged) |
| `src/app/trips/page.tsx` | `/trips` home base — lists all trips as cards |
| `src/app/trips/[id]/page.tsx` | `/trips/[id]` server shell — loads trip, renders `<TripView>` |
| `src/components/TripView.tsx` | Client long-scroll surface: sticky nav + the four sections |
| `src/components/TripCard.tsx` | Card for the home base grid |
| `src/components/RouteSection.tsx` | Trip page Route section (summary + timeline) |
| `src/components/StopsSection.tsx` | Trip page Stops section (accordions + inline editing) |
| `src/components/PrepSection.tsx` | Trip page Prep section (wraps `PreDepartureChecklist`) |
| `src/components/MapSection.tsx` | Trip page Map section (Leaflet map + per-trip timeline) |
| `src/components/SyncBadge.tsx` | Sync-status indicator in the trip page sticky bar |
| `src/lib/sync-status.ts` | Tracks last cloud write/read outcome for the SyncBadge |

### Modified files
| File | Change |
|---|---|
| `src/lib/checklist.ts` | Re-key `checklistStorageKey` by trip id |
| `src/lib/saved-trips.ts` | Add `createTrip`, `updateTrip`, `getTrip` helpers |
| `src/lib/supabase/trips.ts` | Surface (not swallow) errors via `sync-status` |
| `src/components/PreDepartureChecklist.tsx` | Accept a `tripId` prop, re-keyed storage |
| `src/components/AddToTripButton.tsx` | Navigate to `/trips/[id]?add=…` instead of `addToDraft` |
| `src/components/SiteNav.tsx` | Restructure nav; single 🧳 badge → `/trips` |
| `src/components/CalendarView.tsx` | Global cross-trip view; rows link to `/trips/[id]` |
| `src/components/RouteMap.tsx` | Accept a `stops` prop (decouple from draft) — *verify interface* |

### Deleted (in the final task, after redirects work)
| File | Reason |
|---|---|
| `src/lib/trip-draft.ts` | Draft concept retired |
| `src/components/TripPlanner.tsx` | Folded into TripView + sections |
| `src/components/TodayView.tsx` | Folded into TripView (Prep/Route) |
| `src/app/planner/page.tsx`, `src/app/today/page.tsx` | Replaced by redirects |

### Tests
| File | Covers |
|---|---|
| `test/active-trip.test.ts` | pointer get/set, event dispatch, ensureActiveTrip creates default |
| `test/trip-migrate.test.ts` | migration: draft→trip, idempotency, flag |
| `test/checklist.test.ts` | **rewrite** per-trip key tests (replaces region-id-key tests) |
| `test/saved-trips.test.ts` | createTrip/updateTrip/getTrip |
| `test/sync-status.test.ts` | error surfacing |

---

## Build order (safe, never-broken)

The plan is ordered so the app keeps working throughout. Tasks 1–4 build the new data layer (additive, no deletions). Tasks 5–9 build the new pages. Tasks 10–12 wire navigation + entry points to the new pages. Task 13 surfaces sync errors. Task 14 does the one-time migration. **Only Task 15 deletes the old code**, after redirects make it dead.

---

### Task 1: Active-trip pointer (`src/lib/active-trip.ts`)

The single new global key that says which trip the user is editing. Correctly global (one user, one active trip), so no entity id in the key.

**Files:**
- Create: `src/lib/active-trip.ts`
- Test: `test/active-trip.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/active-trip.test.ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  getActiveTripId,
  setActiveTripId,
  ensureActiveTripId,
  ACTIVE_TRIP_EVENT,
  ACTIVE_TRIP_KEY,
} from "@/lib/active-trip";
import { getSavedTrips } from "@/lib/saved-trips";

describe("active-trip pointer", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips the active id through localStorage", () => {
    setActiveTripId("abc-123");
    expect(getActiveTripId()).toBe("abc-123");
  });

  it("dispatches ACTIVE_TRIP_EVENT on set", () => {
    let fired = false;
    window.addEventListener(ACTIVE_TRIP_EVENT, () => (fired = true));
    setActiveTripId("xyz");
    expect(fired).toBe(true);
  });

  it("returns null when nothing is set", () => {
    expect(getActiveTripId()).toBeNull();
  });

  it("ensureActiveTripId returns the current id when valid", () => {
    setActiveTripId("keep-me");
    expect(ensureActiveTripId()).toBe("keep-me");
  });

  it("ensureActiveTripId repoints to the newest trip when the pointer is stale", () => {
    // seed two saved trips directly
    localStorage.setItem(
      "seasons-saved-trips",
      JSON.stringify([
        { id: "old", name: "Old", start: 1, stops: [], updatedAt: 100 },
        { id: "new", name: "New", start: 1, stops: [], updatedAt: 200 },
      ])
    );
    setActiveTripId("does-not-exist"); // stale
    const id = ensureActiveTripId();
    expect(id).toBe("new"); // newest by updatedAt
    expect(getActiveTripId()).toBe("new"); // repointed
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/active-trip.test.ts`
Expected: FAIL — module `@/lib/active-trip` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/active-trip.ts
import { getSavedTrips } from "@/lib/saved-trips";

export const ACTIVE_TRIP_KEY = "seasons-active-trip-id";
export const ACTIVE_TRIP_EVENT = "seasons-active-trip-change";

/** The id of the trip the user is currently editing. Null if none chosen. */
export function getActiveTripId(): string | null {
  try {
    const v = localStorage.getItem(ACTIVE_TRIP_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Set the active trip and broadcast so open views (nav badge, trip page) refresh. */
export function setActiveTripId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_TRIP_KEY, id);
    else localStorage.removeItem(ACTIVE_TRIP_KEY);
  } catch {
    // ignore blocked storage
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACTIVE_TRIP_EVENT));
  }
}

/**
 * Return a valid active-trip id, repairing the pointer if it points at a
 * deleted/missing trip: fall back to the newest saved trip. Returns null only
 * when the user has no trips at all.
 */
export function ensureActiveTripId(): string | null {
  const current = getActiveTripId();
  const trips = getSavedTrips();
  if (current && trips.some((t) => t.id === current)) return current;
  const newest = trips[0]?.id ?? null; // getSavedTrips is sorted newest-first
  if (newest) setActiveTripId(newest);
  return newest;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/active-trip.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/active-trip.ts test/active-trip.test.ts
git commit -m "Add active-trip pointer module + tests"
```

---

### Task 2: Trip store helpers (`createTrip`, `updateTrip`, `getTrip`)

Add create/update/get helpers to the existing saved-trips store so new code never touches the raw array. These are the building blocks for "New trip" and trip edits.

**Files:**
- Modify: `src/lib/saved-trips.ts`
- Test: `test/saved-trips.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/saved-trips.test.ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  getSavedTrips,
  createTrip,
  updateTrip,
  getTrip,
} from "@/lib/saved-trips";

describe("trip store helpers", () => {
  beforeEach(() => localStorage.clear());

  it("createTrip adds a fresh trip and returns it", () => {
    const t = createTrip();
    expect(t.id).toBeTruthy();
    expect(t.name).toBe("Untitled trip");
    expect(getSavedTrips()).toHaveLength(1);
    expect(getSavedTrips()[0].id).toBe(t.id);
  });

  it("getTrip returns the trip by id, undefined when missing", () => {
    const t = createTrip();
    expect(getTrip(t.id)?.id).toBe(t.id);
    expect(getTrip("nope")).toBeUndefined();
  });

  it("updateTrip mutates in place and bumps updatedAt", () => {
    const t = createTrip();
    const before = t.updatedAt ?? 0;
    updateTrip(t.id, (trip) => {
      trip.name = "Renamed";
      trip.stops = [["vietnam-hoian", 2]];
    });
    const after = getTrip(t.id);
    expect(after?.name).toBe("Renamed");
    expect(after?.stops).toEqual([["vietnam-hoian", 2]]);
    expect((after?.updatedAt ?? 0) >= before).toBe(true);
  });

  it("updateTrip is a no-op for a missing id", () => {
    createTrip();
    updateTrip("missing", (t) => (t.name = "x"));
    expect(getSavedTrips()).toHaveLength(1);
    expect(getSavedTrips()[0].name).toBe("Untitled trip");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/saved-trips.test.ts`
Expected: FAIL — `createTrip` is not exported.

- [ ] **Step 3: Write minimal implementation**

Add to the bottom of `src/lib/saved-trips.ts` (after the existing `renameSavedTrip`):

```ts
/** Create a fresh empty trip, persist it, and return it. */
export function createTrip(name = "Untitled trip"): SavedTripLite {
  const trip: SavedTripLite = {
    id: crypto.randomUUID(),
    name,
    start: 0, // 0 = unset; the trip page falls back to the current month
    stops: [],
    updatedAt: Date.now(),
  };
  const next = [trip, ...getSavedTrips()];
  writeSavedTrips(next);
  return trip;
}

/** Fetch a single trip by id (undefined if missing). */
export function getTrip(id: string): SavedTripLite | undefined {
  return getSavedTrips().find((t) => t.id === id);
}

/**
 * Apply a mutation to a trip in place. Bumps `updatedAt` so cloud
 * last-write-wins picks up the edit. No-op (returns false) if the id is gone.
 * Does NOT auto-sync to the cloud — callers mirror remote if signed in.
 */
export function updateTrip(
  id: string,
  mutate: (trip: SavedTripLite) => void
): boolean {
  const trips = getSavedTrips();
  const i = trips.findIndex((t) => t.id === id);
  if (i === -1) return false;
  mutate(trips[i]);
  trips[i].updatedAt = Date.now();
  return writeSavedTrips(trips);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/saved-trips.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/saved-trips.ts test/saved-trips.test.ts
git commit -m "Add createTrip/updateTrip/getTrip trip-store helpers + tests"
```

---

### Task 3: Re-key checklist per trip

The checklist currently keys progress by sorted region-id *set* (`seasons-checklist:a|b`). Re-key to per-trip id so two trips with the same stops don't share state, and the checklist clearly belongs to a trip.

**Files:**
- Modify: `src/lib/checklist.ts:18-20`
- Modify: `test/checklist.test.ts:76-92` (rewrite the `checklistStorageKey` block)

- [ ] **Step 1: Rewrite the failing test**

Replace the `describe("checklistStorageKey (per-trip isolation)")` block in `test/checklist.test.ts` (lines 76–92) with:

```ts
describe("checklistStorageKey (per-trip)", () => {
  it("keys by trip id, not destination set", () => {
    // Two trips with identical stops must NOT share checklist progress.
    expect(checklistStorageKey("trip-a")).not.toBe(
      checklistStorageKey("trip-b")
    );
  });

  it("namespaces under the checklist prefix", () => {
    expect(checklistStorageKey("trip-a")).toBe("seasons-checklist:trip-a");
  });
});
```

Also update the import line at the top of `test/checklist.test.ts` — it stays the same (`checklistStorageKey` is still exported), just confirm.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/checklist.test.ts`
Expected: FAIL — `checklistStorageKey` still takes an array; the new tests pass a string.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/checklist.ts`, replace the `checklistStorageKey` function (lines 18–20):

```ts
/**
 * localStorage key for a trip's checklist progress, scoped to the trip id so
 * ticking an item on one trip never carries over to another (even two trips
 * with identical destinations).
 */
export function checklistStorageKey(tripId: string): string {
  return `seasons-checklist:${tripId}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/checklist.test.ts`
Expected: PASS (all — the `buildChecklistItems` tests are untouched).

- [ ] **Step 5: Find and fix the call site**

Search for callers of `checklistStorageKey`:

```bash
grep -rn "checklistStorageKey" src/
```

There is one caller: `src/components/PreDepartureChecklist.tsx`. It currently computes the key from the trip's region ids. **Defer the full fix to Task 8** (PrepSection passes `tripId`); for now, note the call site. Do NOT edit it yet — it will break the old `/today` page, which still works until Task 15. Leave a `// TODO(trip-redesign): pass tripId from PrepSection` if helpful, but the old call keeps working because `/today` still derives region ids.

*(Self-check: the old `/today` page passes region ids to the checklist; we keep that path working until the page is retired in Task 15. The new PrepSection in Task 8 will pass a tripId. To support both during the transition, make `checklistStorageKey` accept either — but that muddies the contract. Cleaner: Task 8 changes the PreDepartureChecklist signature to require `tripId`, and Task 15 deletes `/today` which is the only other caller. So between Task 8 and Task 15, `/today` will be temporarily broken — acceptable only because Task 10 redirects `/today` away before Task 8 ships. Reorder if needed: ensure Task 10 (redirect) lands before Task 8 changes the signature.)*

- [ ] **Step 6: Commit**

```bash
git add src/lib/checklist.ts test/checklist.test.ts
git commit -m "Re-key checklist per-trip id; update tests"
```

---

### Task 4: `PreDepartureChecklist` takes a `tripId` prop

Couple the checklist to a trip. The component now reads its progress from the per-trip key (Task 3) using the passed `tripId`.

**⚠️ Ordering prerequisite:** `/today` (the only current caller) must already be a redirect before this lands, or the build breaks. **Execute Task 10 (redirects) before this task.** The task numbers below are logical grouping; the safe execution sequence is: 1, 2, 3, 5, 6, 7, 8, 9, **10**, **4**, 11, 12, 13, 14, 15. (Task 5's SyncBadge is independent and can go anywhere before Task 7.)

**Files:**
- Modify: `src/components/PreDepartureChecklist.tsx`

- [ ] **Step 1: Read the current component**

Run: read `src/components/PreDepartureChecklist.tsx` fully. It currently takes `regions: Region[]` and computes the storage key internally from the region ids.

- [ ] **Step 2: Change the props**

The new signature:

```tsx
export function PreDepartureChecklist({
  tripId,
  regions,
}: {
  tripId: string;
  regions: Region[];
}) {
  // …inside, replace the internal key derivation:
  const key = checklistStorageKey(tripId); // was: checklistStorageKey(regions.map(r => r.id))
  // …rest unchanged
}
```

- [ ] **Step 3: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: clean (the old `/today` caller is gone — it's a redirect as of Task 10). The only caller now is the new PrepSection (Task 8), which passes `tripId`.

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: PASS (checklist logic tests don't render the component).

- [ ] **Step 5: Commit**

```bash
git add src/components/PreDepartureChecklist.tsx
git commit -m "PreDepartureChecklist: take tripId, use per-trip key"
```

---

### Task 5: Sync-status module (surface cloud errors)

Stop swallowing sync errors. A tiny module records the last cloud read/write outcome; the SyncBadge reads it.

**Files:**
- Create: `src/lib/sync-status.ts`
- Create: `src/components/SyncBadge.tsx`
- Test: `test/sync-status.test.ts`
- Modify: `src/lib/supabase/trips.ts:57`, `:37`

- [ ] **Step 1: Write the failing test**

```ts
// test/sync-status.test.ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  recordSyncResult,
  getSyncStatus,
  SYNC_STATUS_EVENT,
} from "@/lib/sync-status";

describe("sync-status", () => {
  beforeEach(() => localStorage.clear());

  it("starts as 'unknown'", () => {
    expect(getSyncStatus()).toBe("unknown");
  });

  it("records a successful write as 'synced'", () => {
    recordSyncResult({ kind: "write", ok: true });
    expect(getSyncStatus()).toBe("synced");
  });

  it("records a failed write as 'failed'", () => {
    recordSyncResult({ kind: "write", ok: false, message: "relation trips does not exist" });
    expect(getSyncStatus()).toBe("failed");
  });

  it("dispatches SYNC_STATUS_EVENT on change", () => {
    let fired = false;
    window.addEventListener(SYNC_STATUS_EVENT, () => (fired = true));
    recordSyncResult({ kind: "write", ok: true });
    expect(fired).toBe(true);
  });

  it("a later success clears a failure", () => {
    recordSyncResult({ kind: "write", ok: false, message: "boom" });
    recordSyncResult({ kind: "write", ok: true });
    expect(getSyncStatus()).toBe("synced");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/sync-status.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

```ts
// src/lib/sync-status.ts
// In-memory (not persisted) record of the last cloud sync outcome, so the
// SyncBadge can show "Saved ✓" vs "Saved locally · sync failed" instead of
// silently swallowing the error like the old console.warn did.

export type SyncStatus = "unknown" | "synced" | "failed";
export const SYNC_STATUS_EVENT = "seasons-sync-status-change";

interface SyncResult {
  kind: "read" | "write";
  ok: boolean;
  message?: string;
}

let current: SyncStatus = "unknown";

export function getSyncStatus(): SyncStatus {
  return current;
}

export function getLastErrorMessage(): string | null {
  return lastMessage;
}

let lastMessage: string | null = null;

export function recordSyncResult(r: SyncResult): void {
  if (r.ok) {
    current = "synced";
    lastMessage = null;
  } else {
    current = "failed";
    lastMessage = r.message ?? null;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SYNC_STATUS_EVENT));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/sync-status.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire it into the Supabase trips module**

In `src/lib/supabase/trips.ts`, import `recordSyncResult` and call it at the two silent-failure points:

At `fetchRemoteTrips` (line 37, the `if (error || !data) return [];`):
```ts
if (error || !data) {
  if (error) recordSyncResult({ kind: "read", ok: false, message: error.message });
  return [];
}
recordSyncResult({ kind: "read", ok: true });
return (data as TripRow[]).map(fromRow);
```

At `upsertRemoteTrip` (line 57–58):
```ts
if (error) {
  recordSyncResult({ kind: "write", ok: false, message: error.message });
  console.warn("[trips] cloud save failed:", error.message);
  return false;
}
recordSyncResult({ kind: "write", ok: true });
return true;
```

- [ ] **Step 6: Write the SyncBadge component**

```tsx
// src/components/SyncBadge.tsx
"use client";
import { useEffect, useState } from "react";
import { getSyncStatus, getLastErrorMessage, SYNC_STATUS_EVENT } from "@/lib/sync-status";

export function SyncBadge() {
  const [status, setStatus] = useState(getSyncStatus());
  useEffect(() => {
    const sync = () => setStatus(getSyncStatus());
    window.addEventListener(SYNC_STATUS_EVENT, sync);
    return () => window.removeEventListener(SYNC_STATUS_EVENT, sync);
  }, []);

  if (status === "synced") {
    return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Synced ✓</span>;
  }
  if (status === "failed") {
    return (
      <a href="/debug-sync" title={getLastErrorMessage() ?? undefined}
         className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 hover:underline">
        Sync failed
      </a>
    );
  }
  return null; // unknown — show nothing until we've tried
}
```

- [ ] **Step 7: Run all tests + tsc**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/sync-status.ts src/components/SyncBadge.tsx src/lib/supabase/trips.ts test/sync-status.test.ts
git commit -m "Surface cloud sync errors via SyncBadge instead of swallowing"
```

---

### Task 6: Trip page server shell (`/trips/[id]`)

Server component that loads the trip from localStorage-equivalent data and renders the client `<TripView>`. Since trips are in localStorage (client-only), the page is a thin shell that passes the id; `TripView` does the client-side load. The page handles the "trip not found" case.

**Files:**
- Create: `src/app/trips/[id]/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// src/app/trips/[id]/page.tsx
import { TripView } from "@/components/TripView";

export const metadata = {
  title: "Trip",
  description: "Build and manage your trip — route, stops, prep, and map in one place.",
};

export default async function TripPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ add?: string }>;
}) {
  const { id } = await params;
  const { add } = await searchParams;
  return <TripView tripId={id} addRegionId={add} />;
}
```

- [ ] **Step 2: Verify tsc**

Run: `npx tsc --noEmit`
Expected: error — `TripView` not yet created. That's the next task; this stub lets the route exist. Proceed to Task 7, then return to verify.

- [ ] **Step 3: Commit (deferred until Task 7 creates TripView — commit together)**

---

### Task 7: `TripView` — the unified trip page surface (client)

The core of the redesign. A client component that loads the trip by id, renders the sticky section nav, and the four sections. This is large; build it incrementally and lean on the existing season helpers.

**Files:**
- Create: `src/components/TripView.tsx`
- Reference (reuse, don't rewrite): `src/lib/season.ts` (`planItinerary`, `legDateRanges`, `MONTH_NAMES`, `fitQuality`), `src/components/RouteMap.tsx`, `src/components/PreDepartureChecklist.tsx`

- [ ] **Step 1: Read the helpers you'll reuse**

Read `src/lib/season.ts` for the exact signatures of: `planItinerary(stops, startMonth) → ItineraryLeg[]`, `legDateRanges(startMonth, legs)`, `MONTH_NAMES`, `MONTH_NAMES_LONG`, `fitQuality(legs)`, `estimateTripCost`. Also read `src/components/RouteMap.tsx` for its props (does it take `legs` or read the draft?).

- [ ] **Step 2: Write the TripView skeleton (no sections yet)**

```tsx
// src/components/TripView.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTrip, updateTrip, setActiveTripId, ensureActiveTripId, ACTIVE_TRIP_EVENT } from "@/lib/active-trip";
// (also import getTrip/updateTrip/setActiveTripId from their modules)
import { TripViewSections } from "./TripViewSections"; // extracted below

export function TripView({ tripId, addRegionId }: { tripId: string; addRegionId?: string }) {
  const router = useRouter();
  const [trip, setTrip] = useState(() => getTrip(tripId));

  // Keep the displayed trip in sync if it's edited elsewhere (e.g. rename in another tab).
  useEffect(() => {
    const sync = () => setTrip(getTrip(tripId));
    window.addEventListener(ACTIVE_TRIP_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACTIVE_TRIP_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [tripId]);

  // Make this the active trip on open.
  useEffect(() => {
    setActiveTripId(tripId);
  }, [tripId]);

  // Handle ?add=<regionId>: stage the destination for confirmation.
  useEffect(() => {
    if (!addRegionId || !trip) return;
    if (trip.stops.some(([id]) => id === addRegionId)) return;
    updateTrip(tripId, (t) => t.stops.push([addRegionId, 2]));
    setTrip(getTrip(tripId));
    // clear the query param so a refresh doesn't re-add
    router.replace(`/trips/${tripId}`);
  }, [addRegionId, tripId, trip, router]);

  if (!trip) {
    return (
      <div className="py-20 text-center">
        <p className="text-stone-600">This trip doesn&apos;t exist.</p>
        <Link href="/trips" className="mt-3 inline-block font-medium text-amber-600 hover:underline">
          ← Back to my trips
        </Link>
      </div>
    );
  }

  return <TripViewSections trip={trip} onChange={() => setTrip(getTrip(tripId))} />;
}
```

- [ ] **Step 3: Add the sticky nav + section scaffold**

Add the sticky bar (Row 1: ← Trips · name · SyncBadge · Rename · Share · ⋯; Row 2: Route · Stops · Prep · Map with scroll-spy) and render the four sections. The sections (RouteSection, StopsSection, PrepSection, MapSection) are created in Task 8. For this step, render placeholder `<section id="route">` etc. so the nav anchors work, then Task 8 fills them.

*(Full JSX for the sticky bar — see the approved mockup: trip name bold, `Saved ✓` replaced by `<SyncBadge/>`, Rename as an inline-editable text field toggled by a pencil, Share via the existing `ShareTripButton`, ⋯ menu for delete/duplicate/invite. Section nav uses `<a href="#route">` etc. with a scroll listener adding an `active` class.)*

- [ ] **Step 4: Verify tsc + build**

Run: `npx tsc --noEmit`
Expected: clean once all referenced modules exist.

- [ ] **Step 5: Commit**

```bash
git add src/app/trips/[id]/page.tsx src/components/TripView.tsx
git commit -m "Add /trips/[id] page shell + TripView surface (sections stubbed)"
```

---

### Task 8: The four trip-page sections

Each section is a focused component. Build them one at a time, reusing existing components where possible.

**Files:**
- Create: `src/components/RouteSection.tsx`, `StopsSection.tsx`, `PrepSection.tsx`, `MapSection.tsx`

- [ ] **Step 1: RouteSection** — summary chips + season timeline. Reuse `planItinerary`, `legDateRanges`, `MONTH_NAMES`. Render stops as chips (flag + duration), the season timeline bar, total duration, fit indicator. *(Inline the JSX from the approved mockup.)*

- [ ] **Step 2: StopsSection** — accordion list. Reuse `getSlimRegion` for names/flags, `climateForMonth` for season fit. Collapsed: name/flag/duration/season. Expanded: visa (from `region.info.visa`), one-line climate (`region.climateBlurb`), daily cost (`region.dailyBudget`), top sights (`region.sights.slice(0,4)`), "Full guide →" link to `/regions/[id]`. Editing: duration selector (1–3), remove (✕), reorder via up/down arrow buttons (no DnD lib — see Open Q §7.2, decided: arrows for v1).

- [ ] **Step 3: PrepSection** — render `<PreDepartureChecklist tripId={trip.id} regions={resolvedRegions} />`. Resolve regions via `getRegion` for each stop id. Show the pending-count badge.

- [ ] **Step 4: MapSection** — render `<RouteMap legs={legs} />` (verify RouteMap accepts a `legs` prop; if it reads the draft, adapt it — see Task 11) + a per-trip timeline (reuse the month-bar rendering from `CalendarView`).

- [ ] **Step 5: Wire sections into TripView** — replace the placeholders from Task 7 Step 3 with the real components.

- [ ] **Step 6: Verify tsc + build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean, `/trips/[id]` route present.

- [ ] **Step 7: Commit**

```bash
git add src/components/RouteSection.tsx src/components/StopsSection.tsx src/components/PrepSection.tsx src/components/MapSection.tsx src/components/TripView.tsx
git commit -m "Implement Route/Stops/Prep/Map sections for the trip page"
```

---

### Task 9: `/trips` home base

The grid of trip cards.

**Files:**
- Create: `src/app/trips/page.tsx`
- Create: `src/components/TripCard.tsx`

- [ ] **Step 1: Write TripCard**

```tsx
// src/components/TripCard.tsx
"use client";
import Link from "next/link";
import type { SavedTripLite } from "@/lib/saved-trips";

export function TripCard({ trip, active }: { trip: SavedTripLite; active: boolean }) {
  // Render per the approved mockup: thumbnail gradient derived from first stop,
  // name, flags + stop count, start month + duration, mini season timeline,
  // date range, last-edited, Active tag.
  // (Full JSX inline from the mockup.)
  return (
    <Link href={`/trips/${trip.id}`} className="…">
      {/* … */}
    </Link>
  );
}
```

- [ ] **Step 2: Write the home base page**

```tsx
// src/app/trips/page.tsx
"use client";
import { useEffect, useState } from "react";
import { getSavedTrips, SAVED_TRIPS_EVENT, createTrip } from "@/lib/saved-trips";
import { getActiveTripId, ACTIVE_TRIP_EVENT } from "@/lib/active-trip";
import { useRouter } from "next/navigation";
import { TripCard } from "@/components/TripCard";

export default function TripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState(getSavedTrips());
  const [activeId, setActiveId] = useState(getActiveTripId());

  useEffect(() => {
    const sync = () => {
      setTrips(getSavedTrips());
      setActiveId(getActiveTripId());
    };
    window.addEventListener(SAVED_TRIPS_EVENT, sync);
    window.addEventListener(ACTIVE_TRIP_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { /* remove listeners */ };
  }, []);

  const newTrip = () => {
    const t = createTrip();
    router.push(`/trips/${t.id}`);
  };

  // Empty state + grid of <TripCard> + the "+ New trip" dashed card.
  // (JSX per the approved mockup.)
  return null; // replace with real JSX
}
```

- [ ] **Step 3: Verify tsc + build**

Run: `npx tsc --noEmit && npm run build`
Expected: `/trips` route present.

- [ ] **Step 4: Commit**

```bash
git add src/app/trips/page.tsx src/components/TripCard.tsx
git commit -m "Add /trips home base with trip cards"
```

---

### Task 10: Redirect `/planner` and `/today` to the active trip

Make the old routes funnel into the new trip page. This must land *before* Task 4 changes the checklist signature (so `/today` isn't broken while live).

**Files:**
- Modify: `src/app/planner/page.tsx`, `src/app/today/page.tsx`

- [ ] **Step 1: Replace planner page with a redirect**

```tsx
// src/app/planner/page.tsx
import { redirect } from "next/navigation";
import { ensureActiveTripId } from "@/lib/active-trip";

export default function PlannerPage() {
  const id = ensureActiveTripId();
  redirect(id ? `/trips/${id}` : "/trips");
}
```

*Note: `ensureActiveTripId` reads localStorage, which is client-only. A server component can't read it. Two options: (a) make this a client component using `useEffect` + `router.replace`, or (b) since trips are client-only anyway, make the redirect client-side. Use a client component:*

```tsx
// src/app/planner/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ensureActiveTripId } from "@/lib/active-trip";

export default function PlannerPage() {
  const router = useRouter();
  useEffect(() => {
    const id = ensureActiveTripId();
    router.replace(id ? `/trips/${id}` : "/trips");
  }, [router]);
  return null;
}
```

- [ ] **Step 2: Replace today page identically**

Same pattern for `src/app/today/page.tsx`.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: both routes build; visiting them redirects.

- [ ] **Step 4: Commit**

```bash
git add src/app/planner/page.tsx src/app/today/page.tsx
git commit -m "Redirect /planner and /today to the active trip page"
```

---

### Task 11: Update `AddToTripButton` to navigate to the trip page

"Add to trip" now jumps into the trip page with the destination staged, rather than silently appending to the draft.

**Files:**
- Modify: `src/components/AddToTripButton.tsx`

- [ ] **Step 1: Read current implementation**

It calls `addToDraft(regionId, monthOf())`. Replace with navigation.

- [ ] **Step 2: Rewrite**

```tsx
// src/components/AddToTripButton.tsx
"use client";
import { useRouter } from "next/navigation";
import { ensureActiveTripId, setActiveTripId } from "@/lib/active-trip";
import { getTrip, createTrip } from "@/lib/saved-trips";

export function AddToTripButton({ regionId, className = "" }: { regionId: string; className?: string }) {
  const router = useRouter();

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Ensure there's an active trip; create one if the user has none.
    let id = ensureActiveTripId();
    if (!id) {
      const t = createTrip();
      id = t.id;
    }
    setActiveTripId(id);
    // Jump into the trip page with the destination staged (?add=).
    router.push(`/trips/${id}?add=${regionId}`);
  };

  return (
    <button onClick={onClick} className={className}>
      + Add to trip
    </button>
  );
}
```

Note: the old "✓ In your trip" state (which polled the draft) is dropped — after navigating, the trip page shows the stop. If you want to keep a quick "already added" affordance, check `getTrip(activeId)?.stops` before rendering; optional, not required for v1.

- [ ] **Step 3: Verify tsc + build**

Run: `npx tsc --noEmit && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/AddToTripButton.tsx
git commit -m "AddToTripButton: navigate into the trip page with the stop staged"
```

---

### Task 12: Restructure `SiteNav` + single badge

New nav structure (Explore + My trips primary; discovery tools secondary) and a single 🧳 badge → `/trips`.

**Files:**
- Modify: `src/components/SiteNav.tsx`

- [ ] **Step 1: Rewrite the NAV array and badge**

```tsx
// Primary nav items
const PRIMARY = [
  { href: "/", label: "Explore" },
  { href: "/trips", label: "My trips" },
];
// Secondary (discovery tools)
const SECONDARY = [
  { href: "/when-to-go", label: "When to go" },
  { href: "/compare", label: "Compare" },
  { href: "/calendar", label: "Calendar" },
  { href: "/festivals", label: "Festivals" },
  { href: "/surprise", label: "Surprise" },
  { href: "/where-can-i-go", label: "For me" },
];
```

Replace `TripChip` + `SavedTripsChip` with a single `TripsBadge`:

```tsx
function TripsBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const sync = () => setCount(getSavedTrips().length);
    sync();
    window.addEventListener(SAVED_TRIPS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(SAVED_TRIPS_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  if (count === 0) return null;
  return (
    <Link href="/trips" className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-amber-600"
      title={`${count} ${count === 1 ? "trip" : "trips"}`}>
      🧳 {count}
    </Link>
  );
}
```

Remove the `getDraft`/`DRAFT_EVENT` imports. Render PRIMARY items first (bolder), SECONDARY after, then `<TripsBadge/>`, `<ThemeToggle/>`, `<AccountMenu/>`.

- [ ] **Step 2: Verify tsc + build**

Run: `npx tsc --noEmit && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/components/SiteNav.tsx
git commit -m "Restructure nav: Explore + My trips primary, single 🧳 badge"
```

---

### Task 13: Calendar as the global cross-trip view

Adapt `CalendarView` to show all trips (it already does) but make rows link to `/trips/[id]` instead of `/planner`, and remove its rename/edit (now in the trip page).

**Files:**
- Modify: `src/components/CalendarView.tsx`

- [ ] **Step 1: Read current CalendarView**

It already reads draft + saved trips and builds rows. The "open" action does `router.push("/planner")` and `loadSavedTripToDraft`. Rename to: `router.push('/trips/${id}')`. Remove the rename UI (lives in the trip page now). Remove the draft row (draft is gone) — show only saved trips. Remove the `loadSavedTripToDraft` import.

- [ ] **Step 2: Apply the changes**

Specifically:
- Delete the synthetic "Current trip" draft row (lines building it from `getDraft()`).
- Change the row click handler from `loadSavedTripToDraft(t); router.push("/planner")` to `router.push(\`/trips/${t.id}\`)`.
- Remove the rename ✏️ and its handler; keep delete (it's still convenient here) but have it call the trip-store delete.
- Update imports: drop `getDraft`, `loadSavedTripToDraft`; use `deleteSavedTrip` + remote delete.

- [ ] **Step 3: Verify tsc + build**

Run: `npx tsc --noEmit && npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/CalendarView.tsx
git commit -m "Calendar: global cross-trip view, rows link to /trips/[id]"
```

---

### Task 14: One-time draft→trips migration

Migrate existing users' drafts into named trips, idempotently.

**Files:**
- Create: `src/lib/trip-migrate.ts`
- Test: `test/trip-migrate.test.ts`
- Wire into `src/app/layout.tsx` (run once on mount)

- [ ] **Step 1: Write the failing test**

```ts
// test/trip-migrate.test.ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { migrateDraftToTrips } from "@/lib/trip-migrate";
import { getSavedTrips } from "@/lib/saved-trips";
import { getActiveTripId } from "@/lib/active-trip";

describe("draft→trips migration", () => {
  beforeEach(() => localStorage.clear());

  it("promotes an existing draft into a saved trip", () => {
    localStorage.setItem("seasons-draft", JSON.stringify({ start: 10, stops: [{ id: "vietnam-hoian", duration: 2 }] }));
    migrateDraftToTrips();
    const trips = getSavedTrips();
    expect(trips).toHaveLength(1);
    expect(trips[0].name).toBe("Untitled trip");
    expect(trips[0].stops).toEqual([["vietnam-hoian", 2]]);
    expect(trips[0].start).toBe(10);
  });

  it("deletes the draft after migrating", () => {
    localStorage.setItem("seasons-draft", JSON.stringify({ start: 1, stops: [] }));
    migrateDraftToTrips();
    expect(localStorage.getItem("seasons-draft")).toBeNull();
  });

  it("sets the active trip to the migrated trip", () => {
    localStorage.setItem("seasons-draft", JSON.stringify({ start: 1, stops: [{ id: "x", duration: 1 }] }));
    migrateDraftToTrips();
    const trips = getSavedTrips();
    expect(getActiveTripId()).toBe(trips[0].id);
  });

  it("is idempotent — running twice does nothing the second time", () => {
    localStorage.setItem("seasons-draft", JSON.stringify({ start: 1, stops: [] }));
    migrateDraftToTrips();
    const afterFirst = getSavedTrips().length;
    migrateDraftToTrips();
    expect(getSavedTrips().length).toBe(afterFirst);
  });

  it("does nothing when there was no draft", () => {
    migrateDraftToTrips();
    expect(getSavedTrips()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/trip-migrate.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the module**

```ts
// src/lib/trip-migrate.ts
import { getSavedTrips, createTrip, SavedTripLite } from "@/lib/saved-trips";
import { setActiveTripId } from "@/lib/active-trip";

const MIGRATED_FLAG = "seasons-migrated-v2";

/**
 * One-time upgrade: turn the legacy anonymous "draft" into a named trip so it
 * appears in the trips list. Idempotent via a flag. Safe to call on every load.
 */
export function migrateDraftToTrips(): void {
  try {
    if (localStorage.getItem(MIGRATED_FLAG)) return;
  } catch {
    return;
  }

  let draftStops: [string, number][] = [];
  let draftStart = 0;
  try {
    const d = JSON.parse(localStorage.getItem("seasons-draft") || "{}");
    if (Array.isArray(d.stops)) {
      draftStops = d.stops
        .filter((s: unknown): s is { id: string; duration: number } =>
          typeof s === "object" && s !== null && typeof (s as any).id === "string")
        .map((s) => [s.id, typeof s.duration === "number" ? s.duration : 2]);
    }
    if (typeof d.start === "number") draftStart = d.start;
  } catch {
    /* malformed draft — ignore, treat as empty */
  }

  if (draftStops.length > 0) {
    // createTrip gives us an id + name; override start/stops with the draft's.
    const trip = createTrip("Untitled trip");
    const trips = getSavedTrips();
    const i = trips.findIndex((t) => t.id === trip.id);
    if (i !== -1) {
      trips[i].start = draftStart;
      trips[i].stops = draftStops;
      trips[i].updatedAt = Date.now();
      try { localStorage.setItem("seasons-saved-trips", JSON.stringify(trips)); } catch {}
    }
    setActiveTripId(trip.id);
  } else {
    // No draft: if there are saved trips, point active at the newest; else nothing.
    const existing = getSavedTrips();
    if (existing[0]) setActiveTripId(existing[0].id);
  }

  try {
    localStorage.removeItem("seasons-draft");
    localStorage.setItem(MIGRATED_FLAG, "1");
  } catch {
    /* ignore */
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/trip-migrate.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire into the root layout**

In `src/app/layout.tsx`, inside `AuthProvider`, call `migrateDraftToTrips()` once on mount. Add a tiny client effect (the layout is a server component, so put the call in an existing client child or a new `<MigrationRunner/>` client component mounted in the layout):

```tsx
// src/components/MigrationRunner.tsx
"use client";
import { useEffect } from "react";
import { migrateDraftToTrips } from "@/lib/trip-migrate";

export function MigrationRunner() {
  useEffect(() => { migrateDraftToTrips(); }, []);
  return null;
}
```

Mount `<MigrationRunner />` in `layout.tsx` next to `<AuthProvider>`.

- [ ] **Step 6: Verify full suite + build**

Run: `npx vitest run && npx tsc --noEmit && npm run build`

- [ ] **Step 7: Commit**

```bash
git add src/lib/trip-migrate.ts src/components/MigrationRunner.tsx src/app/layout.tsx test/trip-migrate.test.ts
git commit -m "One-time draft→trips migration + runner"
```

---

### Task 15: Delete retired code

Now that redirects work (Task 10) and the new pages own everything, delete the dead code. Run the full QA gate after.

**Files:**
- Delete: `src/lib/trip-draft.ts`, `src/components/TripPlanner.tsx`, `src/components/TodayView.tsx`
- Modify: remove any remaining imports of them

- [ ] **Step 1: Find remaining references**

```bash
grep -rn "trip-draft\|TripPlanner\|TodayView\|getDraft\|saveDraft\|addToDraft\|DRAFT_EVENT" src/ test/
```

- [ ] **Step 2: Delete the files**

```bash
git rm src/lib/trip-draft.ts src/components/TripPlanner.tsx src/components/TodayView.tsx
```

- [ ] **Step 3: Remove orphaned imports**

For each grep hit, remove the import and any dead code that used it. Expected hits: `src/components/CalendarView.tsx` (draft row — already removed in Task 13), `RegionCard.tsx` (none — it uses AddToTripButton), `ExploreGrid.tsx` (none).

- [ ] **Step 4: Run the full QA gate**

Run: `npx tsc --noEmit`
Expected: clean.
Run: `npx vitest run`
Expected: all pass.
Run: `npm run build`
Expected: green; `/planner` and `/today` build as redirect pages; `/trips` and `/trips/[id]` present; no warnings.
Run the client-bundle audit:

```bash
for f in $(grep -rl '"use client"' src/); do
  if grep -qE '@/data/(regions|regions-core|sights|events)([^-]|$)' "$f"; then echo "VIOLATION: $f"; fi
done
```
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Remove retired draft/planner/today code; redesign complete"
```

---

## Final QA (per CLAUDE.md pre-ship audit)

After Task 15:

- [ ] `npx tsc --noEmit` clean
- [ ] `npx vitest run` — all green (expected count: prior tests + active-trip, saved-trips, sync-status, trip-migrate = 5 new test files)
- [ ] `npm run build` — green, 0 warnings; routes: `/trips`, `/trips/[id]` present; `/planner`, `/today` redirect
- [ ] Client-bundle audit: no `"use client"` file imports heavy data modules
- [ ] Manual: hard-refresh, create a trip, add stops, tick checklist items, switch trips (isolation!), rename, share, sign in + sync — verify across the transition ("do X on A → switch to B → B clean → back → A kept")
- [ ] Run `/debug-sync` signed in to confirm sync end-to-end
- [ ] Commit final; merge to `main`; redeploy; hard-refresh (bumps past the service worker cache)

---

## Open questions resolved in-plan

1. **Active-trip cloud mirror?** No — client-only pointer for v1 (it's UI state, not trip data). §1.3 of spec.
2. **Drag-to-reorder?** Up/down arrow buttons for v1 (no DnD dependency, keeps the trip-page bundle lean given Leaflet is already heavy). StopsSection Task 8 Step 2.
3. **Staged-add URL shape?** `/trips/[id]?add=<regionId>`, cleared after applying. TripView Task 7 Step 2.
4. **Shared-trip deep link?** Update `/trip/[token]`'s "Open in planner →" to deep-link `/trips/<activeId>?…` (or a new trip from the shared data). Add as a follow-up task if not covered above — *note: not explicitly tasked; add a Task 16 if needed during execution.*
