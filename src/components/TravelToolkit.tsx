import type { TravelToolkit as Toolkit } from "@/types";
import { CurrencyConverter } from "@/components/CurrencyConverter";

export function TravelToolkit({
  toolkit,
  currency,
}: {
  toolkit: Toolkit;
  currency?: string;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-semibold text-slate-900">Travel toolkit</h2>

      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        Useful phrases
      </p>
      <dl className="mb-5 grid grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-2">
        {toolkit.phrases.map((p) => (
          <div key={p.en} className="flex justify-between gap-3 text-sm">
            <dt className="text-slate-500">{p.en}</dt>
            <dd className="text-right font-medium text-slate-800">{p.local}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
        <div className="flex gap-3">
          <span className="text-xl" aria-hidden>🚨</span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Emergency
            </p>
            <p className="text-sm text-slate-700">{toolkit.emergency}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <span className="text-xl" aria-hidden>💵</span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Tipping
            </p>
            <p className="text-sm text-slate-700">{toolkit.tipping}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <span className="text-xl" aria-hidden>💧</span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Tap water
            </p>
            <p className="text-sm text-slate-700">{toolkit.water}</p>
          </div>
        </div>
      </div>

      {currency && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <CurrencyConverter currency={currency} />
        </div>
      )}
    </section>
  );
}
