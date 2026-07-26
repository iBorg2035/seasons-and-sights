"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/contexts/auth-context";

/** Google's four-colour "G", inlined so the dialog needs no network request. */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.5 6.6-16.1z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.5 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.5A22 22 0 0 0 2 24c0 3.6.9 6.9 2.5 9.9l7.3-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.4c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 3.9 29.9 2 24 2 15.5 2 8.1 6.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9.4 12.2-9.4z"
      />
    </svg>
  );
}

/** Sign-in & sign-up modal: Google, or email/password. */
export function AuthDialog({ onClose }: { onClose: () => void }) {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  // Close on Escape and lock background scroll while the modal is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const heading = confirm
    ? "Check your email"
    : mode === "in"
      ? "Sign in"
      : "Create account";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res =
      mode === "in"
        ? await signIn(email, password)
        : await signUp(email, password);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if ("needsConfirm" in res && res.needsConfirm) {
      setConfirm(true);
      return;
    }
    onClose();
  }

  async function google() {
    setBusy(true);
    setError(null);
    // Come back to wherever the dialog was opened from.
    const res = await signInWithGoogle(
      window.location.pathname + window.location.search
    );
    // A success redirects away, so reaching here at all means it didn't start.
    setBusy(false);
    setError(res.error ?? "Couldn't start Google sign-in.");
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[3000] overflow-y-auto bg-black/40"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={heading}
          className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
        {confirm ? (
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-900">{heading}</p>
            <p className="mt-2 text-sm text-slate-600">
              We sent a confirmation link to <strong>{email}</strong>. Confirm it,
              then sign in to sync your trips.
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-sky-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-900"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              Sync your saved trips across devices.
            </p>

            {/* Above the form: it's the faster path, and burying it under a
                password field is what makes people type a password instead. */}
            <button
              type="button"
              onClick={google}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <GoogleMark />
              Continue with Google
            </button>
            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">or</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                required
                autoFocus
                aria-label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
              <input
                type="password"
                required
                minLength={6}
                aria-label="Password (6+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (6+ characters)"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              />
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-sky-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-900 disabled:opacity-60"
              >
                {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
              </button>
            </form>
            <button
              onClick={() => {
                setMode((m) => (m === "in" ? "up" : "in"));
                setError(null);
              }}
              className="mt-4 w-full text-center text-sm text-slate-500 hover:text-teal-700"
            >
              {mode === "in"
                ? "Need an account? Sign up"
                : "Have an account? Sign in"}
            </button>
          </>
        )}
        </div>
      </div>
    </div>,
    document.body
  );
}
