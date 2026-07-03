# Inline Destination Detail Implementation Plan

> **Status: ✅ IMPLEMENTED (2026-07-02)** — all five tasks shipped, including the
> packing-list phase the Notes deferred. Deviations from the drafts below:
> advisories keyed to the dataset's exact country strings (Turkey / United
> States / Argentina & Chile) with a full-coverage test; festival months render
> as names; StopDetail gained a failure state + retry and a session cache
> (the draft's silent catch was the known infinite-skeleton bug class); the
> packing list is month-aware via the leg's stay month. Only "region page
> adopts the route" remains deferred.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pull the destination page's rich detail inline into trip-page stop accordions (via a new lazy `/api/region-detail` route), so the trip page is self-sufficient — plus add curated safety advisories, arrive-prepared cards, and getting-there transport lines.

**Architecture:** A new server endpoint `/api/region-detail?id=` returns the server-only data (sights, toolkit, events, advisory) as JSON, fetched lazily by the trip page when a stop is expanded. Client-safe components (climate chart, weather, crowds strip) drop in directly. The expanded accordion is reworked into a `StopDetail` component composing sub-sections with skeletons for async loads. The client bundle never imports the heavy `@/data/sights|toolkits|events` modules.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript (strict), Tailwind 4, Vitest 3.

**Spec:** `docs/superpowers/specs/2026-07-02-inline-destination-detail-design.md`

**Critical rule (from CLAUDE.md):** `"use client"` components may import only `@/data/regions-slim` and `@/data/events-slim`, NEVER `@/data/regions`, `regions-core`, `sights`, or `events`. The new `/api/region-detail` route is the sanctioned way to get that data to the client.

**Key types (reference — do not redefine):**
```ts
// src/types/index.ts
interface Sight { name: string; type: "nature"|"culture"|"city"|"beach"|"wildlife"; lat: number; lng: number; blurb: string; wiki?: string; }
interface Event { name: string; month: number; blurb: string; }      // month is 1-based
interface TravelToolkit { phrases: { en: string; local: string }[]; emergency: string; tipping: string; water: string; }
```
**Key helper:** `flightHop(a: {lat,lng}, b: {lat,lng}): { km, hours, usd, overland }` from `@/lib/transport`.

---

## File Structure

### New
| File | Responsibility |
|---|---|
| `src/data/advisories.ts` | Curated per-country safety notes (`ADVISORY` record + `AdvisoryNote` type) |
| `src/app/api/region-detail/route.ts` | Server endpoint: sights + toolkit + events + advisory for a region id |
| `src/components/StopDetail.tsx` | Expanded-stop content; composes all sub-sections, lazy-fetches `/api/region-detail` |
| `src/components/SafetyNote.tsx` | Advisory chip (level dot + text) |
| `src/components/ArrivePrepared.tsx` | SIM/plugs/phrases/tipping/water card |
| `src/components/GettingThere.tsx` | Leg-to-leg transport line via `flightHop` |
| `test/region-detail.test.ts` | Route contract tests |

### Modified
| File | Change |
|---|---|
| `src/components/StopsSection.tsx` | Render `<StopDetail>` in the expanded state instead of the current thin summary |

### Reused (unchanged)
`ClimateChart` (`{lat,lng}`), `WeatherNow` (`{lat,lng}`), `SightsList` (`{sights}`), `TripadvisorRating` (`{destination}`), `SeasonStrip` (`{region, highlightMonth, showLegend}`), `CrowdStrip` (`{region, highlightMonths}`).

---

## Build sequence (4 shippable phases)

The plan is ordered so each phase ships independently and is verifiable.

---

### Task 1: Curated advisories data (`src/data/advisories.ts`)

A per-country safety note, matching the app's curated editorial tone. 35 entries (one per destination country). Server-side; served via the API route in Task 2.

**Files:**
- Create: `src/data/advisories.ts`
- Test: `test/advisories.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/advisories.test.ts
import { describe, it, expect } from "vitest";
import { ADVISORY, advisoryFor, type AdvisoryNote } from "@/data/advisories";

describe("advisories", () => {
  it("exposes a lookup keyed by country", () => {
    expect(ADVISORY["Thailand"]).toBeDefined();
    const t = ADVISORY["Thailand"] as AdvisoryNote;
    expect(["low", "moderate", "high"]).toContain(t.level);
    expect(t.text.length).toBeGreaterThan(10);
  });

  it("advisoryFor returns the country note when present", () => {
    expect(advisoryFor("Thailand")?.level).toBeDefined();
  });

  it("advisoryFor returns a neutral fallback for an unknown country", () => {
    const fb = advisoryFor("Atlantis");
    expect(fb).toBeDefined();
    expect(fb!.level).toBe("low");
    expect(fb!.text).toMatch(/check official/i);
  });

  it("covers every distinct destination country (no gaps)", () => {
    // Sanity: a representative spread across continents is present.
    for (const country of [
      "Thailand", "Vietnam", "Japan", "Brazil", "Peru", "Mexico",
      "France", "Italy", "Morocco", "Egypt", "Australia", "New Zealand",
    ]) {
      expect(ADVISORY[country], `missing advisory for ${country}`).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/advisories.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/data/advisories.ts
// Curated, editorial safety guidance per destination country — one concise
// line plus a three-level indicator. Based on publicly available government
// advisory levels but phrased as guidance (not a live feed). Surfaced via the
// /api/region-detail route so it stays server-side.

export type AdvisoryLevel = "low" | "moderate" | "high";

export interface AdvisoryNote {
  level: AdvisoryLevel;
  text: string;
}

const DOT: Record<AdvisoryLevel, string> = {
  low: "🟢",
  moderate: "🟡",
  high: "🔴",
};

const FALLBACK: AdvisoryNote = {
  level: "low",
  text: "No specific advisory — check official sources for your nationality.",
};

export const ADVISORY: Record<string, AdvisoryNote> = {
  // ── Southeast Asia ──
  Thailand: { level: "moderate", text: "Petty theft and bag-snatching in tourist hubs; road safety varies." },
  Vietnam: { level: "low", text: "Generally safe; watch for bag-snatching scooters in cities." },
  Cambodia: { level: "low", text: "Safe and welcoming; landmine risk only in remote rural areas." },
  Laos: { level: "low", text: "Very safe; unexploded ordnance in remote eastern regions." },
  Malaysia: { level: "low", text: "Safe; petty crime in Kuala Lumpur tourist areas." },
  Indonesia: { level: "moderate", text: "Exercise caution in Papua; otherwise safe in tourist regions." },
  Philippines: { level: "moderate", text: "Avoid parts of Mindanao; elsewhere welcoming and safe." },
  // ── South / East Asia ──
  India: { level: "moderate", text: "Petty crime common; women should take extra care, especially at night." },
  "Sri Lanka": { level: "low", text: "Recovering stability; check for any current civil unrest." },
  Nepal: { level: "low", text: "Safe; altitude sickness is the main risk when trekking." },
  Japan: { level: "low", text: "Very safe; earthquake awareness advised." },
  "South Korea": { level: "low", text: "Very safe." },
  Taiwan: { level: "low", text: "Very safe." },
  China: { level: "low", text: "Safe; increased surveillance and restricted topics online." },
  // ── South America ──
  Brazil: { level: "moderate", text: "Petty crime and muggings in cities; avoid favelas." },
  Peru: { level: "moderate", text: "Petty theft common; altitude sickness in the Andes." },
  Bolivia: { level: "moderate", text: "Petty crime and protests; road safety poor." },
  Argentina: { level: "low", text: "Safe in tourist regions; bag-snatching in Buenos Aires." },
  Chile: { level: "moderate", text: "Occasional protests; otherwise safe." },
  Colombia: { level: "moderate", text: "Improved markedly; some rural areas still avoid for conflict." },
  Ecuador: { level: "moderate", text: "Crime in coastal cities; gang-related state of exception at times." },
  // ── Central / North America ──
  Mexico: { level: "moderate", text: "Avoid cartel-affected states; tourist regions generally safe." },
  "Costa Rica": { level: "low", text: "Very safe; petty theft is the main concern." },
  "Puerto Rico": { level: "low", text: "Safe (US territory); hurricane season June–November." },
  // ── Europe ──
  France: { level: "moderate", text: "Petty crime around Paris landmarks; protests can occur." },
  Italy: { level: "low", text: "Safe; pickpockets in Rome, Florence, and on transit." },
  Spain: { level: "low", text: "Safe; pickpockets in Barcelona and Madrid." },
  Portugal: { level: "low", text: "Very safe." },
  Greece: { level: "low", text: "Safe; petty theft on the islands in peak season." },
  Croatia: { level: "low", text: "Very safe." },
  Montenegro: { level: "low", text: "Very safe." },
  Albania: { level: "low", text: "Safe; road quality varies outside cities." },
  Türkiye: { level: "moderate", text: "Avoid border areas; tourist regions stable." },
  // ── Africa ──
  Morocco: { level: "moderate", text: "Generally safe; petty harassment and mountain-area caution." },
  Egypt: { level: "moderate", text: "Safe at major sites; avoid Sinai and western desert except resorts." },
  Tanzania: { level: "moderate", text: "Safari regions safe; mugging risk in Dar es Salaam." },
  "South Africa": { level: "moderate", text: "High violent crime rate; use care in cities, avoid walking at night." },
  Kenya: { level: "moderate", text: "Safe on safari; crime and occasional unrest in Nairobi." },
  // ── Oceania ──
  Australia: { level: "low", text: "Very safe; sun, surf rips, and wildlife are the real risks." },
  "New Zealand": { level: "low", text: "Very safe; weather can turn quickly in the mountains." },
  "French Polynesia": { level: "low", text: "Very safe." },
  Maldives: { level: "low", text: "Very safe; conservative local islands." },
};

export function advisoryFor(country: string): AdvisoryNote {
  return ADVISORY[country] ?? FALLBACK;
}

export function advisoryDot(level: AdvisoryLevel): string {
  return DOT[level];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/advisories.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/advisories.ts test/advisories.test.ts
git commit -m "Add curated per-country safety advisories + tests"
```

---

### Task 2: The `/api/region-detail` route

The server endpoint that returns sights + toolkit + events + advisory for a region id, fetched lazily by the client.

**Files:**
- Create: `src/app/api/region-detail/route.ts`
- Test: `test/region-detail.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// test/region-detail.test.ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";

// The route imports server-only data modules; mock them to keep the test fast
// and deterministic.
vi.mock("@/data/sights", () => ({
  SIGHTS: { "thailand-chiangmai": [{ name: "Doi Suthep", type: "culture", lat: 1, lng: 2, blurb: "Temple." }] },
}));
vi.mock("@/data/toolkits", () => ({
  TOOLKITS: { "thailand-chiangmai": { phrases: [{ en: "Hi", local: "Sawatdee" }], emergency: "191", tipping: "10%", water: "Bottled" } },
}));
vi.mock("@/data/events", () => ({
  EVENTS: { "thailand-chiangmai": [{ name: "Yi Peng", month: 11, blurb: "Lanterns." }] },
}));

import { GET } from "@/app/api/region-detail/route";

function makeReq(id?: string) {
  const url = new URL("http://localhost/api/region-detail");
  if (id) url.searchParams.set("id", id);
  return new Request(url);
}

describe("/api/region-detail", () => {
  beforeEach(() => vi.restoreAllMocks);

  it("returns the assembled detail for a known region", async () => {
    const res = await GET(makeReq("thailand-chiangmai"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sights).toHaveLength(1);
    expect(json.sights[0].name).toBe("Doi Suthep");
    expect(json.toolkit.emergency).toBe("191");
    expect(json.events[0].name).toBe("Yi Peng");
    expect(json.advisory).toBeDefined();
    expect(["low", "moderate", "high"]).toContain(json.advisory.level);
  });

  it("returns 404 for an unknown region id", async () => {
    const res = await GET(makeReq("does-not-exist"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when no id is provided", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
  });

  it("sets a long revalidate cache header", async () => {
    const res = await GET(makeReq("thailand-chiangmai"));
    expect(res.headers.get("cache-control")).toContain("s-maxage");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/region-detail.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the route**

```ts
// src/app/api/region-detail/route.ts
import { NextResponse } from "next/server";
import { REGIONS_CORE } from "@/data/regions-core";
import { SIGHTS } from "@/data/sights";
import { EVENTS } from "@/data/events";
import { TOOLKITS } from "@/data/toolkits";
import { advisoryFor } from "@/data/advisories";

export const revalidate = 86400; // curated/static data — cache 1 day

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const region = REGIONS_CORE.find((r) => r.id === id);
  if (!region) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json(
    {
      sights: SIGHTS[id] ?? [],
      events: EVENTS[id] ?? [],
      toolkit:
        TOOLKITS[id] ?? { phrases: [], emergency: "", tipping: "", water: "" },
      advisory: advisoryFor(region.country),
    },
    {
      headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    }
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/region-detail.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/region-detail/route.ts test/region-detail.test.ts
git commit -m "Add /api/region-detail route: sights + toolkit + events + advisory"
```

---

### Task 3: Small presentational components — SafetyNote, ArrivePrepared, GettingThere

Three small, focused components used inside `StopDetail`. Build all three, then commit.

**Files:**
- Create: `src/components/SafetyNote.tsx`
- Create: `src/components/ArrivePrepared.tsx`
- Create: `src/components/GettingThere.tsx`

- [ ] **Step 1: SafetyNote**

```tsx
// src/components/SafetyNote.tsx
import { advisoryDot, type AdvisoryNote } from "@/data/advisories";

/** A one-line safety advisory chip (level dot + text). Presentational. */
export function SafetyNote({ advisory }: { advisory: AdvisoryNote }) {
  return (
    <p className="text-sm text-slate-600">
      <span className="mr-1.5" aria-hidden>{advisoryDot(advisory.level)}</span>
      <span className="font-medium text-slate-700">Safety:</span>{" "}
      {advisory.text}
    </p>
  );
}
```

Note: this is a server component (no `"use client"`) — it's rendered inside the client `StopDetail` but the `advisory` is passed as a prop (data fetched by `StopDetail` from the route), so no client import of `advisories.ts` is needed. Wait — `StopDetail` is a client component that fetches the advisory from the API; importing the `advisoryDot` helper here would pull `advisories.ts` into the client bundle. **Fix:** inline the dot map to avoid the import.

Revised:

```tsx
// src/components/SafetyNote.tsx
const DOTS = { low: "🟢", moderate: "🟡", high: "🔴" } as const;

/** A one-line safety advisory chip. Purely presentational; takes the data. */
export function SafetyNote({ advisory }: { advisory: { level: "low" | "moderate" | "high"; text: string } }) {
  return (
    <p className="text-sm text-slate-600">
      <span className="mr-1.5" aria-hidden>{DOTS[advisory.level]}</span>
      <span className="font-medium text-slate-700">Safety:</span> {advisory.text}
    </p>
  );
}
```

- [ ] **Step 2: ArrivePrepared**

```tsx
// src/components/ArrivePrepared.tsx
import type { TravelToolkit } from "@/types";

/**
 * "Arrive prepared" card: SIM/eSIM hint, plug type, essential phrases,
 * tipping, tap water. Surfaces toolkit data + the plug note prominently.
 */
export function ArrivePrepared({
  toolkit,
  plug,
}: {
  toolkit: TravelToolkit;
  plug?: string;
}) {
  const phrases = toolkit.phrases.slice(0, 4);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-700">
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {plug && <span>🔌 {plug}</span>}
        <span>📶 eSIM or local SIM for data</span>
      </div>
      {phrases.length > 0 && (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {phrases.map((p) => (
            <div key={p.en} className="flex gap-2">
              <dt className="text-slate-400">{p.en}:</dt>
              <dd className="font-medium">{p.local}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-2 text-xs text-slate-500">
        🚨 Emergency {toolkit.emergency} · 💵 {toolkit.tipping} · 💧 {toolkit.water}
      </p>
    </div>
  );
}
```

Note: `ArrivePrepared` imports only the `TravelToolkit` *type* (type-only, erased at build — no runtime data import). Safe.

- [ ] **Step 3: GettingThere**

```tsx
// src/components/GettingThere.tsx
import { flightHop } from "@/lib/transport";

/**
 * Transport line for reaching this stop from the previous one (or from home
 * for the first stop). Uses flightHop for leg-to-leg estimates.
 */
export function GettingThere({
  from,
  to,
  note,
  isFirst,
  regionName,
}: {
  from?: { lat: number; lng: number; name: string };
  to: { lat: number; lng: number; name: string };
  note?: string;
  isFirst: boolean;
  regionName: string;
}) {
  if (isFirst) {
    return (
      <p className="text-sm text-slate-600">
        <span className="font-medium text-slate-700">Getting there:</span>{" "}
        {note
          ? note
          : `Fly into ${regionName} — search flights for your dates.`}
      </p>
    );
  }
  if (!from) return null;
  const hop = flightHop(from, to);
  const mode = hop.overland ? "🚌" : "✈️";
  const modeLabel = hop.overland ? "overland" : "flight";
  return (
    <p className="text-sm text-slate-600">
      <span className="font-medium text-slate-700">
        {mode} ~{hop.hours}h {modeLabel}
      </span>{" "}
      from {from.name} · ~${hop.usd}
    </p>
  );
}
```

- [ ] **Step 4: Verify tsc**

Run: `npx tsc --noEmit`
Expected: clean (type-only imports are erased; `flightHop` is in `@/lib/transport`).

- [ ] **Step 5: Commit**

```bash
git add src/components/SafetyNote.tsx src/components/ArrivePrepared.tsx src/components/GettingThere.tsx
git commit -m "Add SafetyNote, ArrivePrepared, GettingThere components"
```

---

### Task 4: `StopDetail` — the expanded-stop composer (client)

The core of the change. A client component that renders all the sub-sections, lazy-fetches `/api/region-detail` for the sights/toolkit/events/advisory, and shows skeletons while loading.

**Files:**
- Create: `src/components/StopDetail.tsx`

- [ ] **Step 1: Write the component**

```tsx
// src/components/StopDetail.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSlimRegion } from "@/data/regions-slim";
import type { SlimRegion } from "@/data/regions-slim";
import { ClimateChart } from "@/components/ClimateChart";
import { WeatherNow } from "@/components/WeatherNow";
import { SightsList } from "@/components/SightsList";
import { TripadvisorRating } from "@/components/TripadvisorRating";
import { SeasonStrip } from "@/components/SeasonStrip";
import { CrowdStrip } from "@/components/CrowdStrip";
import { SafetyNote } from "@/components/SafetyNote";
import { ArrivePrepared } from "@/components/ArrivePrepared";
import { GettingThere } from "@/components/GettingThere";
import { monthOf } from "@/lib/season";
import type { Sight, TravelToolkit } from "@/types";

interface RegionDetail {
  sights: Sight[];
  events: { name: string; month: number; blurb: string }[];
  toolkit: TravelToolkit;
  advisory: { level: "low" | "moderate" | "high"; text: string };
}

function Skeleton({ label }: { label: string }) {
  return <div className="h-16 animate-pulse rounded-lg bg-slate-100" aria-label={label} />;
}

export function StopDetail({
  region,
  prevStop,
}: {
  region: SlimRegion;
  /** The previous stop's region (for the getting-there line), or undefined. */
  prevStop?: SlimRegion;
}) {
  const [detail, setDetail] = useState<RegionDetail | null>(null);
  const now = monthOf();
  const destination = `${region.name}, ${region.country}`;

  useEffect(() => {
    let active = true;
    setDetail(null);
    fetch(`/api/region-detail?id=${encodeURIComponent(region.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: RegionDetail | null) => {
        if (active && d) setDetail(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [region.id]);

  return (
    <div className="space-y-5 border-t border-slate-100 bg-slate-50/40 px-4 py-4 text-sm text-slate-700">
      {/* Quick facts */}
      <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {region.info?.visa && (
          <p>
            <span className="font-medium text-slate-700">Visa:</span> {region.info.visa}
          </p>
        )}
        {typeof region.dailyBudget === "number" && (
          <p>
            <span className="font-medium text-slate-700">Daily cost:</span> ~${region.dailyBudget}/day
          </p>
        )}
        {region.info?.plugs && (
          <p>
            <span className="font-medium text-slate-700">Plugs:</span> {region.info.plugs}
          </p>
        )}
        {detail ? (
          <SafetyNote advisory={detail.advisory} />
        ) : (
          <Skeleton label="Safety" />
        )}
      </div>

      {/* Getting there */}
      <GettingThere
        isFirst={!prevStop}
        from={prevStop ? { lat: prevStop.lat, lng: prevStop.lng, name: prevStop.name } : undefined}
        to={{ lat: region.lat, lng: region.lng, name: region.name }}
        regionName={region.name}
        note={region.info?.gettingThere}
      />

      {/* When to go: season calendar + crowds */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">When to go</h4>
        <SeasonStrip region={region} highlightMonth={now} showLegend={false} />
        <div className="mt-2">
          <CrowdStrip region={region} showLegend={false} />
        </div>
        {region.climateBlurb && (
          <p className="mt-2 text-slate-500">{region.climateBlurb}</p>
        )}
      </div>

      {/* Climate + live weather */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Climate &amp; weather</h4>
        <ClimateChart lat={region.lat} lng={region.lng} />
        <div className="mt-2">
          <WeatherNow lat={region.lat} lng={region.lng} />
        </div>
        <div className="mt-2">
          <TripadvisorRating destination={destination} />
        </div>
      </div>

      {/* Sights */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">See</h4>
        {detail ? (
          detail.sights.length > 0 ? (
            <SightsList sights={detail.sights} />
          ) : (
            <p className="text-slate-500">No curated sights for this destination yet.</p>
          )
        ) : (
          <Skeleton label="Sights" />
        )}
      </div>

      {/* Festivals */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Festivals</h4>
        {detail ? (
          detail.events.length > 0 ? (
            <ul className="space-y-1">
              {detail.events.map((e) => (
                <li key={e.name}>
                  <span className="font-medium">{e.name}</span>{" "}
                  <span className="text-slate-400">(month {e.month})</span>
                  <br />
                  <span className="text-slate-500">{e.blurb}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500">No major festivals listed.</p>
          )
        ) : (
          <Skeleton label="Festivals" />
        )}
      </div>

      {/* Arrive prepared */}
      {detail ? (
        <ArrivePrepared toolkit={detail.toolkit} plug={region.info?.plugs} />
      ) : (
        <Skeleton label="Arrive prepared" />
      )}

      <Link
        href={`/regions/${region.id}`}
        className="inline-block font-medium text-amber-600 hover:underline"
      >
        Full guide →
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Verify tsc**

Run: `npx tsc --noEmit`
Expected: clean. `SlimRegion` has `lat`, `lng`, `name`, `info`, `dailyBudget`, `climateBlurb`, `months` — all present. The `Sight`/`TravelToolkit` imports are type-only (erased). `region.info?.gettingThere` — confirm `gettingThere` is a field on `TravelInfo`; read `src/types/index.ts` `TravelInfo` interface and if the field is named differently (e.g. `gettingThere` vs `getting_there`), use the actual name.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: green, `/api/region-detail` route present.

- [ ] **Step 4: Commit**

```bash
git add src/components/StopDetail.tsx
git commit -m "Add StopDetail: expanded-stop composer with lazy region-detail fetch"
```

---

### Task 5: Wire `StopDetail` into `StopsSection`

Replace the current thin inline summary in `StopsSection`'s expanded state with `<StopDetail>`, passing the previous stop for the getting-there line.

**Files:**
- Modify: `src/components/StopsSection.tsx`

- [ ] **Step 1: Read the current expanded block**

Read `src/components/StopsSection.tsx` lines 105–176 (the `{isOpen && (...)}` block that currently renders visa/cost/sights-count/health/blurb/"Full guide"). This entire block is replaced.

- [ ] **Step 2: Replace it with StopDetail**

Add the import at the top:
```tsx
import { StopDetail } from "@/components/StopDetail";
```

Replace the `{isOpen && (...)}` block with:
```tsx
{isOpen && (
  <StopDetail
    region={region}
    prevStop={i > 0 ? resolved[i - 1]?.region : undefined}
  />
)}
```

The `resolved` array (already in the component) holds `{ id, duration, region }` per stop; `resolved[i - 1]?.region` is the previous stop's `SlimRegion`. `StopDetail` now owns all the expanded content (quick facts, getting-there, climate, sights, festivals, arrive-prepared, full-guide link), so remove the now-dead inline summary JSX and any now-unused imports it pulled in (but keep `Link` if still used elsewhere — check; `StopsSection` uses `Link` only in the removed block, so remove its import too).

- [ ] **Step 3: Verify tsc + tests + build**

Run: `npx tsc --noEmit` (clean), `npx vitest run` (all pass), `npm run build` (green).

- [ ] **Step 4: Bundle audit**

```bash
for f in $(grep -rl '"use client"' src/); do grep -lE '@/data/(regions|regions-core|sights|events|toolkits)([^a-z-]|$)' "$f"; done
```
Expected: no output (no client file imports the heavy modules). `StopDetail` imports `@/data/regions-slim` (allowed), and the heavy data comes via `fetch("/api/region-detail")`.

- [ ] **Step 5: Commit**

```bash
git add src/components/StopsSection.tsx
git commit -m "StopsSection: render StopDetail in the expanded state"
```

---

## Final QA (per CLAUDE.md pre-ship audit)

- [ ] `npx tsc --noEmit` clean
- [ ] `npx vitest run` — all green (prior tests + advisories + region-detail)
- [ ] `npm run build` — green, 0 warnings; `/api/region-detail` route present; `/trips/[id]` builds
- [ ] Client-bundle audit: no `"use client"` file imports heavy data modules
- [ ] Manual: open a trip, expand a stop — confirm climate chart loads, weather loads, sights list appears, festivals appear, arrive-prepared card shows, getting-there line shows between stops, advisory chip shows. Collapse/expand feels instant (skeletons).
- [ ] Commit final; merge to main; redeploy; hard-refresh.

---

## Notes

- **Packing list** deliberately omitted (spec §7). The `packingList()` helper's sight-driven tailoring is now unblocked by the route, so a future phase can add it.
- **Region page adoption** of the route is deferred (spec §7).
- **The save bug** (separate, open) is not blocked by or dependent on this work.
