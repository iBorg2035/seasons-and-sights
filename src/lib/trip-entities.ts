import { JOURNAL_ENTITY } from "@/lib/journal";
import { EXPENSE_ENTITY } from "@/lib/expenses";
import { RESERVATION_ENTITY } from "@/lib/reservations";
import { CHECKLIST_ENTITY } from "@/lib/checklist-progress";
import { PACKING_ENTITY } from "@/lib/packing-progress";
import { FX_ENTITY } from "@/lib/fx";

/**
 * Every per-trip record entity, in one place.
 *
 * This exists because the list had already drifted. Deleting a single trip
 * cleared all six; deleting your entire account cleared three — so the more
 * destructive action cleaned up less, and a diary, packing list and confirmed
 * exchange rates survived an account deletion that promised to remove
 * everything.
 *
 * Anything that must act on "all of a trip's data" iterates this rather than
 * listing entities by hand, so adding a seventh entity cannot silently miss a
 * cleanup path. The receipt photo queue is NOT here — it isn't a trip-record,
 * it lives in IndexedDB, and it has its own `clearQueue`; callers that wipe
 * data must call both, which `test/trip-entities.test.ts` enforces.
 */
export const ALL_TRIP_ENTITIES = [
  JOURNAL_ENTITY,
  EXPENSE_ENTITY,
  RESERVATION_ENTITY,
  CHECKLIST_ENTITY,
  PACKING_ENTITY,
  FX_ENTITY,
] as const;
