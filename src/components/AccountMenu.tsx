"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { AuthDialog } from "@/components/AuthDialog";
import { SharedLinksDialog } from "@/components/SharedLinksDialog";
import { deleteAccount } from "@/lib/supabase/trips";
import { downloadExport } from "@/lib/data-export";
import {
  clearLocalUserData,
  flushToCloud,
  heldReceiptCount,
} from "@/lib/local-user-data";
import { unsavedWork } from "@/lib/use-unsaved-guard";
import { JOURNAL_ENTITY } from "@/lib/journal";
import { EXPENSE_ENTITY } from "@/lib/expenses";
import { RESERVATION_ENTITY } from "@/lib/reservations";


/** Nav account control. Renders nothing unless Supabase is configured. */
export function AccountMenu() {
  const { configured, loading, user, signOut } = useAuth();
  const [dialog, setDialog] = useState(false);
  const [menu, setMenu] = useState(false);
  const [sharesOpen, setSharesOpen] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  /** What would be lost if sign-out went ahead — shown in-app, since a
   *  browser may suppress window.confirm (background tab, "don't allow this
   *  site to prompt") and silently return false. */
  const [pendingLosses, setPendingLosses] = useState<string[] | null>(null);
  const [signOutError, setSignOutError] = useState<string | null>(null);
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
  const userId = user.id;

  /** End the session, and only once it's really gone, clear the device. */
  async function finishSignOut() {
    setSigningOut(true);
    try {
      const { error } = await signOut();
      if (error) {
        setSignOutError(
          "Couldn't sign out — check your connection and try again. Your trips are still on this device."
        );
        return;
      }
      setPendingLosses(null);
      setMenu(false);
      await clearLocalUserData();
    } catch {
      setSignOutError("Something went wrong signing out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  async function startSignOut() {
    // Sign-out takes the traveler's data off this device (it may be a shared
    // computer), so first make sure it's all in their account, and ask before
    // losing anything that isn't.
    setSignOutError(null);
    setPendingLosses(null);
    setSigningOut(true);
    const losses: string[] = [];
    try {
      const synced = await flushToCloud(userId);
      const held = await heldReceiptCount().catch(() => 0);
      // Drafts only live in the page: clearing the device drops them, and
      // sign-out doesn't navigate, so the page's own leave guard never fires.
      for (const what of unsavedWork()) {
        losses.push(`Unsaved ${what} will be lost.`);
      }
      if (!synced) {
        losses.push(
          "Some changes haven't reached your account yet (you may be offline) and will be lost."
        );
      }
      if (held > 0) {
        losses.push(
          `${held} receipt photo${held === 1 ? "" : "s"} waiting to be scanned will be deleted.`
        );
      }
    } finally {
      setSigningOut(false);
    }
    if (losses.length > 0) {
      setPendingLosses(losses);
      return;
    }
    await finishSignOut();
  }

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
              if (!downloadExport()) setExportError(true);
              else setExportError(false);
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
          >
            Export my data
          </button>
          {exportError && (
            <p className="px-3 py-2 text-xs text-rose-600">
              Couldn&apos;t build the export. Please try again.
            </p>
          )}
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
            disabled={signingOut}
            onClick={startSignOut}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            {signingOut ? "Signing out…" : "Sign out"}
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
              // Cloud rows cascade off auth.users; local ones don't cascade
              // off anything, so the device is cleared explicitly.
              try {
                await clearLocalUserData();
              } finally {
                await signOut();
              }
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
      {(pendingLosses || signOutError) && (
        <div
          role="alertdialog"
          aria-label="Sign out"
          className="absolute right-0 z-[2001] mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lg"
        >
          {pendingLosses ? (
            <>
              <p className="font-medium text-slate-800">
                Signing out removes your trips from this device.
              </p>
              {pendingLosses.map((l) => (
                <p key={l} className="mt-2 text-slate-600">
                  {l}
                </p>
              ))}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setPendingLosses(null)}
                  className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50"
                >
                  Stay signed in
                </button>
                <button
                  disabled={signingOut}
                  onClick={finishSignOut}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {signingOut ? "Signing out…" : "Sign out anyway"}
                </button>
              </div>
            </>
          ) : null}
          {signOutError && (
            <div className={pendingLosses ? "mt-3" : undefined}>
              <p role="alert" className="text-rose-600">
                {signOutError}
              </p>
              {!pendingLosses && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => setSignOutError(null)}
                    className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {sharesOpen && (
        <SharedLinksDialog onClose={() => setSharesOpen(false)} />
      )}
    </div>
  );
}
