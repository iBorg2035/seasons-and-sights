"use client";

import { useEffect, useState } from "react";

const KEY = "seasons-onboarded";

const STEPS = [
  { icon: "🌤️", title: "Travel in the right season", text: "Every destination is mapped month-by-month — dry, wet, or shoulder — so you can see what's good to visit right now." },
  { icon: "🗺️", title: "Plan a route that chases good weather", text: "Pick a few places and a start month; the planner orders them so each stop lands in its best season." },
  { icon: "🧳", title: "Save it, prep it, take it offline", text: "Sync trips across devices, get a packing & pre-departure list, and use it offline on the road." },
];

/** First-run explainer for the season concept. Shown once, then dismissed. */
export function OnboardingIntro() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <section className="relative mb-8 rounded-2xl border border-amber-300 bg-amber-900/90 p-5">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 text-amber-400 transition hover:text-white"
      >
        ✕
      </button>
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
        New here? How it works
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-2xl" aria-hidden>
              {s.icon}
            </span>
            <div>
              <p className="text-sm font-semibold text-white">
                {i + 1}. {s.title}
              </p>
              <p className="mt-0.5 text-sm text-amber-100/90">{s.text}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={dismiss}
        className="mt-4 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-600"
      >
        Got it
      </button>
    </section>
  );
}
