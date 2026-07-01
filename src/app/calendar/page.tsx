import { CalendarView } from "@/components/CalendarView";

export const metadata = {
  title: "Trip calendar — Seasons & Sights",
  description:
    "Your saved trips laid out across the year — see when each one runs and how its stops line up with the dry, shoulder, and wet seasons.",
};

export default function CalendarPage() {
  return (
    <div>
      <section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Trip calendar
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          All your trips across the year at a glance. Each bar spans the months a
          trip covers, coloured by the season you&apos;d hit at each stop — so you
          can spot clashes, gaps, and the best windows to travel.
        </p>
      </section>

      <CalendarView />
    </div>
  );
}
