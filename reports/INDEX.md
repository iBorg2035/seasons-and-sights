# Reassessment report index

- 2026-06-30: 3 bugs, 1 hole — slim client bundle still ships full ~141KB region dataset (35KB gzip) to every view; 39/72 destinations missing events
- 2026-07-01: 2 bugs, 1 hole — prior bundle/auth/a11y bugs genuinely fixed, but unhandled-Supabase-rejection and missing-aria-pressed patterns each reappear at several other sites; events hole shrank to 4/72
- 2026-07-02: 3 bugs, 1 hole — unified-trips redesign lands clean (isolation/bundle/data all hold), but `deleteRemoteTrip` silently drops errors unlike its just-fixed sibling `upsertRemoteTrip` (can resurrect deleted trips on sync), the 07-01 unhandled-rejection sites are still unfixed, and QA-JOURNEYS.md now documents a retired UI
