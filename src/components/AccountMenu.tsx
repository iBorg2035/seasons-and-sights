"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { AuthDialog } from "@/components/AuthDialog";
import { deleteAccount } from "@/lib/supabase/trips";

const SAVED_KEY = "seasons-saved-trips";

/** Download the user's saved trips as a JSON file (their data, on demand). */
function exportTrips() {
  let data = "[]";
  try {
    data = localStorage.getItem(SAVED_KEY) || "[]";
  } catch {
    /* ignore */
  }
  const url = URL.createObjectURL(
    new Blob([data], { type: "application/json" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "seasons-and-sights-trips.json";
  a.click();
  URL.revokeObjectURL(url);
}

/** Nav account control. Renders nothing unless Supabase is configured. */
export function AccountMenu() {
  const { configured, loading, user, signOut } = useAuth();
  const [dialog, setDialog] = useState(false);
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!configured || loading) return null;

  if (!user) {
    return (
      <>
        <button
          onClick={() => setDialog(true)}
          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-orange-100/70 hover:text-stone-900"
        >
          Sign in
        </button>
        {dialog && <AuthDialog onClose={() => setDialog(false)} />}
      </>
    );
  }

  const initial = (user.email ?? "?")[0].toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setMenu((m) => !m)}
        aria-haspopup="menu"
        aria-expanded={menu}
        title={user.email ?? "Account"}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white transition hover:bg-amber-600"
      >
        {initial}
      </button>
      {menu && (
        <div className="absolute right-0 z-[2000] mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          <p className="truncate px-3 py-2 text-xs text-slate-500">
            {user.email}
          </p>
          <button
            onClick={() => {
              setMenu(false);
              exportTrips();
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Export my trips
          </button>
          <button
            onClick={async () => {
              setMenu(false);
              await signOut();
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Sign out
          </button>
          <button
            onClick={async () => {
              if (
                !confirm(
                  "Delete your account and all saved trips? This can't be undone."
                )
              )
                return;
              setMenu(false);
              await deleteAccount();
              try {
                localStorage.removeItem(SAVED_KEY);
              } catch {
                /* ignore */
              }
              await signOut();
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
          >
            Delete account
          </button>
        </div>
      )}
    </div>
  );
}
