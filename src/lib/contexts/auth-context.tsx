"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

interface AuthState {
  user: User | null;
  loading: boolean;
  /** True only when Supabase env vars are present. */
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error?: string; needsConfirm?: boolean }>;
  /**
   * Starts the Google OAuth redirect. On success the browser leaves the page,
   * so this only ever *returns* when something went wrong.
   */
  signInWithGoogle: (next?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

/**
 * Where to send the user after the OAuth round trip. Only same-origin paths
 * are allowed through: `next` is attacker-influenceable (anyone can hand out a
 * link that sets it), so accepting an absolute URL — including the
 * protocol-relative "//host" form, which browsers treat as absolute — would
 * turn sign-in into an open redirect.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/trips";
  return next;
}

/**
 * Where the post-sign-in destination is parked across the OAuth round trip.
 *
 * Deliberately NOT a query parameter on `redirectTo`. Supabase glob-matches
 * the entire redirect URL against its allowlist, query string included, so
 * `.../auth/callback?next=/trips` fails to match an entry of
 * `.../auth/callback` — and a failed match doesn't error, it silently falls
 * back to the project's Site URL, which is a genuinely baffling way to lose a
 * redirect. sessionStorage survives the trip (same tab, same origin) and keeps
 * the callback URL a constant, so the allowlist entry is exact and boring.
 */
export const AUTH_NEXT_KEY = "seasons-auth-next";

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let unsub: (() => void) | undefined;
    getSupabase().then((sb) => {
      // The dynamic import may resolve after unmount, or with no client when
      // accounts aren't configured — bail in both cases.
      if (!active) return;
      if (!sb) {
        setLoading(false);
        return;
      }
      sb.auth
        .getSession()
        .then(({ data }) => {
          if (!active) return;
          setUser(data.session?.user ?? null);
          setLoading(false);
        })
        .catch(() => {
          // A failed session fetch must not strand the UI in "loading" — the
          // account menu hides itself while loading, so leave it resolved.
          if (active) setLoading(false);
        });
      const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      unsub = () => sub.subscription.unsubscribe();
    });
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  const signIn: AuthState["signIn"] = async (email, password) => {
    const sb = await getSupabase();
    if (!sb) return { error: "Accounts aren't configured." };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  };

  const signUp: AuthState["signUp"] = async (email, password) => {
    const sb = await getSupabase();
    if (!sb) return { error: "Accounts aren't configured." };
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) return { error: error.message };
    // No session means the project requires email confirmation first.
    return { needsConfirm: !data.session };
  };

  const signInWithGoogle: AuthState["signInWithGoogle"] = async (next) => {
    const sb = await getSupabase();
    if (!sb) return { error: "Accounts aren't configured." };
    try {
      sessionStorage.setItem(AUTH_NEXT_KEY, safeNext(next));
    } catch {
      // Private mode or storage disabled — the callback just defaults.
    }
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // Only reached on failure — a success navigates away from this page.
    return { error: error?.message };
  };

  const signOut: AuthState["signOut"] = async () => {
    const sb = await getSupabase();
    await sb?.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configured: isSupabaseConfigured,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

/**
 * The session if there is one, null if there's no provider above.
 *
 * For leaves that only want to know "am I signed in, so should I mirror this
 * write to the cloud". Throwing there means a component whose job is a packing
 * list can take down the whole panel over an optional enhancement — the strict
 * useAuth stays the default for anything that genuinely needs a session.
 */
export function useOptionalAuth(): AuthState | null {
  return useContext(AuthContext) ?? null;
}
