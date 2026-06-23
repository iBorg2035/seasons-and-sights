"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  getUserIdByEmail,
  inviteEditor,
  listEditors,
  removeEditor,
  type TripEditor,
} from "@/lib/supabase/collaborate";

export function InviteEditorDialog({
  tripId,
  ownerId,
  onClose,
}: {
  tripId: string;
  ownerId: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [editors, setEditors] = useState<TripEditor[]>([]);

  useEffect(() => {
    listEditors(tripId, ownerId).then(setEditors);
  }, [tripId, ownerId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const uid = await getUserIdByEmail(email.trim());
    if (!uid) {
      setMsg({
        text: "No account found for that email. They need to sign up first.",
        ok: false,
      });
      setBusy(false);
      return;
    }
    const { error } = await inviteEditor(tripId, ownerId, uid);
    if (error) {
      setMsg({ text: error, ok: false });
    } else {
      setMsg({ text: `Invited ${email}`, ok: true });
      setEmail("");
      listEditors(tripId, ownerId).then(setEditors);
    }
    setBusy(false);
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
          aria-label="Invite a travel partner"
          className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Invite a travel partner
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-amber-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <p className="mb-4 text-sm text-slate-500">
            They&apos;ll be able to view and edit this trip in their own planner.
          </p>
          <form onSubmit={invite} className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="partner@example.com"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              {busy ? "…" : "Invite"}
            </button>
          </form>
          {msg && (
            <p
              className={`mt-2 text-sm ${
                msg.ok ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {msg.text}
            </p>
          )}
          {editors.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-2 text-xs font-medium text-slate-400">
                Current editors
              </p>
              <ul className="space-y-1">
                {editors.map((ed) => (
                  <li
                    key={ed.editorId}
                    className="flex items-center justify-between text-sm text-slate-700"
                  >
                    <span className="truncate">{ed.editorId}</span>
                    <button
                      onClick={async () => {
                        await removeEditor(tripId, ownerId, ed.editorId);
                        setEditors((prev) =>
                          prev.filter((x) => x.editorId !== ed.editorId)
                        );
                      }}
                      className="text-xs text-rose-500 hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
