import { TodayView } from "@/components/TodayView";
import { monthOf } from "@/lib/season";

export const metadata = {
  title: "Today — Seasons & Sights",
  description:
    "Your current trip at a glance: where you are now, today's weather and daylight, and your next stop.",
};

export const revalidate = 86400;

export default function TodayPage() {
  return (
    <div>
      <section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Today
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Your current trip at a glance — where you are now, today&apos;s weather
          and daylight, and what&apos;s next. Build it on the{" "}
          <a href="/planner" className="font-medium text-amber-600 hover:underline">
            planner
          </a>{" "}
          or add destinations as you browse.
        </p>
      </section>

      <TodayView initialMonth={monthOf()} />
    </div>
  );
}
