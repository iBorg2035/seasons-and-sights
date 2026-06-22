import { getSupabase } from "@/lib/supabase/client";

export interface SavedTrip {
  id: string;
  name: string;
  start: number;
  stops: [string, number][];
  /** Epoch ms of the last edit; drives last-write-wins on sync. */
  updatedAt?: number;
}

interface TripRow {
  id: string;
  name: string;
  data: { start: number; stops: [string, number][] };
  updated_at?: string;
}

function fromRow(row: TripRow): SavedTrip {
  return {
    id: row.id,
    name: row.name,
    start: row.data.start,
    stops: row.data.stops,
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : 0,
  };
}

/** All of the signed-in user's trips (RLS scopes this to them). */
export async function fetchRemoteTrips(): Promise<SavedTrip[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("trips")
    .select("id, name, data, updated_at")
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return (data as TripRow[]).map(fromRow);
}

export async function upsertRemoteTrip(userId: string, trip: SavedTrip): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("trips").upsert(
    {
      id: trip.id,
      user_id: userId,
      name: trip.name,
      data: { start: trip.start, stops: trip.stops },
      // Preserve the trip's own edit time so last-write-wins stays correct.
      updated_at: new Date(trip.updatedAt ?? Date.now()).toISOString(),
    },
    { onConflict: "user_id,id" }
  );
}

export async function deleteRemoteTrip(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("trips").delete().eq("id", id);
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
  const sb = getSupabase();
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
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.rpc("delete_account");
  return !error;
}

/** Read a shared trip by token (via the enumeration-safe RPC). */
export async function fetchSharedTrip(
  token: string
): Promise<{ name: string; start: number; stops: [string, number][] } | null> {
  const sb = getSupabase();
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
    if (!r || (l.updatedAt ?? 0) > (r.updatedAt ?? 0)) {
      byId.set(l.id, l);
      toPush.push(l);
    }
  }

  const merged = [...byId.values()].sort(
    (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
  );
  return { merged, toPush };
}
