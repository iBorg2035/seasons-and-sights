# Inline Destination Detail on the Trip Page — Design Spec

**Date:** 2026-07-02
**Status:** Approved (brainstorm complete, pending implementation plan)
**Origin:** User feedback — "the destination page (/regions/[id]) is the most useful page, it has the most info; pull its detail inline into every trip page so the trip page is self-sufficient."

## Problem

The trip page (`/trips/[id]`) stop accordions show only a thin summary per destination
(visa, daily cost, sight count, climate blurb) and link out to `/regions/[id]` for
everything else. The region page is the richest page in the app — climate chart, live
weather, crowds/price strip, full sights list, festivals, packing list, travel toolkit,
booking — but reaching it means leaving the trip you're building, and the trip page can't
answer "what's the weather / what sights / when's it busy / how do I get there" on its own.

## Goals

1. Make the trip page self-sufficient: expanding a stop shows the destination's full
   useful detail inline.
2. Pull existing region-page info in, and add new curated local info (safety advisory,
   getting-there, arrive-prepared cards).
3. Do it without bloating the client bundle — respect the deliberate slim/heavy data split.

## Non-goals

- Not redesigning the region page itself (it stays the deep "Full guide" target; may later
  adopt the new API route, but that's deferred).
- Not a live travel-advisory API feed (curated editorial notes instead, matching app tone).
- Not changing the trip page's overall Route/Stops/Prep/Map structure — only the contents
  of an expanded stop.

---

## 1. The `/api/region-detail` route

A single server endpoint returning the server-only destination data, fetched lazily by the
trip page when a stop is expanded. This dissolves the client/server bundle wall: the trip
page never imports the heavy data modules; it fetches on demand.

### Contract

`GET /api/region-detail?id=<regionId>` →

```ts
{
  sights: Sight[];            // from @/data/sights
  toolkit: TravelToolkit;     // from @/data/toolkits
  events: Event[];             // from @/data/events (this region's)
  advisory: AdvisoryNote;      // curated, see §3
}
```

### Behavior

- Server-side reads the heavy modules (fine on the server), returns JSON.
- `revalidate: 86400` (1 day) — curated/static data, long cache is safe and fast.
- `404` with `{ error: "not found" }` if the id doesn't resolve to a region.
- The region page can later adopt the same route as its single data source (deferred).

---

## 2. What an expanded stop shows (inline)

Tiered by data source. Everything below renders inside the expanded accordion.

### Already client-safe (no fetch — SlimRegion has the data)

- **Crowds/price strip** + **season calendar** — via existing `CrowdStrip` / `SeasonStrip`
  components, from `region.months` (present on SlimRegion). Answers "when's it busy/expensive."
- **Climate chart** — `<ClimateChart lat lng />`, self-fetches `/api/climate`.
- **Live weather** — `<WeatherNow lat lng />`, self-fetches `/api/weather`.
- **Tripadvisor rating** — `<TripadvisorRating destination />`, self-fetches `/api/tripadvisor`.
- **Quick facts** (retained) — visa, daily cost, plug type, climate blurb.

### Fetched from `/api/region-detail` (lazy, on expand)

- **Full sights list** — `<SightsList sights={…} />` (currently only a count shows).
- **Festivals** — the region's `events`, rendered inline.
- **Travel toolkit** — phrases, emergency number, tipping, tap water.

### New curated content (this round)

- **Safety/advisory** — curated one-line per-country note (🟢/🟡/🔴 + short text). New
  `ADVISORY` map keyed by country (35 entries), served via the same route (server-side).
- **Arrive-prepared card** — SIM/eSIM, plug type, 3–4 essential phrases. Re-surfaces
  toolkit data more prominently, plus plug from `info.plugs`.
- **Getting-there** — leg-to-leg transport between consecutive stops: the existing
  `flightHop` (in `transport.ts`) surfaced as "✈️ ~3h flight" or "🚌 overland ~8h" between
  stop N and N+1. For the first stop, a "fly to [hub]" hint from `info.gettingThere` if
  present. No new data source — reuses what exists.

---

## 3. New curated data: advisories

`src/data/advisories.ts` — a `Map`/record keyed by **country** (string), value:

```ts
interface AdvisoryNote {
  level: "low" | "moderate" | "high"; // 🟢 🟡 🔴
  text: string;                       // one concise line, editorial
}
export const ADVISORY: Record<string, AdvisoryNote>;
```

- 35 entries (one per destination country). Hand-written, based on public government
  advisory levels but phrased as editorial guidance (not a live feed).
- Matches the app's curated tone (like `climateBlurb`, `info.visa`).
- Served via `/api/region-detail` so it stays server-side; the trip page fetches it on
  expand. Falls back gracefully to a neutral "check official sources" note if a country is
  missing.
- Responsibility note: surfaced as guidance, not authoritative; the region page's existing
  "Check official requirements" pattern is the model.

---

## 4. UX: layout so it's not a wall

The expanded stop uses **sub-sections with small headings**, not a flat list:

```
[stop header: name · country · season chip · duration · controls]
  Quick facts       → visa · daily cost · plug · safety note
  When to go        → season calendar + crowds/price strip
  Climate           → chart (avg temp/rain, 12mo) + live weather now
  See               → sights list
  Festivals         → this region's events
  Arrive prepared   → SIM/eSIM · plug · phrases · tipping · tap water
  Getting there     → how to reach this stop from the previous one
  [Full guide →]    → links to /regions/[id] for anything deeper
```

- Async bits (climate chart, weather, the `/api/region-detail` payload) show a lightweight
  skeleton (`animate-pulse`) so expand feels instant; content streams in.
- Collapsed stops stay compact (just the header) — zero perf cost until expanded.
- "Full guide →" remains as the escape hatch to the full region page.

---

## 5. Files

### New
| File | Responsibility |
|---|---|
| `src/app/api/region-detail/route.ts` | Combined server endpoint (sights + toolkit + events + advisory) |
| `src/data/advisories.ts` | Curated per-country safety notes (35 entries) |
| `src/components/StopDetail.tsx` | Expanded-stop content; composes the sub-sections |
| `src/components/ArrivePrepared.tsx` | SIM/plugs/phrases card |
| `src/components/GettingThere.tsx` | Leg-to-leg transport line (uses `flightHop`) |
| `src/components/SafetyNote.tsx` | Advisory chip (level dot + text) |

### Modified
| File | Change |
|---|---|
| `src/components/StopsSection.tsx` | Render `<StopDetail>` in the expanded state instead of the current thin inline summary |

### Reused (unchanged)
`ClimateChart`, `WeatherNow`, `SightsList`, `TripadvisorRating`, `SeasonStrip`,
`CrowdStrip`, the `/api/climate|weather|tripadvisor|fx` routes, `transport.ts`'s
`flightHop`.

---

## 6. Build sequence (shippable phases)

1. **API route + data plumbing** — `/api/region-detail` + `advisories.ts` + the lazy-fetch
   hook. Unblocks the rest; independently testable (curl the route).
2. **Client-safe wins** — climate chart, weather, crowds strip, season calendar,
   tripadvisor inline. Biggest visible value, lowest risk.
3. **Fetched detail** — sights list, festivals, toolkit text (wired to the new route).
4. **New curated content** — advisory note, arrive-prepared card, getting-there line.

Each phase ships independently and is verifiable. Tests: a route test for
`/api/region-detail` (well-formed response, 404, cache header), and a unit test for the
advisory lookup/fallback.

---

## 7. Open questions / notes

- **Region page adoption of the route:** deferred. The region page currently imports the
  heavy modules directly (it's a server component, so that's fine). Migrating it to the
  API route is a later cleanup that makes the route the single source of truth.
- **Packing list:** intentionally omitted from this round. Its `packingList()` helper reads
  `region.sights` for beach/wildlife/culture tailoring; with sights now fetchable, a future
  phase could add it. Not now — keeps scope bounded.
- **The save bug:** separate, still open (the console diagnostic). Not blocked by this work.
