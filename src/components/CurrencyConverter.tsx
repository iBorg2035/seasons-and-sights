"use client";

import { useEffect, useState } from "react";

export function CurrencyConverter({ currency }: { currency: string }) {
  const code = currency.match(/\(([A-Z]{3})\)/)?.[1];
  const [rate, setRate] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [amount, setAmount] = useState("20");

  useEffect(() => {
    if (!code) return;
    let active = true;
    fetch("/api/fx")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { rates: Record<string, number> | null }) => {
        if (!active) return;
        const r = d.rates?.[code];
        r ? setRate(r) : setFailed(true);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [code]);

  if (!code) return null;

  const n = parseFloat(amount) || 0;
  const local =
    rate != null ? Math.round(n * rate).toLocaleString("en-US") : null;

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        Currency converter
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
        <span className="text-slate-400">$</span>
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Amount in USD"
          className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-900"
        />
        <span className="text-slate-400">USD ≈</span>
        <span className="font-semibold text-slate-900">
          {failed ? "—" : local != null ? `${local} ${code}` : "…"}
        </span>
      </div>
    </div>
  );
}
