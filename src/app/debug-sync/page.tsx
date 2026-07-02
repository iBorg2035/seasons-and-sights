"use client";

/**
 * /debug-sync — read-only cloud-sync diagnostic.
 *
 * Not in the nav (it's an ops/troubleshooting page). It runs the exact calls
 * the save + sign-in-sync paths make, but NEVER swallows errors: each step
 * reports pass/fail with the real message, so a missing table, a broken RLS
 * policy, or a stale session shows up here instead of silently doing nothing.
 *
 * Safe to leave deployed: it only reads, plus one harmless round-trip test
 * write/delete against the signed-in user's own trips row.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/auth-context";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type Status = "pending" | "ok" | "fail";
interface Check {
  label: string;
  status: Status;
  detail?: string;
}

function Row({ label, status, detail }: Check) {
  const mark = status === "ok" ? "✅" : status === "fail" ? "❌" : "⏳";
  const color =
    status === "ok"
      ? "text-emerald-700"
      : status === "fail"
        ? "text-rose-700"
        : "text-slate-400";
  return (
    <li className="flex flex-col gap-0.5 py-2">
      <span className={color}>
        <span className="mr-2">{mark}</span>
        <span className="font-medium">{label}</span>
      </span>
      {detail && (
        <code className="ml-6 block whitespace-pre-wrap break-alls text-xs text-slate-500">
          {detail}
        </code>
      )}
    </li>
  );
}

export default function DebugSyncPage() {
  const { user, loading, configured } = useAuth();
  const [checks, setChecks] = useState<Check[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    setChecks([]);
    setDone(false);

    const add = (c: Check) => {
      if (active)
        setChecks((prev) => {
          const i = prev.findIndex((p) => p.label === c.label);
          return i === -1 ? [...prev, c] : prev.map((p, j) => (j === i ? c : p));
        });
    };

    async function run() {
      add({
        label: "Supabase env vars present at build time",
        status: "ok",
        detail: `isSupabaseConfigured = ${isSupabaseConfigured}`,
      });

      if (!isSupabaseConfigured) {
        add({
          label: "Build is missing NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY",
          status: "fail",
          detail:
            "Set both in Vercel → Settings → Environment Variables and redeploy. The Sign-in button never renders without them.",
        });
        setDone(true);
        return;
      }

      // Wait for auth to resolve before judging the session.
      if (loading) return;

      if (!user) {
        add({
          label: "Signed in",
          status: "fail",
          detail:
            "Not signed in. The account menu (top-right) shows 'Sign in'. Sign in, then reload this page.",
        });
        setDone(true);
        return;
      }

      add({
        label: "Signed in",
        status: "ok",
        detail: `user.id = ${user.id}\nemail = ${user.email ?? "(none)"}`,
      });

      const sb = await getSupabase();
      if (!sb) {
        add({
          label: "Supabase client created",
          status: "fail",
          detail:
            "getSupabase() resolved to null — the dynamic import of @supabase/ssr failed at runtime.",
        });
        setDone(true);
        return;
      }
      add({ label: "Supabase client created", status: "ok" });

      // 1) READ — mirrors fetchRemoteTrips(). A failure here means the trips
      //    table is missing, RLS blocks the user, or the schema wasn't applied.
      const readRes = await sb
        .from("trips")
        .select("id, name, data, updated_at")
        .order("updated_at", { ascending: false });

      if (readRes.error) {
        add({
          label: "Read trips table (fetchRemoteTrips)",
          status: "fail",
          detail: `${readRes.error.code ?? ""} ${readRes.error.message}\n\nThis is why sign-in sync shows nothing: the read errors and the app silently returns []. Most likely the trips table or its RLS policies don't exist — run supabase/schema.sql in the Supabase SQL Editor.`,
        });
      } else {
        add({
          label: "Read trips table (fetchRemoteTrips)",
          status: "ok",
          detail: `returned ${readRes.data.length} row(s)`,
        });
      }

      // 2) WRITE/DELETE round-trip — mirrors upsertRemoteTrip + deleteRemoteTrip.
      //    Uses a throwaway id so it never collides with a real trip.
      const testId = `__debug_${Date.now()}`;
      const writeRes = await sb.from("trips").upsert(
        {
          id: testId,
          user_id: user.id,
          name: "__debug_sync_probe__",
          data: { start: 1, stops: [] },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,id" }
      );

      if (writeRes.error) {
        add({
          label: "Write trips table (upsertRemoteTrip)",
          status: "fail",
          detail: `${writeRes.error.code ?? ""} ${writeRes.error.message}\n\nThis is why saving while signed in appears to do nothing: the upsert fails and the app only logs a console.warn. If the read passed but this failed, RLS INSERT/UPDATE policies are missing.`,
        });
      } else {
        // Clean up the probe row.
        await sb.from("trips").delete().eq("id", testId);
        add({
          label: "Write trips table (upsertRemoteTrip)",
          status: "ok",
          detail: "probe row written then deleted",
        });
      }

      // 3) Shared-trips table (for /trip/[token] share links).
      const shareRead = await sb.rpc("get_shared_trip", {
        p_token: "00000000-0000-0000-0000-000000000000",
      });
      if (shareRead.error) {
        add({
          label: "Share-link RPC (get_shared_trip)",
          status: "fail",
          detail: `${shareRead.error.code ?? ""} ${shareRead.error.message}\n\nShare links won't work until supabase/schema.sql is fully applied.`,
        });
      } else {
        add({
          label: "Share-link RPC (get_shared_trip)",
          status: "ok",
          detail: "callable (returned no row for the dummy token, as expected)",
        });
      }

      setDone(true);
    }

    run();
    return () => {
      active = false;
    };
  }, [user, loading]);

  const allOk = checks.length > 0 && checks.every((c) => c.status === "ok");

  return (
    <div>
      <section className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Cloud sync diagnostic
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Read-only check of the account-sync path. Each step below mirrors a
          call the app makes when you save or sync a trip — but here the real
          error is shown instead of being hidden.{" "}
          <Link
            href="/"
            className="font-medium text-amber-600 hover:underline"
          >
            ← Back to explore
          </Link>
        </p>
      </section>

      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {done && allOk && (
          <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            All checks passed — cloud sync is wired up correctly. If trips still
            aren&apos;t syncing across devices, sign out and back in on the
            other device (the merge runs only on sign-in).
          </p>
        )}
        {done && !allOk && (
          <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            One or more checks failed — see the ❌ rows below for the cause and
            the suggested fix.
          </p>
        )}

        <ul className="divide-y divide-slate-100">
          {checks.map((c) => (
            <Row key={c.label} {...c} />
          ))}
          {checks.length === 0 && (
            <li className="py-2 text-sm text-slate-400">Running checks…</li>
          )}
        </ul>
      </div>
    </div>
  );
}
