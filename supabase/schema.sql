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
