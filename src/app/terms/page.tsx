import Link from "next/link";
import { DATA_REVIEWED, SITE_NAME } from "@/lib/site";

export const metadata = {
  title: "Terms of Use",
  description: `The terms for using ${SITE_NAME}.`,
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6 text-slate-700">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Terms of Use
        </h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {DATA_REVIEWED}</p>
      </header>

      <p>
        {SITE_NAME} is a free trip-planning aid. By using it you accept these
        terms. They&apos;re a plain-language template — review with a professional
        before relying on them.
      </p>

      <Section title="Not professional advice">
        <p>
          Season, visa, health, safety, and price information is{" "}
          <strong>indicative and may be incomplete or out of date</strong>. It is
          not legal, medical, or financial advice. Always verify entry rules,
          vaccinations, and safety with official sources — your government&apos;s
          travel advisories, embassies, and licensed professionals — before
          booking or travelling. We&apos;re not liable for decisions made using
          the app.
        </p>
      </Section>

      <Section title="Affiliate links">
        <p>
          Accommodation links open Booking.com and may include an affiliate tag;
          flight links open Google Flights. We may earn a commission at no extra
          cost to you. We don&apos;t rank destinations to favour commissions.
        </p>
      </Section>

      <Section title="Accounts & content">
        <p>
          Keep your login secure. Don&apos;t misuse the trip-sharing feature to
          publish unlawful or abusive content. We may remove shared trips that do.
        </p>
      </Section>

      <Section title="Availability">
        <p>
          The service is provided &quot;as is&quot;, without warranty, and may
          change or be discontinued at any time. Photos come from Wikipedia /
          Wikimedia under their respective licenses; map data is © OpenStreetMap
          contributors.
        </p>
      </Section>

      <p className="text-sm text-slate-500">
        See also our{" "}
        <Link href="/privacy" className="text-amber-600 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
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
