import { TripPlanner } from "@/components/TripPlanner";
import { monthOf } from "@/lib/season";

export const metadata = {
  title: "Trip planner — Seasons & Sights",
  description:
    "Pick destinations and a start month; get a route that sequences each stop into its dry or shoulder season.",
};

export default function PlannerPage() {
  return (
    <div>
      <section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Trip planner
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Pick where you want to go and when you&apos;ll set off. The planner
          orders your stops so each one lands in its dry or shoulder season —
          chasing the good weather across hemispheres.
        </p>
      </section>

      <TripPlanner initialMonth={monthOf()} />
    </div>
  );
}
