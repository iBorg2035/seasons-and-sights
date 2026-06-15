import type { Season } from "@/types";
import { SEASON_META } from "@/lib/season";

export function SeasonBadge({
  season,
  suffix,
  className = "",
}: {
  season: Season;
  /** Optional text after the season label, e.g. "now". */
  suffix?: string;
  className?: string;
}) {
  const meta = SEASON_META[season];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.chip} ${className}`}
    >
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
      {suffix ? ` ${suffix}` : ""}
    </span>
  );
}
