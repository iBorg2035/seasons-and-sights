import { ExploreGrid } from "@/components/ExploreGrid";

export default function HomePage() {
  return (
    <div>
      <section className="mb-10 border-b border-[#e7ddca] pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">
          Plan around the weather
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight text-stone-900 sm:text-6xl">
          Travel in the{" "}
          <span className="italic text-orange-500">right season.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-600">
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
