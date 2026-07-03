import { getSupabase } from "@/lib/supabase/client";

export interface TripEditor {
  tripId: string;
  ownerId: string;
  editorId: string;
  editorEmail?: string;
}

/** Look up a user by email (via the secure RPC). */
export async function getUserIdByEmail(
  email: string
): Promise<string | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("get_user_id_by_email", {
    p_email: email,
  });
  if (error || !data) return null;
  return data as string;
}

/** Invite a user (by their resolved uuid) as an editor on a trip. */
export async function inviteEditor(
  tripId: string,
  ownerId: string,
  editorId: string
): Promise<{ error?: string }> {
  const sb = await getSupabase();
  if (!sb) return { error: "Not configured" };
  if (editorId === ownerId) return { error: "You can't invite yourself" };
  const { error } = await sb.from("trip_editors").insert({
    trip_id: tripId,
    owner_id: ownerId,
    editor_id: editorId,
  });
  if (error?.code === "23505") return { error: "Already invited" };
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

/** Fetch trips shared with the current user (as an editor). */
export async function fetchSharedWithMe(): Promise<
  { tripId: string; ownerId: string }[]
> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from("trip_editors")
    .select("trip_id, owner_id");
  return (data ?? []).map((r) => ({
    tripId: r.trip_id,
    ownerId: r.owner_id,
  }));
}
