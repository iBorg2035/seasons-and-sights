import type { Region } from "@/types";
import { packingList } from "@/lib/packing";
import { MONTH_NAMES_LONG } from "@/lib/season";

export function PackingList({
  region,
  month,
}: {
  region: Region;
  month: number;
}) {
  const groups = packingList(region, month);

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">Packing list</h2>
      <p className="mb-4 text-xs text-slate-400">
        Tailored to {region.name} in {MONTH_NAMES_LONG[month - 1]} — tick as you
        pack.
      </p>
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.group}>
            <p className="mb-1.5 text-sm font-medium text-slate-700">
              {g.group}
            </p>
            <ul className="space-y-1.5">
              {g.items.map((item) => (
                <li key={item}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                    />
                    {item}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
