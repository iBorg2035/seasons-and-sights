"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { AuthDialog } from "@/components/AuthDialog";
import { SharedLinksDialog } from "@/components/SharedLinksDialog";
import { deleteAccount } from "@/lib/supabase/trips";
import {
  SAVED_TRIPS_KEY as SAVED_KEY,
  getSavedTrips,
  notifySavedTripsChanged,
} from "@/lib/saved-trips";
import { buildExportPayload } from "@/lib/data-export";
import { clearRecords } from "@/lib/trip-records";
import { JOURNAL_ENTITY } from "@/lib/journal";
import { EXPENSE_ENTITY } from "@/lib/expenses";

/**
 * Download everything this device holds as a JSON file (their data, on
 * demand). Trips, journal entries and expenses — see buildExportPayload;
 * anything the app starts storing per trip has to be added there, or the
 * export quietly under-reports while looking complete.
 */
function exportTrips() {
  let data = "{}";
  try {
    data = JSON.stringify(buildExportPayload(), null, 2);
  } catch {
    /* ignore */
  }
  const url = URL.createObjectURL(
    new Blob([data], { type: "application/json" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "seasons-and-sights-data.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Nav account control. Renders nothing unless Supabase is configured. */
export function AccountMenu() {
  const { configured, loading, user, signOut } = useAuth();
  const [dialog, setDialog] = useState(false);
  const [menu, setMenu] = useState(false);
  const [sharesOpen, setSharesOpen] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
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
          className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-600 transition hover:bg-teal-50 hover:text-stone-900"
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
        className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-800 text-xs font-bold text-white transition hover:bg-sky-900"
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
            onClick={() => {
              setMenu(false);
              setSharesOpen(true);
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Shared links
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
              const deleted = await deleteAccount();
              if (!deleted) {
                setDeleteError(true);
                return;
              }
              setDeleteError(false);
              setMenu(false);
              try {
                // Cloud rows cascade off auth.users; local ones don't cascade
                // off anything. Clear every per-trip entity too, or deleting
                // the account would leave the diary sitting in localStorage.
                for (const trip of getSavedTrips()) {
                  clearRecords(JOURNAL_ENTITY, trip.id);
                  clearRecords(EXPENSE_ENTITY, trip.id);
                }
                localStorage.removeItem(SAVED_KEY);
                notifySavedTripsChanged();
              } catch {
                /* ignore */
              }
              await signOut();
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
          >
            Delete account
          </button>
          {deleteError && (
            <p className="px-3 py-2 text-xs text-rose-600">
              Couldn&apos;t delete the account. Please try again.
            </p>
          )}
        </div>
      )}
      {sharesOpen && (
        <SharedLinksDialog onClose={() => setSharesOpen(false)} />
      )}
    </div>
  );
}
