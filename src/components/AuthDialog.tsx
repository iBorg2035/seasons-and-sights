"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/contexts/auth-context";

/** Email/password sign-in & sign-up modal. */
export function AuthDialog({ onClose }: { onClose: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

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

  return createPortal(
    <div
      className="fixed inset-0 z-[3000] overflow-y-auto bg-black/40"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
        {confirm ? (
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-900">Check your email</p>
            <p className="mt-2 text-sm text-slate-600">
              We sent a confirmation link to <strong>{email}</strong>. Confirm it,
              then sign in to sync your trips.
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {mode === "in" ? "Sign in" : "Create account"}
              </h2>
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
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (6+ characters)"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
              >
                {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
              </button>
            </form>
            <button
              onClick={() => {
                setMode((m) => (m === "in" ? "up" : "in"));
                setError(null);
              }}
              className="mt-4 w-full text-center text-sm text-slate-500 hover:text-amber-600"
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
