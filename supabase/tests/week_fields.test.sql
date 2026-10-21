-- Run with supabase test db after applying the migrations. All fixtures roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(18);

select has_table('public', 'week_fields', 'one canonical seating table exists');
select hasnt_table('public', 'crew_week_fields', 'legacy seating table is retired');
select ok(
  to_regprocedure('public.upsert_crew_week_field(uuid,timestamptz,timestamptz,text,integer,uuid[],text[])') is null,
  'legacy write RPC is retired'
);

insert into auth.users (id, email) values
  ('f1000000-0000-4000-8000-000000000001', 'codex-fields-a@example.com'),
  ('f1000000-0000-4000-8000-000000000002', 'codex-fields-b@example.com'),
  ('f1000000-0000-4000-8000-000000000003', 'codex-fields-outsider@example.com');
insert into public.crews (id, name, invite_code, sport, created_by) values (
  'fc000000-0000-4000-8000-000000000001', 'Field test crew', 'codexfield', 'running',
  'f1000000-0000-4000-8000-000000000001'
);
insert into public.crew_members (crew_id, user_id, display_name) values
  ('fc000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', 'A'),
  ('fc000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000002', 'B');

insert into public.activities (
  user_id, provider, external_id, category_id, started_at, metric_value,
  sport, distance_m, moving_sec, compete_key
) values (
  'f1000000-0000-4000-8000-000000000002', 'mock', 'codex-unshared',
  (select id from public.categories where slug = 'running'),
  '2026-10-20T12:00:00Z', 5100, 'running', 5100, 1800, 'codex-unshared'
);
-- Legacy shared rows below are intentionally not the scoring source. These
-- account rows exercise the same sport/disposition/window exclusions as solo.
insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,compete_key,provenance,disposition)
select 'f1000000-0000-4000-8000-000000000002','strava',id,
  (select id from public.categories where slug=fixture.sport),started_at::timestamptz,distance_m,sport,distance_m,600,id,provenance,disposition
from (values
  ('sql-field-excluded','2026-10-20T12:00:00Z','running',9000,'recorded','excluded'),
  ('sql-field-pending','2026-10-20T12:00:00Z','running',8000,'recorded','pending'),
  ('sql-field-other-sport','2026-10-20T12:00:00Z','cycling',7000,'recorded','counted'),
  ('sql-field-before','2026-10-19T03:59:59Z','running',6000,'recorded','counted'),
  ('sql-field-end','2026-10-26T04:00:00Z','running',5000,'recorded','counted'),
  ('sql-field-sample','2026-10-20T12:00:00Z','running',4000,'demo','counted')
) fixture(id,started_at,sport,distance_m,provenance,disposition);
insert into public.crew_entries (
  crew_id, user_id, activity_id, started_at, sport, distance_m, moving_sec, disposition
)
select 'fc000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000002',
  id, started_at::timestamptz, sport, distance_m, 600, disposition
from (values
  ('codex-counted', '2026-10-19T04:00:00Z', 'running', 1200, 'counted'),
  ('codex-excluded', '2026-10-20T12:00:00Z', 'running', 9000, 'excluded'),
  ('codex-pending', '2026-10-20T12:00:00Z', 'running', 8000, 'pending'),
  ('codex-cycling', '2026-10-20T12:00:00Z', 'cycling', 7000, 'counted'),
  ('codex-before', '2026-10-19T03:59:59Z', 'running', 6000, 'counted'),
  ('codex-end', '2026-10-26T04:00:00Z', 'running', 5000, 'counted')
) fixture(id, started_at, sport, distance_m, disposition);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000001', true);
select lives_ok($$select public.seat_athlete_week_field(
  'running', '2026-10-19T04:00:00Z', '2026-10-26T04:00:00Z', 8,
  'fc000000-0000-4000-8000-000000000001', 'Forged name', '{}'
)$$, 'crew seating succeeds through the canonical RPC');
select is((select name from public.week_fields where crew_id = 'fc000000-0000-4000-8000-000000000001'),
  'Field test crew', 'stored crew name comes from the crew, not caller input');
select is((select count(*) from public.week_fields where crew_id = 'fc000000-0000-4000-8000-000000000001'),
  1::bigint, 'only one crew seating exists');
select is((select distance_m from public.week_field_roster(
  (select id from public.week_fields where crew_id = 'fc000000-0000-4000-8000-000000000001')
) where user_id = 'f1000000-0000-4000-8000-000000000002'),
  5100::numeric, 'crew totals use counted account activity instead of legacy shared rows');
select is((select distance_m from public.week_field_roster(
  (select id from public.week_fields where crew_id = 'fc000000-0000-4000-8000-000000000001')
) where user_id = 'f1000000-0000-4000-8000-000000000001'),
  0::numeric, 'members without counted account sessions have zero volume');
select throws_ok($$select public.seat_athlete_week_field(
  'cycling', '2026-10-19T04:00:00Z', '2026-10-26T04:00:00Z', 8,
  'fc000000-0000-4000-8000-000000000001', null, '{}'
)$$, 'P0001', 'sport_mismatch', 'crew sport cannot be forged');
select throws_ok($$select public.seat_athlete_week_field(
  'running', '2026-10-19T04:00:00Z', '2026-10-26T04:00:00Z', 1,
  'fc000000-0000-4000-8000-000000000001', null, '{}'
)$$, 'P0001', 'invalid_capacity', 'invalid capacity is rejected');

reset role;
create temporary table codex_field_ids as select id from public.week_fields
  where crew_id = 'fc000000-0000-4000-8000-000000000001';
grant select on codex_field_ids to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000003', true);
select is((select count(*) from public.week_fields where crew_id = 'fc000000-0000-4000-8000-000000000001'),
  0::bigint, 'outsiders cannot select a crew field');
select throws_ok($$select public.week_field_roster((select id from codex_field_ids))$$,
  'P0001', 'not_in_field', 'outsiders cannot read field scores');
select throws_ok($$select public.seat_athlete_week_field(
  'running', '2026-10-19T04:00:00Z', '2026-10-26T04:00:00Z', 8,
  'fc000000-0000-4000-8000-000000000001', null, '{}'
)$$, 'P0001', 'not_a_crew_member', 'outsiders cannot seat a crew');

reset role;
update public.crew_members set status = 'declined'
where crew_id = 'fc000000-0000-4000-8000-000000000001'
  and user_id = 'f1000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'f1000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.week_fields where crew_id = 'fc000000-0000-4000-8000-000000000001'),
  0::bigint, 'former members cannot select their old crew field');
select throws_ok($$select public.week_field_roster((select id from codex_field_ids))$$,
  'P0001', 'not_a_crew_member', 'former members cannot read old crew scores');

select lives_ok($$select public.seat_athlete_week_field(
  'running', '2026-10-19T04:00:00Z', '2026-10-26T04:00:00Z', 8
)$$, 'solo seating still succeeds through the same RPC');
select is((select distance_m from public.week_field_roster(
  (select id from public.week_fields where crew_id is null and wave_start = '2026-10-19T04:00:00Z' and sport = 'running')
) where user_id = 'f1000000-0000-4000-8000-000000000002'),
  5100::numeric, 'solo fields retain account-activity scoring');

set local role anon;
select throws_ok($$select * from public.week_fields$$, '42501',
  'permission denied for table week_fields', 'anonymous callers cannot read seating');
reset role;
select * from finish();
rollback;
