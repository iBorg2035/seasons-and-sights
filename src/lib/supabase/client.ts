import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Whether account sync is wired up. When false the whole app still works —
 * trips live in localStorage only, and the account UI hides itself.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

let clientPromise: Promise<SupabaseClient | null> | null = null;

/**
 * Lazily create a single browser Supabase client, or null if not configured.
 *
 * `@supabase/ssr` (and the ~180 kB `@supabase/supabase-js` it pulls in) is
 * imported on demand so it stays out of every route's initial JS — only the
 * flows that actually touch accounts (auth check, sign-in, trip sync) pay for
 * it. Returns a Promise because of that dynamic import; the resolved client is
 * cached. On import failure it degrades to `null` (same as "not configured")
 * and lets a later call retry.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("@supabase/ssr")
      .then(({ createBrowserClient }) => createBrowserClient(url!, anonKey!))
      .catch(() => {
        clientPromise = null;
        return null;
      });
  }
  return clientPromise;
}
