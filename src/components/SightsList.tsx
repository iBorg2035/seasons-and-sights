import type { Sight, SightType } from "@/types";

const TYPE_META: Record<SightType, { icon: string; label: string }> = {
  nature: { icon: "🏞️", label: "Nature" },
  culture: { icon: "🏛️", label: "Culture" },
  city: { icon: "🏙️", label: "City" },
  beach: { icon: "🏖️", label: "Beach" },
  wildlife: { icon: "🦜", label: "Wildlife" },
};

export function SightsList({ sights }: { sights: Sight[] }) {
  return (
    <ul className="divide-y divide-slate-100">
      {sights.map((sight) => {
        const meta = TYPE_META[sight.type];
        return (
          <li key={sight.name} className="flex gap-3 py-3">
            <span className="text-2xl" aria-hidden title={meta.label}>
              {meta.icon}
            </span>
            <div>
              <div className="font-medium text-slate-900">{sight.name}</div>
              <p className="text-sm text-slate-500">{sight.blurb}</p>
              {sight.wiki && (
                <a
                  href={sight.wiki}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-amber-600 hover:underline"
                >
                  Learn more ↗
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
