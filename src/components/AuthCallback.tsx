"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNext, useAuth } from "@/lib/contexts/auth-context";

/** How long to wait for the session before calling it a failed sign-in. */
const TIMEOUT_MS = 15_000;

/**
 * Where Google sends the user back to.
 *
 * The Supabase browser client detects the `?code=` param and exchanges it for
 * a session on its own, so this page doesn't call exchangeCodeForSession —
 * doing both would race, and the second attempt fails because the PKCE
 * verifier is single-use. It waits for the session the client establishes and
 * then gets out of the way.
 *
 * Local trips and journal entries are untouched by the redirect: they live in
 * localStorage, and the existing sign-in sync merges and pushes them once the
 * user lands.
 */
export function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  const next = safeNext(params.get("next"));
  // Google reports a refusal (or a misconfigured client) on the URL itself.
  const providerError =
    params.get("error_description") ?? params.get("error") ?? null;

  useEffect(() => {
    if (providerError) return;
    if (user) {
      // replace, not push: the callback URL still holds the auth code, and it
      // must not sit in history for the back button to return to.
      router.replace(next);
      return;
    }
    const t = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [user, next, providerError, router]);

  if (providerError || timedOut) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          Couldn&apos;t finish signing in
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {providerError ??
            "That took longer than expected. Your trips on this device are safe — nothing was lost."}
        </p>
        <Link
          href={next}
          className="mt-5 inline-block rounded-xl bg-sky-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-900"
        >
          Back to your trips
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center" role="status">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-sky-800" />
      <p className="mt-4 text-sm text-slate-600">
        {loading ? "Signing you in…" : "Almost there…"}
      </p>
    </div>
  );
}
