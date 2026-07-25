# Seasons & Sights — AI + product roadmap

**Date:** 2026-07-20  
**Scope:** Audit of open designs vs shipped code, plus next steps after the Grok assistant scaffold.

---

## 1. What shipped in this pass (1 → 2)

| Item | Status |
|------|--------|
| Streaming Grok chat via SpaceXAI (`XAI_API_KEY`, model `grok-4.5`) | Done — `/api/assistant` |
| Full-page assistant | Done — `/assistant` (nav: **Assistant**) |
| Trip co-pilot panel | Done — embedded on `/trips/[id]` with trip context |
| Tools over curated data | Done — search, destination detail, packing, visa, trip health, route plan, live weather |
| Tests | Done — `test/assistant-tools.test.ts` (pure tool layer) |
| Env docs | Done — `.env.example`, README |

**Not yet (assistant):**

- Mutating trips from chat (add stop / reorder / rename) — assistant only advises; user applies in UI
- Conversation persistence / history across reloads
- Streaming tool result cards as rich UI (links, cards) — text + tool chips only
- Rate limiting / abuse protection on `/api/assistant`
- Optional xAI web search for advisories beyond curated data

---

## 2. Design specs vs codebase

### 2.1 Unified trip management (`docs/superpowers/specs/2026-07-02-unified-trip-management-design.md`)

| Design goal | Assessment |
|-------------|------------|
| Single place to build a trip A→Z | **Shipped** — `/trips` list + `/trips/[id]` (Route / Stops / Prep / Map) |
| Kill anonymous draft; named trips only | **Shipped** — `saved-trips` + `active-trip`; migrate flag in `trip-migrate.ts` |
| Active trip pointer | **Shipped** — `src/lib/active-trip.ts` |
| Share + invite co-editor | **Shipped** — `ShareTripButton`, `InviteEditorDialog` |
| Cloud sync visible / not silent | **Mostly shipped** — `SyncBadge`, `/debug-sync`; still depends on Supabase env + schema |
| Legacy redirects | **Shipped** — `/planner`, `/today` → active trip |

**Residual risk:** Sync failures still need UX polish for first-time Supabase setup (env missing vs empty remote).

### 2.2 Inline destination detail (`docs/superpowers/specs/2026-07-02-inline-destination-detail-design.md`)

| Design goal | Assessment |
|-------------|------------|
| `/api/region-detail` lazy fetch | **Shipped** — route exists |
| Expand stop → rich detail on trip page | **Shipped** — `StopDetail` + related cards (safety, getting-there, weather, etc.) |
| Keep client off heavy `@/data/regions` | **Shipped** — AGENTS.md rule + slim modules |
| Region page adopts same API | **Deferred** (spec non-goal / later) |

### 2.3 Older baseline (`reports/reassessment-2026-06-29.md`)

| Item | Assessment |
|------|------------|
| 72 destinations, data integrity | Still the model; no AI change to data layer |
| 4 festival-light destinations | Still optional polish |
| Heavy First Load on trip page | Still true (`/trips/[id]` ~216 kB FL); co-pilot adds ~AI SDK client weight — watch budget |

---

## 3. Product gaps (non-AI)

Prioritized backlog outside the new assistant:

1. **Apply assistant suggestions to trip** — “Add these stops” action that writes via `updateTrip` (needs confirmation UX + entity-scoped state).
2. **Trip page JS weight** — lazy-load map and co-pilot chat chunk.
3. **Festival gaps** — 4 beach destinations without events; “no major festivals” empty state.
4. **Supabase onboarding** — clearer empty/error states when URL/key missing or schema not applied.
5. **Booking depth** — still deep-links only (by design); partner APIs optional later.

---

## 4. AI roadmap (recommended order)

### P0 — Make the co-pilot useful day one

1. Set `XAI_API_KEY` in `.env.local` and Vercel.
2. Manual QA journeys: empty trip, multi-stop wet-season trip, packing + visa questions.
3. Confirm graceful 503 UI when key missing (already returned by API).

### P1 — Close the loop with the trip store

1. Tool or client action: **proposeStops** → user confirms → `updateTrip`.
2. Tool: **setStartMonth** / reorder with confirmation.
3. Regression tests for multi-trip isolation (AGENTS.md QA journeys).

### P2 — Richer answers

1. Render tool results as destination chips linking to `/regions/[id]`.
2. Optional `web_search` (xAI built-in) for time-sensitive advisories — always labeled vs curated data.
3. Persist last N messages per trip in `localStorage` (key includes trip id).

### P3 — Scale / productize

1. Rate limit per IP / user.
2. Usage analytics (which tools fire).
3. Optional “Surprise me” and “Where can I go” natural-language entry points that deep-link into existing pages with prefilled params.

---

## 5. Architecture notes for maintainers

```
Client  AssistantChat / TripCopilot
   │  POST /api/assistant  { messages, tripContext }
   ▼
streamText(xai.responses(grok-4.5))
   + tools → src/lib/assistant/tools-data.ts
              (REGIONS, packing, visa, planItinerary, assessTripHealth, Open-Meteo)
```

- **Server-only:** `src/lib/assistant/*` tools import full `REGIONS` — do not import from client components.
- **Trip context** is a snapshot from the client; the model cannot see `localStorage` directly.
- **Default model:** `grok-4.5`; override with `XAI_MODEL`.

---

## 6. Commands

```bash
npm run dev          # http://localhost:3000/assistant
npx vitest run       # includes assistant-tools
npx tsc --noEmit
npm run build
```
