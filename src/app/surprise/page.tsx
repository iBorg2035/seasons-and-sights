import { SurpriseView } from "@/components/SurpriseView";
import { monthOf } from "@/lib/season";

export const metadata = {
  title: "Surprise me — Seasons & Sights",
  description:
    "Tell us when you're free and we'll pick a destination that's in its best season right then.",
};

export default function SurprisePage() {
  return (
    <div>
      <section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Surprise me
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Got the dates but not the destination? Pick a month and we&apos;ll
          point you somewhere that&apos;s firmly in its dry or shoulder season —
          hit shuffle until something sparks.
        </p>
      </section>

      <SurpriseView initialMonth={monthOf()} />
    </div>
  );
}
