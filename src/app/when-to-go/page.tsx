import { WhenToGoView } from "@/components/WhenToGoView";

export const metadata = {
  title: "When to go — Seasons & Sights",
  description:
    "Pick a month and see which destinations across Southeast Asia, South America, and the Mediterranean Balkans are in dry, shoulder, or wet season.",
};

export default function WhenToGoPage() {
  return (
    <div>
      <section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          When to go
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Pick a month to see where it&apos;s dry, shoulder, or wet across every
          region. Planning around a fixed date? Start here, then open a
          destination for its full season calendar and sights.
        </p>
      </section>

      <WhenToGoView />
    </div>
  );
}
