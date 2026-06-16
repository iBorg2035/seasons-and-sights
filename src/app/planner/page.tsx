import { TripPlanner } from "@/components/TripPlanner";
import { getRegion } from "@/data/regions";
import { monthOf } from "@/lib/season";

export const metadata = {
  title: "Trip planner — Seasons & Sights",
  description:
    "Pick destinations and a start month; get a route that sequences each stop into its dry or shoulder season.",
};

function parseStops(raw?: string): { id: string; duration: number }[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: { id: string; duration: number }[] = [];
  for (const part of raw.split(",")) {
    const [id, durStr] = part.split(":");
    if (!id || seen.has(id) || !getRegion(id)) continue;
    let d = Math.round(Number(durStr));
    if (!Number.isFinite(d) || d < 1) d = 2;
    if (d > 3) d = 3;
    seen.add(id);
    out.push({ id, duration: d });
  }
  return out;
}

function parseStart(raw?: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
}

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; stops?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div>
      <section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Trip planner
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Pick where you want to go and when you&apos;ll set off. The planner
          orders your stops so each one lands in its dry or shoulder season —
          chasing the good weather across hemispheres. Works for a two-week trip
          or a multi-year slow-travel loop (try the example presets).
        </p>
      </section>

      <TripPlanner
        initialMonth={parseStart(sp.start) ?? monthOf()}
        initialStops={parseStops(sp.stops)}
      />
    </div>
  );
}
