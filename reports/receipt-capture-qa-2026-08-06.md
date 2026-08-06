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

## Still unverified

**The actual model read.** `XAI_API_KEY` is not set in this environment, so
every path above exercised the route's error handling or a stubbed success.
Whether grok-4.5 reads a real receipt correctly — the right total rather than a
subtotal, the right currency, a sensible category — has never been tested and
remains the one genuinely open question across all three stages.
