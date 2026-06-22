import Link from "next/link";
import { DATA_REVIEWED, SITE_NAME } from "@/lib/site";
import { REGIONS } from "@/data/regions";

export const metadata = {
  title: "About the data",
  description: `How ${SITE_NAME} sources and curates its season, sights, and travel data.`,
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6 text-slate-700">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          About the data
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {REGIONS.length} destinations · curated data last reviewed {DATA_REVIEWED}
        </p>
      </header>

      <p>
        {SITE_NAME} answers one question better than most travel sites:{" "}
        <em>is it the right season to be here — and if not, where should I go
        instead?</em> In the tropics and the high mountains, the gap between dry
        and wet season makes or breaks a trip, so we put it front and centre.
      </p>

      <Section title="How the seasons are made">
        <p>
          Each destination has a curated 12-month classification —{" "}
          <strong>dry</strong>, <strong>wet</strong>, or{" "}
          <strong>shoulder</strong> — based on climatology, then cross-checked
          against <strong>Open-Meteo</strong> historical rainfall (2019–2023). For
          a few places we use &quot;wet/shoulder&quot; to flag a season to{" "}
          <em>avoid</em> for non-weather reasons — Patagonian winter cold, or
          extreme desert heat in Egypt — and the notes explain why.
        </p>
      </Section>

      <Section title="Live & external data">
        <ul className="list-disc space-y-2 pl-5">
          <li>Current weather, daylight, and historical normals — Open-Meteo (no key).</li>
          <li>Exchange rates — open.er-api.com.</li>
          <li>Destination photos — Wikipedia / Wikimedia, self-hosted.</li>
          <li>Maps — OpenStreetMap.</li>
          <li>Stays — Booking.com deep-links; flights — Google Flights.</li>
        </ul>
      </Section>

      <Section title="Please verify before you book">
        <p>
          Visa, health, safety, and price details are <strong>indicative</strong>{" "}
          and change often. Always confirm with official sources for your
          nationality before travelling — see the{" "}
          <Link href="/terms" className="text-amber-600 hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-amber-600 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}
