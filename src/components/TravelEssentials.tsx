import type { TravelInfo } from "@/types";
import { VisaByNationality } from "@/components/VisaByNationality";

const ITEMS: { key: keyof TravelInfo; icon: string; label: string }[] = [
  { key: "visa", icon: "🛂", label: "Visa" },
  { key: "currency", icon: "💱", label: "Currency" },
  { key: "language", icon: "🗣️", label: "Language" },
  { key: "plugs", icon: "🔌", label: "Plugs" },
  { key: "gettingThere", icon: "✈️", label: "Getting there" },
  { key: "health", icon: "🩺", label: "Health & safety" },
];

export function TravelEssentials({
  info,
  country,
}: {
  info: TravelInfo;
  country: string;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-semibold text-slate-900">Know before you go</h2>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item) => (
          <div key={item.key} className="flex gap-3">
            <span className="text-xl" aria-hidden>
              {item.icon}
            </span>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {item.label}
              </dt>
              <dd className="text-sm text-slate-700">
                {item.key === "visa" ? (
                  <VisaByNationality country={country} fallback={info.visa} />
                ) : (
                  info[item.key]
                )}
              </dd>
            </div>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-slate-400">
        Indicative for many nationalities — verify visa, health, and entry rules
        for your passport before booking.
      </p>
    </section>
  );
}
