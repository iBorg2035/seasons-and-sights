import { getSupabase } from "@/lib/supabase/client";

export interface TripEditor {
  tripId: string;
  ownerId: string;
  editorId: string;
  editorEmail?: string;
}

/** Invite a user by email without revealing whether the account exists. */
export async function inviteEditorByEmail(
  tripId: string,
  email: string
): Promise<{ error?: string }> {
  const sb = await getSupabase();
  if (!sb) return { error: "Not configured" };
  const { error } = await sb.rpc("invite_trip_editor_by_email", {
    p_trip_id: tripId,
    p_email: email.trim(),
  });
  return { error: error?.message };
}

/** Remove an editor from a trip. */
export async function removeEditor(
  tripId: string,
  ownerId: string,
  editorId: string
): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb
    .from("trip_editors")
    .delete()
    .eq("trip_id", tripId)
    .eq("owner_id", ownerId)
    .eq("editor_id", editorId);
}

/** List editors for a trip the current user owns. Resolves editor emails via
 *  the get_user_emails RPC so the UI can show a recognizable address instead of
 *  an opaque UUID; degrades gracefully to the UUID if the RPC is absent or
 *  fails (e.g. the migration hasn't been applied yet, or Supabase is unset). */
export async function listEditors(
  tripId: string,
  ownerId: string
): Promise<TripEditor[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("trip_editors")
    .select("trip_id, owner_id, editor_id")
    .eq("trip_id", tripId)
    .eq("owner_id", ownerId);
  const editors = (data ?? []).map((r) => ({
    tripId: r.trip_id,
    ownerId: r.owner_id,
    editorId: r.editor_id,
  }));

  // Best-effort email resolution. Anything going wrong (RPC missing, RLS,
  // network) leaves editorEmail undefined and the caller falls back to the id.
  try {
    const ids = editors.map((e) => e.editorId);
    const { data: rows } = await sb.rpc("get_user_emails", { p_ids: ids });
    const byId = new Map(
      ((rows ?? []) as { id: string; email: string }[]).map((r) => [r.id, r.email])
    );
    return editors.map((e) => ({ ...e, editorEmail: byId.get(e.editorId) }));
  } catch {
    return editors;
  }
}

/**
 * Leave a trip someone else shared with you, by deleting your own editor row.
 *
 * Returns whether the row actually went. `.select()` matters: without the
 * "Editors can leave" policy in supabase/schema.sql, RLS filters the delete to
 * zero rows and reports no error — and telling someone they've left a trip
 * that then reappears on the next sync is the bug this exists to fix.
 */
export async function leaveSharedTrip(
  tripId: string,
  ownerId: string,
  editorId: string
): Promise<boolean> {
  const sb = await getSupabase();
  if (!sb) return false;
  const { data, error } = await sb
    .from("trip_editors")
    .delete()
    .eq("trip_id", tripId)
    .eq("owner_id", ownerId)
    .eq("editor_id", editorId)
    .select("trip_id");
  return !error && !!data && data.length > 0;
}
