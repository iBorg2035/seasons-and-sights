import type { CrowdLevel, Region } from "@/types";
import { CROWD_META, MONTH_NAMES, crowdForMonth } from "@/lib/season";

const LEVELS: CrowdLevel[] = ["high", "mid", "low"];

/** A 12-month strip of crowd/price level — the companion to the season strip. */
export function CrowdStrip({
  region,
  highlightMonths,
  showLegend = true,
}: {
  region: Region;
  highlightMonths?: number[];
  showLegend?: boolean;
}) {
  const ringSet = highlightMonths ? new Set(highlightMonths) : null;

  return (
    <div>
      <div className="flex gap-1">
        {MONTH_NAMES.map((label, i) => {
          const month = i + 1;
          const meta = CROWD_META[crowdForMonth(region, month)];
          const isRinged = ringSet?.has(month) ?? false;
          return (
            <div key={label} className="flex-1">
              <div
                title={`${label}: ${meta.label}`}
                className={`h-9 rounded ${meta.dot} opacity-90 transition ${
                  isRinged ? "ring-2 ring-slate-900 ring-offset-1" : ""
                }`}
              />
              <div className="mt-1 text-center text-[10px] text-slate-500">
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {showLegend && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          {LEVELS.map((l) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${CROWD_META[l].dot}`} />
              {CROWD_META[l].label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
