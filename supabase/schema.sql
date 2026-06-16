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
