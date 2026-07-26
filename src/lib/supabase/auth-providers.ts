const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Which social providers the Supabase project actually has enabled.
 *
 * Without this the sign-in dialog offers "Continue with Google" whether or not
 * the provider exists, and a user who clicks it gets
 * `{"error_code":"validation_failed","msg":"Unsupported provider: provider is
 * not enabled"}` — a dead end that looks like the app is broken.
 *
 * `/auth/v1/settings` is public (it's what Supabase's own UI reads) and needs
 * only the anon key, so this is a plain fetch: probing which buttons to draw
 * shouldn't drag in the ~180 kB supabase-js bundle.
 *
 * Deliberately optimistic on failure — a probe that can't complete is far more
 * likely to be a transient network problem than a disabled provider, and
 * hiding sign-in from someone who could have used it is worse than showing a
 * button whose failure now explains itself.
 */
let cached: Promise<Set<string>> | null = null;

export function fetchEnabledProviders(): Promise<Set<string>> {
  if (!url || !anonKey) return Promise.resolve(new Set());
  if (!cached) {
    cached = fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey } })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { external?: Record<string, boolean> } | null) => {
        if (!body?.external) return UNKNOWN;
        return new Set(
          Object.entries(body.external)
            .filter(([, on]) => on)
            .map(([name]) => name)
        );
      })
      .catch(() => {
        // Let a later attempt retry rather than caching a network blip.
        cached = null;
        return UNKNOWN;
      });
  }
  return cached;
}

/** Sentinel for "couldn't tell" — callers treat membership as true. */
const UNKNOWN = new Set<string>(["*"]);

export function isProviderEnabled(
  providers: Set<string>,
  name: string
): boolean {
  return providers.has(name) || providers.has("*");
}
