import { getSupabase } from "@/lib/supabase/client";

export interface SavedTrip {
  id: string;
  name: string;
  start: number;
  stops: [string, number][];
}

interface TripRow {
  id: string;
  name: string;
  data: { start: number; stops: [string, number][] };
}

function fromRow(row: TripRow): SavedTrip {
  return { id: row.id, name: row.name, start: row.data.start, stops: row.data.stops };
}

/** All of the signed-in user's trips (RLS scopes this to them). */
export async function fetchRemoteTrips(): Promise<SavedTrip[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("trips")
    .select("id, name, data")
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
      updated_at: new Date().toISOString(),
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
 * Union local + remote by id (remote wins on conflict, since it's the synced
 * canonical copy). `localOnly` are trips to push up — e.g. ones made before
 * signing in.
 */
export function mergeTrips(
  local: SavedTrip[],
  remote: SavedTrip[]
): { merged: SavedTrip[]; localOnly: SavedTrip[] } {
  const remoteIds = new Set(remote.map((t) => t.id));
  const localOnly = local.filter((t) => !remoteIds.has(t.id));
  return { merged: [...remote, ...localOnly], localOnly };
}
