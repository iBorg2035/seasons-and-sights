import type { Region } from "@/types";
import { MONTH_NAMES, SEASON_META, climateForMonth } from "@/lib/season";

const ALL_SEASONS = ["dry", "shoulder", "wet"] as const;

/**
 * The signature 12-month dry/wet timeline. One cell per month, colour-coded by
 * season, with the highlighted month ringed. Hovering a cell reveals its note.
 *
 * Pass `onSelectMonth` to make the months clickable (region detail page); the
 * ringed cell then tracks `selectedMonth` and `nowMonth` gets a "now" marker.
 */
export function SeasonStrip({
  region,
  highlightMonth,
  selectedMonth,
  highlightMonths,
  eventMonths,
  nowMonth,
  onSelectMonth,
  showLegend = true,
}: {
  region: Region;
  /** 1-based month to ring on a static strip (e.g. the current month). */
  highlightMonth?: number;
  /** 1-based month to ring when interactive. */
  selectedMonth?: number;
  /** 1-based months to ring (e.g. a multi-month stay window). */
  highlightMonths?: number[];
  /** 1-based months that have a festival/event, marked with a 🎉. */
  eventMonths?: number[];
  /** 1-based current month, marked "now" when interactive. */
  nowMonth?: number;
  /** When provided, months render as buttons. */
  onSelectMonth?: (month: number) => void;
  showLegend?: boolean;
}) {
  const ringMonth = selectedMonth ?? highlightMonth;
  const ringSet = highlightMonths ? new Set(highlightMonths) : null;
  const eventSet = eventMonths ? new Set(eventMonths) : null;
  const interactive = Boolean(onSelectMonth);

  return (
    <div>
      <div className="flex gap-1">
        {MONTH_NAMES.map((label, i) => {
          const month = i + 1;
          const { season, note } = climateForMonth(region, month);
          const meta = SEASON_META[season];
          const isRinged = ringSet ? ringSet.has(month) : month === ringMonth;
          const isNow = month === nowMonth;
          const title = note ? `${label}: ${note}` : `${label}: ${meta.label}`;
          const cellClass = `h-9 w-full rounded ${meta.dot} transition ${
            isRinged
              ? "ring-2 ring-slate-900 ring-offset-1"
              : "opacity-90"
          } ${
            interactive
              ? "cursor-pointer hover:opacity-100 hover:ring-2 hover:ring-slate-400"
              : "hover:opacity-100"
          } ${
            note
              ? "relative after:absolute after:right-0.5 after:top-0.5 after:text-[8px] after:text-white/90 after:content-['•']"
              : ""
          }`;

          return (
            <div key={label} className="flex-1">
              {interactive ? (
                <button
                  type="button"
                  onClick={() => onSelectMonth!(month)}
                  aria-pressed={isRinged}
                  aria-label={title}
                  title={title}
                  className={cellClass}
                />
              ) : (
                <div title={title} className={cellClass} />
              )}
              <div
                className={`mt-1 text-center text-[10px] ${
                  isRinged ? "font-bold text-slate-900" : "text-slate-500"
                }`}
              >
                {label}
              </div>
              <div className="h-3 text-center text-[9px] font-semibold text-amber-600">
                {isNow ? "now" : eventSet?.has(month) ? "🎉" : ""}
              </div>
            </div>
          );
        })}
      </div>

      {showLegend && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          {ALL_SEASONS.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${SEASON_META[s].dot}`} />
              {SEASON_META[s].label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden>•</span> has a note (hover)
          </span>
        </div>
      )}
    </div>
  );
}
