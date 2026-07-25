"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  listMyShares,
  revokeShare,
  type SharedLink,
} from "@/lib/supabase/trips";

function fmtDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Manage the share links you've published. Revoking deletes the row, which
 * breaks the URL for anyone holding it.
 *
 * Only links published while signed in appear here — a signed-out share has no
 * recorded creator, so there's no one the database can authorise to revoke it.
 * The empty state says so rather than implying you have none.
 */
export function SharedLinksDialog({ onClose }: { onClose: () => void }) {
  const [links, setLinks] = useState<SharedLink[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listMyShares()
      .then((rows) => active && setLinks(rows))
      .catch(() => {
        if (!active) return;
        setLinks([]);
        setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function revoke(token: string) {
    setError(null);
    setRevoking(token);
    const ok = await revokeShare(token);
    setRevoking(null);
    if (!ok) {
      // Never drop it from the list on failure — that would imply the link is
      // dead when it's still live.
      setError("Couldn't revoke that link. It may still be active.");
      return;
    }
    setLinks((prev) => (prev ?? []).filter((l) => l.token !== token));
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/trip/${token}`
      );
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked — not worth an error state here */
    }
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
          aria-label="Shared links"
          className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Shared links
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-teal-500 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <p className="mb-4 text-sm text-slate-500">
            Anyone with one of these links can view that trip. Revoking breaks
            the link immediately.
          </p>

          {links === null && (
            <div
              role="status"
              aria-label="Loading shared links"
              className="h-16 animate-pulse rounded-lg bg-slate-100"
            />
          )}

          {loadFailed && (
            <p role="alert" className="text-sm text-rose-600">
              Couldn&apos;t load your shared links.
            </p>
          )}

          {links !== null && !loadFailed && links.length === 0 && (
            <p className="text-sm text-slate-500">
              No shared links yet. Links you create while signed out aren&apos;t
              listed here — they have no owner, so they can&apos;t be revoked.
            </p>
          )}

          {links !== null && links.length > 0 && (
            <ul className="space-y-1">
              {links.map((link) => (
                <li
                  key={link.token}
                  className="flex items-center justify-between gap-3 rounded-lg px-1 py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {link.name || "Untitled trip"}
                    </span>
                    <span className="block text-xs text-slate-400">
                      Shared {fmtDate(link.createdAt)}
                    </span>
                  </span>
                  <button
                    onClick={() => copy(link.token)}
                    className="flex-none text-xs font-medium text-teal-700 hover:underline"
                  >
                    {copied === link.token ? "Copied" : "Copy"}
                  </button>
                  <button
                    onClick={() => revoke(link.token)}
                    disabled={revoking === link.token}
                    className="flex-none rounded-md border border-rose-200 px-2 py-0.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                  >
                    {revoking === link.token ? "…" : "Revoke"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p role="alert" className="mt-2 text-sm text-rose-600">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
