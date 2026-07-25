import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";

/**
 * Server-side Supabase auth, for route handlers that need to know who is
 * calling. Distinct from `client.ts`, which builds a *browser* client and is
 * the only Supabase entry point the client bundle ever sees.
 *
 * Returns null whenever identity can't be established — unconfigured project,
 * no session, expired token, malformed cookie. Callers are expected to treat
 * null as "deny", so every failure mode fails closed.
 */
export async function getServerUser(): Promise<User | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  try {
    const store = await cookies();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => store.getAll(),
        // Read-only: this client only answers "who is this?". Not persisting a
        // refreshed token costs nothing here — the browser client refreshes on
        // its own — and it keeps the handler free of cookie side effects.
        setAll: () => {},
      },
    });

    // getUser() revalidates against the auth server rather than trusting the
    // cookie's claims, which is what makes this safe to gate access on.
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user ?? null;
  } catch {
    return null;
  }
}
