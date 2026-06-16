import { CompareView } from "@/components/CompareView";
import { monthOf } from "@/lib/season";

export const metadata = {
  title: "Compare destinations — Seasons & Sights",
  description:
    "Put two or three destinations side by side — season, crowds, best time, and budget — for any month.",
};

// Regenerate daily so the default compare month stays current.
export const revalidate = 86400;

export default function ComparePage() {
  return (
    <div>
      <section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Compare destinations
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Torn between a few places? Line them up side by side — season, crowds,
          best time to go, and rough daily budget — for whatever month you have
          in mind.
        </p>
      </section>

      <CompareView initialMonth={monthOf()} />
    </div>
  );
}
