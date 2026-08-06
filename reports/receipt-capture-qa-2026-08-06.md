# Receipt capture — live QA, 2026-08-06

Closes the QA the stage 3 commit (`1e7b5af`) recorded as outstanding. Run
against a **production build** (`next start`), service worker unregistered and
caches cleared first, IndexedDB wiped before the run.

## Why this needed a real browser

`fake-indexeddb` cannot round-trip a jsdom `Blob` — it goes in as a Blob and
comes back as `{}`. The unit tests therefore assert the `blob` key's presence
and absence, never its bytes. Everything below is the part those tests
structurally could not cover.

## Results

| Check | Result |
|---|---|
| Offline capture holds a **real** Blob in real IndexedDB | ✅ 195,309 bytes, `instanceof Blob` |
| Compression before hold | ✅ 211,962 → 195,309 bytes |
| Survives a full page reload | ✅ still pending, still a real Blob, same size |
| "waiting for signal" strip | ✅ "1 receipt waiting for signal — held on this device only." |
| Real 503 (no `XAI_API_KEY`) classified as back-off | ✅ `status: pending`, `attempts: 1`, **photo kept** |
| Successful read deletes the photo | ✅ `blob` key **absent entirely**, not merely undefined |
| Result survives the deletion | ✅ amount/currency/category/merchant kept |
| Review fills the form via stage 2's `applyExtraction` | ✅ 250000 / VND / 2026-08-12 / note "Cua Dai" |
| Stage 1 conversion still applies | ✅ live preview `≈ $9.84` |
| Queue row removed after review | ✅ 0 rows |
| **Two tabs draining the same photo** | ✅ **1 extraction total** across both, 1 row, `ready`, 0 blobs left |

The two-tab check used a `localStorage` counter incremented inside each tab's
fetch stub — shared across tabs of one origin, so it counts real attempts on
both sides rather than inferring from one.

## Live model read — now verified, and it found a bug

Run against the real xAI API with a temporary probe (deleted afterwards; it
spends money per run). Receipt rendered locally via `qlmanage` — a Vietnamese
restaurant bill with a 570,000 subtotal and a 644,100 total, so taking the
wrong number was possible.

| Check | Result |
|---|---|
| API key, model, and vision path | ✅ |
| `{ type: "file", mediaType }` content-part shape | ✅ accepted — the shape the plan flagged as worth verifying rather than guessing |
| Structured output against our zod schema | ✅ |
| Landscape photo → refuses to invent a receipt | ✅ `found: false`, all fields null |
| Reads the TOTAL, not the subtotal or priciest line | ✅ `644100`, not 570000 or 180000 |
| Currency / category / merchant | ✅ `VND` / `food` / `NHA HANG CUA DAI` |

**The bug:** `day` came back as `12/08/2026`, not ISO. The client's `validDay`
rejects that and drops it, so the expense would silently land on *today*
instead of the day it happened — a quiet wrong answer, not a visible failure.
The prompt asked for "the date" without ever specifying a format.

Fixed by asking for `YYYY-MM-DD` explicitly and telling the model that
non-US receipts print DD/MM/YYYY, so `12/08/2026` is 12 August rather than
8 December. Re-ran: `2026-08-12`. Only a live call could have caught this —
every mocked test supplied an already-ISO date.

## End-to-end on production — confirmed

`XAI_API_KEY` and `ASSISTANT_ALLOWED_EMAILS` were never set in Vercel, which
is why both this route and the trip co-pilot had returned 503 in production
since they shipped. Once set and redeployed, an unauthenticated probe moved
from 503 ("not configured") to 401 ("sign in"), which proves both variables
landed: the key check and the non-empty-allowlist check both pass, and the
gate now stops at authentication as designed.

**Reported by the user after testing on a real device:** scanning works, the
phone scan is fast, and the result lands in the review step so it can be
edited before committing — the never-auto-save rule behaving as intended with
a real receipt rather than a rendered one.

## Still unverified

- **Awkward receipts.** Everything tested here — mine rendered, theirs
  photographed — worked. A creased thermal receipt with faded ink, a fold
  through the total, tips, discounts or a split bill has not been tried, and
  that is where a wrong-number read would come from.
- **The date fix under real conditions.** `2026-08-12` came back correctly on
  a rendered receipt after the prompt fix, but the fix is an instruction to a
  model, not a guarantee. A real DD/MM receipt is still the honest test.
