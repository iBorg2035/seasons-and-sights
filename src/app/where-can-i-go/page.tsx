import { WhereCanIGoView } from "@/components/WhereCanIGoView";
import { monthOf } from "@/lib/season";

export const metadata = {
  title: "Where can I go?",
  description:
    "Tell us when you're free and your budget — we'll rank every destination by season fit so you find the best place to travel.",
};

export default function WhereCanIGoPage() {
  return (
    <div>
      <section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Where can I go?
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Pick a month and a daily budget — we&apos;ll rank every destination by
          how good the season is, so you find the best place to travel when
          you&apos;re actually free.
        </p>
      </section>

      <WhereCanIGoView initialMonth={monthOf()} />
    </div>
  );
}
