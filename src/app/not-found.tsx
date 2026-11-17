import Link from "next/link";

export const metadata = { title: "Page not found" };

/** 404 — also what a mistyped or retired `/regions/<id>` link lands on. */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-4xl" aria-hidden>
        🗺️
      </p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        That page isn&apos;t on the map
      </h1>
      <p className="mt-2 text-slate-600">
        The link may be mistyped, or the destination may have moved. Your saved
        trips are untouched.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Explore destinations
        </Link>
        <Link
          href="/trips"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          My trips
        </Link>
      </div>
    </div>
  );
}
