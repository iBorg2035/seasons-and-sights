-- Seasons & Sights — cloud trip sync schema.
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.

create table if not exists public.trips (
  id         text        not null,                -- client-generated trip id
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       text        not null default 'Trip',
  data       jsonb       not null,                -- { start, stops }
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Row-level security: every user can only see and modify their own trips.
alter table public.trips enable row level security;

drop policy if exists "Users manage their own trips" on public.trips;
create policy "Users manage their own trips"
  on public.trips
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Shareable trips ──────────────────────────────────────────────────────────
-- Public, read-only share links. Anyone (even signed-out) can publish a trip to
-- a random-token link, and anyone with the link can view it. Reads go through a
-- security-definer function keyed by token, so shares can't be enumerated.

create table if not exists public.shared_trips (
  token      uuid        primary key default gen_random_uuid(),
  name       text        not null default 'Trip',
  data       jsonb       not null,                -- { start, stops }
  created_at timestamptz not null default now()
);

-- Bound the size of anonymous, unauthenticated inserts so the share endpoint
-- can't be used to dump large payloads. Applied via ALTER so it also patches
-- tables created before these limits existed.
-- Note: CHECK expressions must be IMMUTABLE, so we measure size via the text
-- representation (length(data::text)) rather than pg_column_size(), which is STABLE.
alter table public.shared_trips drop constraint if exists shared_trips_name_len;
alter table public.shared_trips add  constraint shared_trips_name_len  check (length(name) <= 200);
alter table public.shared_trips drop constraint if exists shared_trips_data_size;
alter table public.shared_trips add  constraint shared_trips_data_size check (length(data::text) < 8192);

alter table public.shared_trips enable row level security;

-- Anyone may publish a share. No SELECT policy is granted, so the table can't be
-- listed; reads happen only via get_shared_trip() below.
drop policy if exists "Anyone can publish a share" on public.shared_trips;
create policy "Anyone can publish a share"
  on public.shared_trips
  for insert
  to anon, authenticated
  with check (true);

drop function if exists public.get_shared_trip(uuid);
create or replace function public.get_shared_trip(p_token uuid)
returns table (name text, data jsonb)
language sql
security definer
set search_path = public
as $$
  select name, data from public.shared_trips where token = p_token;
$$;

grant execute on function public.get_shared_trip(uuid) to anon, authenticated;

-- ── Account deletion (GDPR) ──────────────────────────────────────────────────
-- Lets a signed-in user delete their own account; their trips cascade away via
-- the foreign key. Runs as definer so it can remove the auth.users row.
create or replace function public.delete_account()
returns void
language sql
security definer
set search_path = public
as $$
  delete from auth.users where id = auth.uid();
$$;

grant execute on function public.delete_account() to authenticated;

-- ── Trip collaboration ───────────────────────────────────────────────────────
-- Lets a trip owner invite a partner by email. The partner can view and edit
-- the trip (add/remove stops, change duration). Cascade-deletes when the trip
-- is removed.

create table if not exists public.trip_editors (
  trip_id    text not null,
  owner_id   uuid not null,
  editor_id  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, trip_id, editor_id),
  foreign key (owner_id, trip_id) references public.trips (user_id, id) on delete cascade
);

alter table public.trip_editors enable row level security;

-- The trip owner can manage editors.
drop policy if exists "Owners manage editors" on public.trip_editors;
create policy "Owners manage editors"
  on public.trip_editors
  for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- An editor can see their own row (so they know they're invited).
drop policy if exists "Editors see their invites" on public.trip_editors;
create policy "Editors see their invites"
  on public.trip_editors
  for select
  to authenticated
  using (auth.uid() = editor_id);

-- Widen the trips RLS so editors can read AND update the owner's trip.
drop policy if exists "Editors can read trips" on public.trips;
create policy "Editors can read trips"
  on public.trips
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.trip_editors
      where trip_editors.owner_id = trips.user_id
        and trip_editors.trip_id = trips.id
        and trip_editors.editor_id = auth.uid()
    )
  );

drop policy if exists "Editors can update trips" on public.trips;
create policy "Editors can update trips"
  on public.trips
  for update
  to authenticated
  using (
    exists (
      select 1 from public.trip_editors
      where trip_editors.owner_id = trips.user_id
        and trip_editors.trip_id = trips.id
        and trip_editors.editor_id = auth.uid()
    )
  );

-- Look up a user id by email (for invite-by-email). Security definer so the
-- caller can't enumerate the full users table.
drop function if exists public.get_user_id_by_email(text);
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from auth.users where email = lower(p_email) limit 1;
$$;

grant execute on function public.get_user_id_by_email(text) to authenticated;
