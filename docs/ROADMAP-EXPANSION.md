# Expansion roadmap — Google stack, integrations, journaling, mobile

Scoping doc for four requested areas. Written 2026-07-25 against `main`.
Nothing here is built yet. Read the "Blocking prerequisite" section first —
it changes the order of everything else.

---

## TL;DR

| # | Work | Effort | Do it? |
|---|------|--------|--------|
| 0 | **Real dates on trips** (prerequisite) | M | **Yes — first, blocks most of the rest** |
| 1 | Google Sign-In | S | Yes — cheapest real win |
| 2 | Calendar export via `.ics` | XS | Yes — ~80% already written and unused |
| 3 | Journaling: diary + expenses | M | Yes |
| 4 | Journaling: photos | L | Yes, but it's the biggest single lift here |
| 5 | Translation | S | Yes (deep-link tier) |
| 6 | Social sharing | S–M | Yes, but not the version you're picturing |
| 7 | Mobile (PWA → store apps) | M–XL | Yes — but pick a tier deliberately |
| 8 | Flight status tracking | M | Defer until #0 + real booking data exist |
| 9 | Gmail booking import | XL | **Defer** — Google restricted-scope audit |
| 10 | Payments | XL | **Recommend against** — see below |

---

## Blocking prerequisite: trips have no real dates

This is the single most important finding, and it wasn't obvious from outside
the code.

Today a trip is:

```ts
interface SavedTripLite {
  start: number;              // 1–12 = month, 0 = "flexible"
  stops: [string, number][];  // [regionId, durationMonths] — 1, 2, or 3
}
```

There is **no real date anywhere in the model**. `legDateRanges()` *derives*
display dates by anchoring to the *next occurrence* of `start` month and
walking whole months forward. That's genuinely elegant for the app's original
job ("is this the right season?") — season fit is a month-granularity
question, so month-granularity data was the right call.

But almost everything now requested is **day-granularity and real-world**:

| Requested feature | Needs | Works on today's model? |
|---|---|---|
| Calendar export | Actual travel dates | Exports a *guess*, not your trip |
| Daily journal | A specific day to attach an entry to | No concept of a day |
| Expense log | A date per expense | Same |
| Gmail import | Exact booked dates/times | Would discard the real dates it parses |
| Flight tracking | Flight number + date | Neither exists |

Exporting "Bangkok, Jul 1 – Aug 31" into someone's real Google Calendar when
they never booked those dates is worse than not exporting — it puts fiction in
the place people trust for facts.

**So: Phase 0 is adding real dates.** Concretely:

- Extend each stop with optional real `startDate`/`endDate` (ISO strings).
- Keep the existing month/duration model as the fallback for un-dated,
  still-being-planned trips — the "flexible start" mode is a genuinely good
  feature and shouldn't be lost.
- A trip becomes "planned" (derived months) or "booked" (real dates); the UI
  should make which one you're looking at obvious.
- Season logic keeps working unchanged — real dates map to months for lookup.
- Migration: existing trips keep working with derived dates (same as today),
  so this stays backward-compatible.

This is a medium lift touching `saved-trips.ts`, `season.ts`, `trip-health.ts`,
the Supabase `trips.data` JSON shape, and the sync path — i.e. exactly the
"shared infra / multi-entity state" category that this repo's own norms
(`AGENTS.md`) say gets a high-effort review and regression tests. Budget
accordingly.

---

## 1. Google Sign-In — small, do it early

Supabase Auth has a first-class Google provider, so this is mostly config, not
code: enable the provider, add a `signInWithOAuth` call beside the existing
email/password form, add an OAuth callback route.

- Independent of Phase 0 — can ship anytime.
- Uses only the basic `email`/`profile` scopes: **no** Google verification
  review needed (that's the restricted-scope trap, see #9).
- Existing accounts: worth deciding whether same-email Google and password
  accounts merge or stay separate. Supabase can link identities; needs a
  deliberate choice, not a default.

## 2. Calendar export — ~80% already written, currently dead code

`src/lib/ics.ts` already exists, builds a valid all-day iCalendar document, and
has a passing test — **and has zero callers.** It was built and never wired up.

Two tiers:

- **Tier A — `.ics` download (XS).** Wire the existing lib to a button. Works
  with Google Calendar, Apple Calendar, and Outlook, needs no OAuth, no API
  quota, no verification. Do this one.
- **Tier B — Google Calendar API write (M).** Real two-way sync, events that
  update when the trip changes. Requires OAuth with `calendar.events` scope —
  a *sensitive* scope (verification required, but far lighter than restricted).
  Only worth it if people actually want live-updating trips in their calendar.

Recommendation: Tier A immediately after Phase 0. Revisit Tier B based on
whether anyone asks.

## 3–4. Journaling

Splits cleanly into three sub-features of very different cost.

**Diary + expense log (M, together).** Both are "rows attached to a trip and a
date":

- New Supabase tables (`journal_entries`, `expenses`) with RLS matching the
  existing `trips` pattern.
- localStorage mirror so it stays offline-first like everything else — this is
  the app's core promise and the reason it works on a plane. Non-negotiable.
- Per-entity storage scoping is a **hard requirement** here: this repo already
  shipped a cross-trip data leak from a bare global `localStorage` key (the
  checklist bug), and journal entries are exactly the same shape of risk, with
  more personal content. Keys must include the trip id, and the
  do-X-on-A/switch-to-B/assert-clean journey from `docs/QA-JOURNEYS.md` is
  mandatory here.

Nice synergy worth calling out: the expense log pairs directly with the
estimated-budget tracker shipped this cycle. "Estimated $3,000 / actually spent
$2,140" is a better feature than either half alone — and the estimator's
curated `dailyBudget` figures get a real-world accuracy check for free.

**Photo journal (L) — the big one.** The app has *no file-upload infrastructure
at all* today; destination photos are static files in `public/photos/`
committed to the repo. A photo journal needs, from scratch:

- Supabase Storage bucket + RLS policies (a different permission system than
  table RLS — new surface area, worth reviewing carefully).
- Client-side image resize/compress before upload (phone photos are 3–12 MB;
  uploading raw over hotel wifi is a bad experience).
- Storage quota thinking — Supabase free tier is 1 GB. ~50 photos/trip at 1 MB
  is ~20 trips before it's a real cost decision. Worth deciding the policy
  *before* building, not after someone fills it.
- Offline-first gets genuinely hard here: text entries queue trivially, but
  queuing large binaries offline and syncing later is real work. An honest v1
  might be "photos need connectivity, text doesn't."

Recommendation: ship diary + expenses first, photos as a separate follow-on.

## 5–6. Integrations worth doing

**Translation (S).** Two tiers again: deep-linking to Google Translate with the
phrase pre-filled is free and instant; the Cloud Translation API is
pay-per-character and needs a key. The app already ships a curated phrasebook
per destination, so the marginal value is "translate arbitrary text I typed,"
which the deep-link covers fine. Start there.

**Social sharing (S–M) — but not as pictured.** Worth being direct: **you
cannot programmatically post to an Instagram feed from a web app.** There's no
public API for it; content publishing is limited to Business/Creator accounts
through the Graph API with real restrictions, and it does not cover "share this
trip card to my personal story."

What actually works, and is genuinely nice:

- Generate a good-looking trip summary image (Next.js already has
  `opengraph-image` support, and the app already generates one).
- `navigator.share()` (Web Share API) hands that image + link to the OS share
  sheet — from which the user picks Instagram/WhatsApp/Messages themselves.

Same end result, one extra tap, no API partnership required. The existing
public `/trip/[token]` share links already do the link half.

**Flight status tracking (M) — defer.** Needs a paid API (AeroDataBox,
FlightAware et al), and more importantly needs a *flight number and date* that
the app has no way to know yet. Blocked on Phase 0 plus some way of entering
booking details. Right idea, wrong time — revisit after #0 and #3.

## 7. Mobile: web → iOS/Android

The app is **already a PWA** with a hand-rolled service worker, and offline
coverage is better than you'd expect: a prior audit confirmed all the
same-origin API data (region detail, climate, weather, FX) and self-hosted
photos are cached, so a visited trip genuinely works offline. The one real gap
is map tiles (third-party origin, deliberately not cached).

Three tiers, pick deliberately:

| Tier | What | Effort | Catch |
|---|---|---|---|
| **A. Better PWA** | Install prompt, offline polish, cache map tiles | S | No app store presence |
| **B. Capacitor wrapper** | Ship the web app in a native shell | M | **App Store rejection risk** |
| **C. React Native / Expo** | Real native app | XL | UI rewritten from scratch |

On Tier B, the thing worth knowing up front: Apple's App Store guideline 4.2
("Minimum Functionality") explicitly targets apps that are repackaged websites.
A Capacitor shell that just loads the hosted Next.js app is a real rejection
risk unless it adds genuine native capability — push notifications, camera
integration for the photo journal, offline storage. Notably, the journaling
features above would *supply* exactly that justification. Sequencing matters.

On Tier C, the good news from the code: `src/lib/` is **pure portable
TypeScript** — `season.ts`, `trip-health.ts`, `packing.ts`, `saved-trips.ts`,
`checklist.ts` and the curated datasets have no DOM dependencies and would move
to React Native essentially unchanged. That's the genuinely valuable, hard-won
half. The rewrite cost is the UI layer (~35 components) and swapping Leaflet
for a native map. Roughly: logic and data port, presentation doesn't.

Recommendation: Tier A now (cheap, immediate), Tier B once journaling gives it
native justification, Tier C only if mobile becomes the primary surface.

---

## What I'd push back on

**Payments (#10) — recommend against.** Two independent reasons:

1. **It cannibalizes the current business model.** The app monetizes through
   Booking.com affiliate deep-links. Taking payment in-app means *becoming* the
   merchant — and losing the affiliate commission that currently costs nothing
   to earn.
2. **The regulatory lift is enormous and permanent.** Merchant of record, PCI
   scope, refunds and chargebacks, customer support for failed bookings, and in
   most jurisdictions travel-seller licensing/bonding requirements. This is a
   company, not a feature.

The current model — send qualified traffic to Booking.com, earn commission,
carry zero liability — is genuinely the right architecture for this app. I'd
keep it.

**Gmail booking import (#9) — defer, and know the real blocker.** The
compelling version (parse confirmation emails → auto-fill trip) needs
`gmail.readonly`, which Google classifies as a **restricted scope**. That means
a CASA third-party security assessment: real money, weeks of turnaround, and
*annual* recurrence. That cost is hard to justify pre-revenue.

Cheaper paths to ~most of the value:
- **Forwarding address** — user forwards confirmations to a parsing endpoint.
  No Google review at all, works with any mail provider.
- **Paste / screenshot upload** — user pastes the confirmation text.

Both sidestep the audit entirely and neither requires trusting the app with a
whole inbox — which some people reasonably won't do regardless of what the
audit says.

---

## Suggested order

1. **Phase 0 — real dates** (unblocks 2, 3, 8, 9)
2. **Google Sign-In** (parallel, independent)
3. **`.ics` calendar export** (tiny, mostly wiring existing code)
4. **Journal: diary + expenses** (pairs with the budget tracker)
5. **Translation deep-link + share-image/Web Share** (both small)
6. **PWA polish (mobile Tier A)**
7. **Photo journal** (Supabase Storage — biggest single lift)
8. **Capacitor wrapper** (mobile Tier B — now justified by camera/push)
9. Revisit flight tracking; revisit Gmail via forwarding address

Steps 1, 4, and 7 all touch per-entity state and shared sync infrastructure —
the categories this repo's own norms flag for high-effort review and mandatory
regression tests. The other steps are comparatively contained.
