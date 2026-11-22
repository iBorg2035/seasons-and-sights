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
            onClick={async () => {
              // Sign-out takes the traveler's data off this device (it may be
              // a shared computer), so first make sure it's all in their
              // account, and ask before losing anything that isn't.
              setSigningOut(true);
              try {
                const synced = await flushToCloud(user.id);
                const held = await heldReceiptCount();
                const losses: string[] = [];
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
                if (
                  losses.length > 0 &&
                  !confirm(
                    `Signing out removes your trips from this device.\n\n${losses.join(
                      "\n"
                    )}\n\nSign out anyway?`
                  )
                ) {
                  return;
                }
                setMenu(false);
                await signOut();
                await clearLocalUserData();
              } finally {
                setSigningOut(false);
              }
            }}
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
              await clearLocalUserData();
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
