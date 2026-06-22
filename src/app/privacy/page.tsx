import Link from "next/link";
import { DATA_REVIEWED, CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

export const metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} handles your data.`,
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6 text-slate-700">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {DATA_REVIEWED}</p>
      </header>

      <p>
        {SITE_NAME} is a travel-planning tool. You can use most of it without an
        account; data only leaves your device if you choose to sign in. This page
        explains what we collect and why. It&apos;s a plain-language summary, not
        legal advice — review it with a professional before relying on it.
      </p>

      <Section title="What we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account details</strong> — if you sign up, your email and a
            password. Authentication is handled by Supabase; we never see or
            store your raw password.
          </li>
          <li>
            <strong>Your saved trips</strong> — the destinations and dates you
            save, stored so they sync across your devices.
          </li>
          <li>
            <strong>On-device data</strong> — your current trip, theme, and
            chosen passport live in your browser&apos;s local storage and stay
            there unless you sign in.
          </li>
          <li>
            <strong>Anonymous usage</strong> — aggregate analytics and
            performance metrics (via Vercel). No advertising profiles, no sale of
            data.
          </li>
        </ul>
      </Section>

      <Section title="Where it&apos;s stored & who processes it">
        <p>
          Accounts and trips are stored with <strong>Supabase</strong> (database
          + authentication). Hosting and analytics run on <strong>Vercel</strong>.
          When you view weather or daylight, your selected destination&apos;s
          coordinates are sent to <strong>Open-Meteo</strong>. Maps use{" "}
          <strong>OpenStreetMap</strong>. Outbound accommodation and flight links
          go to Booking.com and Google Flights.
        </p>
      </Section>

      <Section title="Your choices & rights">
        <p>
          When signed in, you can <strong>export your trips</strong> and{" "}
          <strong>delete your account and data</strong> from the account menu.
          You can also email us at{" "}
          <a className="text-amber-600 hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>{" "}
          for any data request.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          Signing in sets a single <code>auth-token</code> cookie to keep you
          logged in. Everything else (preferences, current trip) uses local
          storage. We don&apos;t use third-party advertising cookies.
        </p>
      </Section>

      <p className="text-sm text-slate-500">
        See also our{" "}
        <Link href="/terms" className="text-amber-600 hover:underline">
          Terms of Use
        </Link>{" "}
        and{" "}
        <Link href="/about" className="text-amber-600 hover:underline">
          About the data
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
