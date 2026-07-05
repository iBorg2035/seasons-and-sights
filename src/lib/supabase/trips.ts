import { getSupabase } from "@/lib/supabase/client";
import { recordSyncResult } from "@/lib/sync-status";
import type { SightType } from "@/types";

export interface SavedTrip {
  id: string;
  /** Remote owner id. For shared trips this differs from the signed-in user. */
  ownerId?: string;
  name: string;
  start: number;
  stops: [string, number][];
  interests?: SightType[];
  /** Epoch ms of the last edit; drives last-write-wins on sync. */
  updatedAt?: number;
}

interface TripRow {
  id: string;
  user_id?: string;
  name: string;
  data: { start: number; stops: [string, number][]; interests?: SightType[] };
  updated_at?: string;
}

function fromRow(row: TripRow): SavedTrip {
  return {
    id: row.id,
    ownerId: row.user_id,
    name: row.name,
    start: row.data.start,
    stops: row.data.stops,
    interests: row.data.interests,
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : 0,
  };
}

/**
 * Record one remote trips-table outcome (the SyncBadge reads it) and normalize
 * to a boolean. Every trips-table call in this file funnels through here, so
 * error surfacing can't be added to one function and missed on its sibling —
 * which is exactly how deleteRemoteTrip shipped silent while upsert got fixed.
 */
function reportSync(
  kind: "read" | "write",
  error: { message: string } | null
): boolean {
  if (error) {
    recordSyncResult({ kind, ok: false, message: error.message });
    console.warn(`[trips] cloud ${kind} failed:`, error.message);
    return false;
  }
  recordSyncResult({ kind, ok: true });
  return true;
}

/** All of the signed-in user's trips (RLS scopes this to them). */
export async function fetchRemoteTrips(): Promise<SavedTrip[]> {
  const sb = await getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("trips")
    .select("id, user_id, name, data, updated_at")
    .order("updated_at", { ascending: false });
  if (!reportSync("read", error) || !data) return [];
  return (data as TripRow[]).map(fromRow);
}

/** Persist a trip to the signed-in user's cloud. Returns true only if it
 *  actually landed — callers use this to confirm a save instead of assuming it. */
export async function upsertRemoteTrip(userId: string, trip: SavedTrip): Promise<boolean> {
  const sb = await getSupabase();
  if (!sb) return false;
  const ownerId = trip.ownerId ?? userId;
  const payload = {
    name: trip.name,
    data: { start: trip.start, stops: trip.stops, interests: trip.interests },
    // Preserve the trip's own edit time so last-write-wins stays correct.
    updated_at: new Date(trip.updatedAt ?? Date.now()).toISOString(),
  };
  if (ownerId !== userId) {
    const { data, error } = await sb
      .from("trips")
      .update(payload)
      .eq("user_id", ownerId)
      .eq("id", trip.id)
      .select("id")
      .maybeSingle();
    if (error) return reportSync("write", error);
    if (!data) {
      return reportSync("write", {
        message: "Shared trip could not be updated",
      });
    }
    return reportSync("write", null);
  }
  const { error } = await sb.from("trips").upsert(
    {
      id: trip.id,
      user_id: ownerId,
      ...payload,
    },
    { onConflict: "user_id,id" }
  );
  return reportSync("write", error);
}

/**
 * Delete a trip row from the cloud. Returns whether the delete landed;
 * failures surface on the sync badge. There are no delete tombstones, so a
 * failed remote delete means the row can reappear on the next sign-in merge —
 * surfacing the failure is what lets the user know to retry.
 */
export async function deleteRemoteTrip(id: string): Promise<boolean> {
  const sb = await getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("trips").delete().eq("id", id);
  return reportSync("write", error);
}

/**
 * Publish a trip to a public, random-token share link. Works for anyone
 * (signed in or not). Returns the token, or null if Supabase isn't configured.
 */
export async function publishShare(trip: {
  name: string;
  start: number;
  stops: [string, number][];
}): Promise<string | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const token = crypto.randomUUID();
  const { error } = await sb.from("shared_trips").insert({
    token,
    name: trip.name,
    data: { start: trip.start, stops: trip.stops },
  });
  return error ? null : token;
}

/** Delete the signed-in user's account and all their trips (cascades). */
export async function deleteAccount(): Promise<boolean> {
  const sb = await getSupabase();
  if (!sb) return false;
  const { error } = await sb.rpc("delete_account");
  return !error;
}

/** Read a shared trip by token (via the enumeration-safe RPC). */
export async function fetchSharedTrip(
  token: string
): Promise<{ name: string; start: number; stops: [string, number][] } | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("get_shared_trip", { p_token: token });
  const row = (data as { name: string; data: TripRow["data"] }[] | null)?.[0];
  if (error || !row) return null;
  return { name: row.name, start: row.data.start, stops: row.data.stops };
}

/**
 * Union local + remote by id with last-write-wins (newer `updatedAt` per id).
 * `toPush` are the trips whose local copy should be written to the cloud —
 * local-only trips and ones edited locally more recently than the remote copy.
 */
export function mergeTrips(
  local: SavedTrip[],
  remote: SavedTrip[]
): { merged: SavedTrip[]; toPush: SavedTrip[] } {
  const byId = new Map<string, SavedTrip>();
  for (const r of remote) byId.set(r.id, r);

  const toPush: SavedTrip[] = [];
  for (const l of local) {
    const r = byId.get(l.id);
    // `>=` (not `>`): on a timestamp tie, keep the local copy and push it. This
    // matters for the degenerate updatedAt: 0 case (a malformed/legacy row),
    // where strict `>` would silently drop the local trip from the merge and
    // the push list. Local is also the user's freshest intent on a true tie.
    if (!r || (l.updatedAt ?? 0) >= (r.updatedAt ?? 0)) {
      const next = r ? { ...l, ownerId: l.ownerId ?? r.ownerId } : l;
      byId.set(l.id, next);
      toPush.push(next);
    }
  }

  const merged = [...byId.values()].sort(
    (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  );
  return { merged, toPush };
}
