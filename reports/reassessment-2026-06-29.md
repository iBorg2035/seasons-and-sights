# Seasons & Sights — Reassessment 2026-06-29 (baseline)

**Summary:** Codebase is healthy — typecheck, tests, and production build are all green, and the data model is fully populated across **72 destinations**. Festival/event coverage is strong: **68 of 72 destinations have events**; the 4 without are beach/island spots where marquee festivals are genuinely sparse.

> This is the **baseline** report. It was produced manually (the scheduled cloud Routine begins 2026-06-30 and writes to the `reassessment-reports` branch on GitHub; this local copy is an untracked file on `main` and is not committed or deployed). Method: read-only audit of the data model via a throwaway test that imports `REGIONS`, plus `tsc --noEmit`, full `vitest run`, and `next build`. No source files were modified.

## Changed since last report
First report — nothing to compare yet. (Project notes previously cited 69 destinations; the dataset is now **72**, +3.)

## Confirmed bugs
**None.** `tsc --noEmit` reports no errors; **48/48** tests pass; production build succeeds with **0 warnings** and 94 static pages (72 region pages + routes).

## Data holes
1. **Events/festivals missing for 4 of 72 destinations (6%).** Source: the `EVENTS` map in [src/data/events.ts](src/data/events.ts) (attached to regions in [src/data/regions.ts](src/data/regions.ts) at line 18). The `/festivals` page and the per-destination events section are powered by this; the 4 without are:
   `ecuador-galapagos, philippines-batanes, maldives-atolls, indonesia-komodo`.
   Priority: **low** — feature-enriching, not breaking. All four are beach/island/dive spots where marquee festivals are genuinely sparse, so the gap reads as natural rather than missing.

> Note: an earlier draft of this report claimed 39 of 72 destinations had no events. That was wrong — the events dataset was fuller than the audit measured. The correct figure is 4 of 72.

No other data holes. Verified complete across all 72 destinations: no duplicate ids; every region has a full 12-month climate, ≥2 sights (all with valid `type`), valid coordinates (none 0,0 or out of range), a `photo` whose file exists in `public/photos/`, a `wikiTitle`, a `toolkit`, a `dailyBudget`, and an `info` block. No orphaned keys in `wiki-titles.json` or `photos.json`; 72 photo files referenced = 72 on disk (no unreferenced files). All **35** destination countries have a `VISA_RULES` entry ([src/lib/visa.ts](src/lib/visa.ts)).

## Improvement opportunities
1. **Heaviest routes: `/planner` (216 kB) and `/trip/[token]` (215 kB) First Load JS** — roughly 2× the 103 kB shared baseline, almost certainly the Leaflet/react-leaflet map. Lazy-loading the map (dynamic import, render-on-view) would let the planner shell paint first. **Medium impact** — these are core flows.
2. **Fill in events for the 4 missing destinations** (see Data holes). Even one or two marquee festivals each would round out `/festivals`, though the gap is minor.
3. **UI for "no major festivals."** For genuinely festival-light beach destinations, consider showing an explicit "no major festivals" note rather than an empty section, so the gap reads as intentional.

## Healthy / no action
- **Type safety:** `tsc --noEmit` clean.
- **Tests:** 48/48 pass (`vitest run`).
- **Build:** green — 94 static pages, 0 warnings, shared First Load JS 103 kB.
- **Client bundle hygiene:** no `"use client"` component imports the heavy `@/data/regions`; client views correctly use `@/data/regions-slim`. ✓
- **Data integrity:** fully populated (detailed above).
- **Visa coverage:** `visaFor()` returns a value for every destination country.
- **Hygiene:** no `TODO`/`FIXME`/`HACK` markers and no stray `console.log` in `src`.
- **Not a bug:** `draft.start || initialMonth` at [src/components/TodayView.tsx:74](src/components/TodayView.tsx) is correct — `TripDraft.start` is documented 1-based with `0` meaning "unset" ([src/lib/trip-draft.ts](src/lib/trip-draft.ts)), so falling back to the current month is intentional.
