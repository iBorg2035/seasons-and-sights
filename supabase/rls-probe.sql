-- Adversarial RLS probe for public.trip_records (journal entries + expenses).
--
-- Unit tests run against a mocked Supabase client, so they can prove the merge
-- logic but not the access rules. This proves the access rules against the real
-- database. Every block runs inside a transaction that is never committed, so
-- nothing persists — verified by the leftover check at the end.
--
-- Run in the Supabase SQL editor. Replace <OWNER_UUID> with a real
-- auth.users.id (the FK requires one); <OTHER_UUID> can be any other UUID,
-- since the point is that it sees nothing.
--
-- Expected: every count below is 0, and the forged insert raises
-- "new row violates row-level security policy".

-- ── 1. Another signed-in user cannot read, tamper with, or delete a row ──────
begin;
set local role authenticated;

select set_config('request.jwt.claims',
  '{"sub":"<OWNER_UUID>","role":"authenticated"}', true);
insert into public.trip_records (user_id, trip_id, entity, id, data, updated_at)
values ('<OWNER_UUID>', 'rls-probe', 'journal', 'e1',
        '{"day":"2026-09-05","text":"owner private note"}'::jsonb, now());

select set_config('request.jwt.claims',
  '{"sub":"<OTHER_UUID>","role":"authenticated"}', true);

with
  upd as (update public.trip_records set data = '{"text":"tampered"}'::jsonb
          where trip_id = 'rls-probe' returning 1),
  del as (delete from public.trip_records
          where trip_id = 'rls-probe' returning 1)
select
  (select count(*) from public.trip_records where trip_id = 'rls-probe') as other_can_read,
  (select count(*) from upd) as other_can_update,
  (select count(*) from del) as other_can_delete;
rollback;

-- ── 2. Signed-out users see nothing ─────────────────────────────────────────
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"<OWNER_UUID>","role":"authenticated"}', true);
insert into public.trip_records (user_id, trip_id, entity, id, data, updated_at)
values ('<OWNER_UUID>', 'rls-probe', 'journal', 'e1',
        '{"text":"owner private note"}'::jsonb, now());

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select count(*) as anon_can_read
from public.trip_records where trip_id = 'rls-probe';
rollback;

-- ── 3. A forged user_id is refused by WITH CHECK, not silently accepted ─────
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"<OTHER_UUID>","role":"authenticated"}', true);
-- Expected to ERROR: new row violates row-level security policy
insert into public.trip_records (user_id, trip_id, entity, id, data, updated_at)
values ('<OWNER_UUID>', 'forge', 'journal', 'x', '{"text":"planted"}'::jsonb, now());
rollback;

-- ── 4. A co-editor gets no journal access ───────────────────────────────────
-- trips has policies that consult trip_editors; trip_records deliberately has
-- none, so inviting someone to co-edit a route grants nothing here.
select tablename, policyname, cmd,
       (qual like '%trip_editors%'
        or coalesce(with_check, '') like '%trip_editors%') as consults_editors
from pg_policies
where tablename in ('trips', 'trip_records')
order by tablename, policyname;

-- ── 5. onConflict target matches the real primary key ───────────────────────
-- pushRecords passes onConflict "user_id,trip_id,entity,id". If that ever
-- drifts from the PK, every write fails at runtime and no mocked test notices.
select string_agg(a.attname, ',' order by k.ord) as actual_pk_columns
from pg_constraint c
join pg_class t on t.oid = c.conrelid
cross join lateral unnest(c.conkey) with ordinality as k(attnum, ord)
join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
where t.relname = 'trip_records' and c.contype = 'p';

-- ── 6. Nothing leaked out of the rolled-back blocks ─────────────────────────
select count(*) as leftover_probe_rows
from public.trip_records where trip_id in ('rls-probe', 'forge');
