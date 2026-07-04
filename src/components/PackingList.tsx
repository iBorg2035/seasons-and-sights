import type { Region } from "@/types";
import { packingList } from "@/lib/packing";
import { MONTH_NAMES_LONG } from "@/lib/season";

function Groups({ region, month }: { region: Region; month: number }) {
  const groups = packingList(region, month);
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
      {groups.map((g) => (
        <div key={g.group}>
          <p className="mb-1.5 text-sm font-medium text-slate-700">{g.group}</p>
          <ul className="space-y-1.5">
            {g.items.map((item) => (
              <li key={item}>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  {item}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function PackingList({
  region,
  month,
  compact = false,
}: {
  region: Region;
  month: number;
  /** Accordion-embedded variant: h4-style heading, no card chrome. */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Pack for {MONTH_NAMES_LONG[month - 1]}
        </h4>
        <Groups region={region} month={month} />
      </div>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">Packing list</h2>
      <p className="mb-4 text-xs text-slate-400">
        Tailored to {region.name} in {MONTH_NAMES_LONG[month - 1]} — tick as you
        pack.
      </p>
      <Groups region={region} month={month} />
    </section>
  );
}
