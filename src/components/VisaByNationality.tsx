"use client";

import { useEffect, useState } from "react";
import { PASSPORTS, visaFor, visaCheckUrl, type Passport } from "@/lib/visa";

const KEY = "seasons-passport";
const PASSPORT_EVENT = "seasons-passport-change";

/**
 * Passport-aware visa status. The choice is persisted and shared across every
 * destination page, so picking it once tailors the whole trip.
 */
export function VisaByNationality({
  country,
  fallback,
}: {
  country: string;
  fallback: string;
}) {
  const [passport, setPassport] = useState<Passport | null>(null);

  useEffect(() => {
    const sync = () => {
      const v = localStorage.getItem(KEY);
      setPassport(v && PASSPORTS.some((p) => p.code === v) ? (v as Passport) : null);
    };
    sync();
    window.addEventListener(PASSPORT_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PASSPORT_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function choose(code: Passport) {
    const next = passport === code ? null : code;
    if (next) localStorage.setItem(KEY, next);
    else localStorage.removeItem(KEY);
    setPassport(next);
    window.dispatchEvent(new Event(PASSPORT_EVENT));
  }

  const status = passport ? visaFor(country, passport) ?? fallback : fallback;

  return (
    <div>
      <p className="text-sm text-slate-700">{status}</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[11px] text-slate-400">Your passport:</span>
        {PASSPORTS.map((p) => (
          <button
            key={p.code}
            type="button"
            onClick={() => choose(p.code)}
            aria-pressed={passport === p.code}
            className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
              passport === p.code
                ? "border-amber-400 bg-amber-100 font-semibold text-amber-800"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {passport && (
        <a
          href={visaCheckUrl(country, passport)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-[11px] font-medium text-amber-600 hover:underline"
        >
          Check official requirements ↗
        </a>
      )}
    </div>
  );
}
