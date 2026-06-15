import { ExploreGrid } from "@/components/ExploreGrid";

export default function HomePage() {
  return (
    <div>
      <section className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Travel in the right season.
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          From Southeast Asian monsoons to the Andes, the Himalaya, and the
          Mediterranean, the season makes or breaks a trip — flooded trails, the
          perfect mirror across a salt flat, or a typhoon-lashed coast. Browse
          destinations by season and crowds, see local sights, and book your
          stay for the right time of year.
        </p>
      </section>

      <ExploreGrid />
    </div>
  );
}
