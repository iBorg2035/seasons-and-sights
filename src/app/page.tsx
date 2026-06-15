import { ExploreGrid } from "@/components/ExploreGrid";

export default function HomePage() {
  return (
    <div>
      <section className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Travel in the right season.
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Across Southeast Asia, South America, and the Mediterranean Balkans,
          the season makes or breaks a trip — monsoon downpours, the perfect
          mirror across a salt flat, or a rain-soaked Adriatic coast out of
          season. Browse destinations by season, see local sights, and book your
          stay for the right time of year.
        </p>
      </section>

      <ExploreGrid />
    </div>
  );
}
