import type { Season } from "@/types";

/**
 * Projection maths for the Jan–Dec calendar strip.
 *
 * The strip's header is twelve equal columns, so a date's x position is
 * `(monthIndex + dayFraction) / 12`. That puts segment edges exactly on the
 * month gridlines, which is what lets a fortnight occupy half a column instead
 * of the whole one — the month-cell version couldn't tell the two apart.
 *
 * Kept out of the component so the arithmetic is testable on its own: it's
 * invisible in the happy case and badly wrong at the year boundary.
 */

/** A stay projected onto the track, as fractions of the year. */
export interface DaySegment {
  /** 0–1 across the track. */
  from: number;
  to: number;
  season: Season;
  regionName: string;
  festivals: string[];
  label: string;
}

/** Where a date sits on the twelve-column track, as a 0–1 fraction. */
export function trackPos(d: Date): number {
  const m = d.getMonth();
  // Real month length, not an average: Feb 15 is half of February, and half of
  // a different-sized February in a leap year.
  const daysInMonth = new Date(d.getFullYear(), m + 1, 0).getDate();
  return (m + (d.getDate() - 1) / daysInMonth) / 12;
}

/**
 * Split a range at the year boundary, so a trip crossing New Year draws as two
 * pieces instead of one bar running backwards from December to February.
 */
export function splitAtYearEnd(
  start: Date,
  end: Date
): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  const cursor = new Date(start);
  while (cursor < end) {
    const yearEnd = new Date(cursor.getFullYear() + 1, 0, 1);
    const stop = end < yearEnd ? end : yearEnd;
    const from = trackPos(cursor);
    // A stay ending exactly at midnight on Jan 1 fills the track to its end;
    // trackPos would wrap that to 0 and the piece would vanish.
    const to = stop.getTime() === yearEnd.getTime() ? 1 : trackPos(stop);
    if (to > from) out.push({ from, to });
    cursor.setTime(yearEnd.getTime());
  }
  return out;
}

/**
 * Group touching segments so a continuous stretch of travel gets one rounded
 * outline, as the month-cell version did — a real gap between stays still
 * reads as two separate pills.
 */
export function segmentRuns(
  segments: DaySegment[]
): { from: number; to: number; segments: DaySegment[] }[] {
  const runs: { from: number; to: number; segments: DaySegment[] }[] = [];
  for (const seg of segments) {
    const last = runs[runs.length - 1];
    // A hair of tolerance: consecutive stays share a boundary date but reach
    // it by different divisions, and float noise shouldn't split the pill.
    if (last && seg.from <= last.to + 1e-9) {
      last.to = Math.max(last.to, seg.to);
      last.segments.push(seg);
    } else {
      runs.push({ from: seg.from, to: seg.to, segments: [seg] });
    }
  }
  return runs;
}

/** "Sep 3 – Sep 11" for a half-open range, i.e. through the last night. */
export function fmtRange(start: Date, end: Date): string {
  const last = new Date(end.getTime() - 86_400_000);
  const f = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${f(start)} – ${f(last)}`;
}
