# Reassessment report index

- 2026-06-30: 3 bugs, 1 hole — slim client bundle still ships full ~141KB region dataset (35KB gzip) to every view; 39/72 destinations missing events
- 2026-07-01: 2 bugs, 1 hole — prior bundle/auth/a11y bugs genuinely fixed, but unhandled-Supabase-rejection and missing-aria-pressed patterns each reappear at several other sites; events hole shrank to 4/72
- 2026-07-02: 3 bugs, 1 hole — unified-trips redesign lands clean (isolation/bundle/data all hold), but `deleteRemoteTrip` silently drops errors unlike its just-fixed sibling `upsertRemoteTrip` (can resurrect deleted trips on sync), the 07-01 unhandled-rejection sites are still unfixed, and QA-JOURNEYS.md now documents a retired UI
- 2026-07-03: 1 bug, 1 hole — all three 07-02 bugs fixed/mitigated; new inline-destination-detail feature (StopDetail + /api/region-detail) is clean on isolation, storage scoping, and bundle hygiene, but ships 3 new a11y gaps (missing role="status"/"alert"/aria-controls), continuing the recurring missing-ARIA-affordance pattern
