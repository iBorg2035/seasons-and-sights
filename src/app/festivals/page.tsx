import { FestivalsView } from "@/components/FestivalsView";
import { monthOf } from "@/lib/season";

export const metadata = {
  title: "Festivals & events — Seasons & Sights",
  description:
    "A month-by-month calendar of marquee festivals across Asia, South America, Europe, and Africa — from Carnival to cherry blossom to Diwali.",
};

// Regenerate daily so the "this month" highlight stays current.
export const revalidate = 86400;

export default function FestivalsPage() {
  return (
    <div>
      <section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Festivals &amp; events
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          The world&apos;s great celebrations, month by month — sometimes worth
          planning a whole trip around (and worth knowing about, since they pack
          out hotels). Pick a month, or browse the year.
        </p>
      </section>

      <FestivalsView initialMonth={monthOf()} />
    </div>
  );
}
