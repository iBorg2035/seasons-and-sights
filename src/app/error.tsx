"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportError } from "@/lib/report-error";

/** Route-segment error boundary — keeps a render error from blanking the app. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    reportError(error, { boundary: "route" });
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="text-4xl" aria-hidden>
        🧭
      </p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Something went off-course
      </h1>
      <p className="mt-2 text-slate-600">
        An unexpected error hit this page. Your saved trips are safe.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
