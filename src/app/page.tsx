import { ExploreGrid } from "@/components/ExploreGrid";
import { OnboardingIntro } from "@/components/OnboardingIntro";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description:
    "Travel-planning by season — find destinations in their dry or shoulder season and plan a route that chases good weather.",
};

export default function HomePage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <OnboardingIntro />
      <section className="mb-10 border-b border-[var(--hairline)] pb-8">
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
