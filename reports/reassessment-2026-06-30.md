# Reassessment — 2026-06-30

**Summary:** Build/types/tests are all clean and data integrity is excellent (72/72 destinations fully populated), but the "slim" client-bundle architecture is broken — every client view still ships the full ~141KB region dataset (sights, toolkit, events) to the browser — and 39/72 destinations have no festivals/events data.

This is the **first reassessment report** on the `reassessment-reports` branch; there is no prior report to diff against.

## Changed since last report

N/A — first run. For context, the most recent commit on `main` (`351d8d0`, "fix: SurpriseView blank blurb, /today bundle bloat, Egypt visa gap") attempted to fix client bundle bloat and is the direct subject of Confirmed Bug #1 below — its fix does not actually work.

## Confirmed bugs

### 1. (High impact) "Slim" client data module still ships the full heavy dataset to the browser
`src/data/regions-slim.ts:2,20-27,33-37` imports the full `REGIONS` array from `@/data/regions` (2028 lines, the entire 72-destination dataset including every sight blurb, toolkit phrase set, and event) and computes `REGIONS_SLIM`/`getAllEventsSlim` via `.map()`/`.flatMap()` **at runtime**, not at build time. Because this stripping happens after import, webpack bundles the *entire* heavy `regions.ts` module verbatim into any client bundle that imports `regions-slim.ts` — the runtime `.map()` only drops the fields in memory after the full literal has already been downloaded and executed.

All 9 client components import `regions-slim.ts` directly: `ExploreGrid.tsx:5`, `WhereCanIGoView.tsx:5`, `SurpriseView.tsx:6`, `TodayView.tsx:6`, `FestivalsView.tsx:5`, `WhenToGoView.tsx:5`, `SharedTripView.tsx:7`, `TripPlanner.tsx:6`, `CompareView.tsx:5`.

Verified against the actual production build: `.next/static/chunks/668-4d4e9848d158d82b.js` (116KB raw / **35KB gzip**) is referenced by the `/today`, `/compare`, `/surprise`, `/where-can-i-go`, `/festivals`, `/when-to-go`, and `/planner` route chunks, and contains full sight names (e.g. `"Wat Phra That Doi Suthep"`) and `dailyBudget` literals that the "slim" type is supposed to strip.

This directly contradicts commit `351d8d0`'s message, which claims switching `TodayView` from `@/data/regions` to `@/data/regions-slim` means "the /today route no longer bundles the entire 141KB dataset." The switch only changed *which module re-exports the heavy data* — `regions-slim.ts` is just as heavy as `regions.ts` once bundled, because it doesn't break the import graph.

**Fix shape (not implemented per audit scope):** precompute `REGIONS_SLIM`/the events list at build time (e.g. a script that writes a separate slim JSON/`.ts` literal with no reference to the heavy module), or mark `regions.ts` with `import "server-only"` and have client components receive slim data as props from a Server Component instead of importing a data module directly.

### 2. (Medium impact) Unhandled promise rejection can permanently strand the auth loading state
`src/lib/contexts/auth-context.tsx:38` — `sb.auth.getSession().then(({ data }) => {...})` has no `.catch()`. If Supabase env vars are configured but the network call fails (offline, DNS failure, CORS misconfig), the promise rejects unhandled and `setLoading(false)` never runs. Any UI gated on `AuthProvider`'s `loading` flag is stuck showing a loading state indefinitely with no error surfaced.

### 3. (Low-medium impact) Toggle buttons in ExploreGrid lack accessible state
`src/components/ExploreGrid.tsx:81-93` (style pills), `:98-110` (season filter pills), `:113-122` (the "Good to visit now" toggle), and `:130-142` (grid/map view switcher) are all stateful toggle buttons that convey selected/active state only via background-color change — none set `aria-pressed`. Screen-reader/keyboard users get no programmatic indication of which filter is active. Contrast with `AddToTripButton.tsx:35` and `SiteNav.tsx:73`, which correctly use `aria-pressed`/`aria-expanded` for the same UI pattern — this file is the outlier.

## Data holes

**39 of 72 destinations have no `events` (festivals) data** — `Region.events` is optional and unset for:
`thailand-krabi`, `thailand-kohsamui`, `thailand-huahin`, `thailand-kohphangan`, `thailand-kohtao`, `thailand-phuket`, `vietnam-hoian`, `vietnam-hcmc`, `vietnam-phuquoc`, `philippines-palawan`, `philippines-boracay`, `philippines-bohol`, `philippines-banaue`, `philippines-coron`, `philippines-batanes`, `malaysia-langkawi`, `malaysia-malacca`, `indonesia-gili`, `indonesia-komodo`, `indonesia-nusapenida`, `cambodia-kohrong`, `india-goa`, `maldives-atolls`, `bolivia-uyuni`, `patagonia-elcalafate`, `brazil-amazon-manaus`, `brazil-curitiba`, `chile-atacama`, `ecuador-galapagos`, `albania-riviera`, `turkey-cappadocia`, `morocco-marrakech`, `tanzania-zanzibar`, `south-africa-capetown`, `costa-rica-arenal`, `egypt-cairo`, `mexico-playadelcarmen`, `frenchpolynesia-borabora`, `usa-maui`.

This is mostly the long tail of beach/island/nature add-ons (most of the original flagship city destinations — Bangkok, Chiang Mai, Bali, Hanoi, Siem Reap, Cusco, Rio, etc. — do have events). `FestivalsView.tsx` degrades gracefully (these destinations simply contribute no rows), so this is a content gap, not a crash risk.

## Improvement opportunities

- **Dead code:** `suggestTravelDates()` in `src/lib/season.ts:201-224` has zero call sites anywhere in `src/`. Its JSDoc (line 199) also says it "Defaults to a 5-night stay" but the actual default parameter (line 204) is `nights = 15` — stale even if revived.
- **Stale comment:** `src/lib/report-error.ts:1-2` says the module "Sends events to Sentry's classic store endpoint," but `endpoint()` (lines 8-16) explicitly builds the modern envelope endpoint and even comments "(the legacy /store/ one is deprecated)" — the file header contradicts its own implementation.
- Architecture follow-up to bug #1: once the slim-data bundling is actually fixed, it's worth auditing whether `getAllEventsSlim()` (`regions-slim.ts:33-37`) needs the full per-region `events` array client-side at all, since `FestivalsView` only needs `{event, region: {id,name,country}}` tuples — a precomputed flat list would be both smaller and simpler than re-deriving it from the heavy module on every import.

## Healthy / no action

- `npx tsc --noEmit`: 0 errors.
- `npx vitest run`: 48/48 tests passing across 8 files.
- `npx next build`: compiles cleanly, 94 static pages generated, no warnings.
- Data integrity: 72 regions, no duplicate ids, all have full 12-month climate data, all have ≥2 sights, valid (non-zero, numeric) lat/lng, an existing photo file in `public/photos/`, a `wiki-titles.json` entry, a `toolkits.ts` entry, a `dailyBudget`, and a complete `info` block (no empty sub-fields checked). No empty `climateBlurb` or sight `blurb` strings found.
- `VISA_RULES` in `src/lib/visa.ts` covers every country present in `regions.ts` with zero gaps and zero orphans (the Egypt gap from the prior commit is confirmed fixed).
- No orphaned `toolkits.ts`/`wiki-titles.json`/`photos.json` keys (no entries referencing nonexistent region ids), no unreferenced photo files in `public/photos/`, no two regions sharing the same photo path.
- No client component imports the heavy `@/data/regions` *directly* (the violation is the indirect one via `regions-slim.ts`, see bug #1).
- `regions-slim.ts` correctly keeps `climateBlurb` and `info` while stripping `sights`/`toolkit`/`events` from the *type-level* shape returned (the SurpriseView blank-blurb fix from the prior commit holds) — the only problem is the bundling, not the field selection.
- Graceful degradation is otherwise solid: `/api/weather`, `/api/climate`, `/api/fx`, `/api/tripadvisor` routes and the Supabase helper functions all short-circuit/try-catch cleanly when env vars are absent or fetches fail (the one exception is bug #2).
- No `TODO`/`FIXME`/`XXX` markers anywhere in `src/`.
- Spot-checked components `SeasonBadge`, `DestinationImage`, `WeatherNow`, `PreDepartureChecklist`, `ThemeToggle`, `AddToTripButton`, `SiteNav`, `CurrencyConverter`, `ClimateChart`, `TripadvisorRating` all have correct `alt`/`aria-label`/`aria-pressed`/`aria-expanded` usage and no color-only state indication.
- No off-by-one, race-condition, or timezone bugs found in date-math-heavy code (`season.ts`'s `legDateRanges`/`contiguousRuns`/`monthOf`, `TodayView.tsx`'s day-counting logic, `TripPlanner.tsx`'s sign-in sync effect).
