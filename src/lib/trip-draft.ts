// The "current trip" — a working plan persisted in localStorage so it survives
// reloads and can be added to from anywhere (Add to trip) and read by the
// planner and the Today view.

export interface DraftStop {
  id: string;
  duration: number;
}

export interface TripDraft {
  /** 1-based start month, or 0 if unset (planner falls back to current month). */
  start: number;
  stops: DraftStop[];
}

const KEY = "seasons-draft";
export const DRAFT_EVENT = "seasons-draft-change";

export function getDraft(): TripDraft {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      start: typeof d.start === "number" ? d.start : 0,
      stops: Array.isArray(d.stops) ? d.stops : [],
    };
  } catch {
    return { start: 0, stops: [] };
  }
}

export function saveDraft(draft: TripDraft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DRAFT_EVENT));
  }
}

/** Append a destination to the current trip. Returns false if already present. */
export function addToDraft(id: string, fallbackStart: number, duration = 2): boolean {
  const d = getDraft();
  if (d.stops.some((s) => s.id === id)) return false;
  d.stops.push({ id, duration });
  if (!d.start) d.start = fallbackStart;
  saveDraft(d);
  return true;
}
