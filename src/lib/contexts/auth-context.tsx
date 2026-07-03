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
  signOut: () => Promise<void>;
}

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
