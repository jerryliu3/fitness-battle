-- Run with supabase test db after applying migrations; fixtures roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(12);
insert into auth.users(id,email) values
 ('f2000000-0000-4000-8000-000000000001','blocks-a@example.invalid'),
 ('f2000000-0000-4000-8000-000000000002','blocks-b@example.invalid'),
 ('f2000000-0000-4000-8000-000000000003','blocks-c@example.invalid');
set local role authenticated;
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000001',true);
select lives_ok($$insert into public.athlete_blocks(blocker_id,blocked_id) values ('f2000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000002')$$,'block own choice');
select throws_ok($$insert into public.athlete_blocks(blocker_id,blocked_id) values ('f2000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000003')$$,'42501',null,'cannot create another user block');
select throws_ok($$insert into public.athlete_blocks(blocker_id,blocked_id) values ('f2000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001')$$,'23514',null,'cannot block self');
select lives_ok($$select public.seat_athlete_week_field('running',transaction_timestamp(),transaction_timestamp()+interval '7 days',8)$$,'first athlete seated');
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.athlete_blocks),0::bigint,'other user cannot read block');
select lives_ok($$select public.seat_athlete_week_field('running',transaction_timestamp(),transaction_timestamp()+interval '7 days',8)$$,'blocked athlete can still enter a field');
reset role;
select is((select count(*) from public.week_fields where sport='running' and member_ids @> array['f2000000-0000-4000-8000-000000000001'::uuid,'f2000000-0000-4000-8000-000000000002'::uuid]),0::bigint,'blocked pair are not matched');
-- A block never rewrites a field that already seated both athletes.
insert into public.week_fields(sport,wave_start,week_end,capacity,member_ids)
values('cycling',transaction_timestamp(),transaction_timestamp()+interval '7 days',8,
array['f2000000-0000-4000-8000-000000000001'::uuid,'f2000000-0000-4000-8000-000000000002'::uuid]);
set local role authenticated;
select set_config('request.jwt.claim.sub','f2000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.seat_athlete_week_field('cycling',transaction_timestamp(),transaction_timestamp()+interval '7 days',8)$$,'existing shared field remains available after a block');
reset role;
select is((select cardinality(member_ids) from public.week_fields where sport='cycling' and member_ids @> array['f2000000-0000-4000-8000-000000000001'::uuid,'f2000000-0000-4000-8000-000000000002'::uuid]),2,'existing roster stays intact');
set local role authenticated;
select lives_ok($$delete from public.athlete_blocks where blocked_id='f2000000-0000-4000-8000-000000000002'$$,'owner can unblock');
select is((select count(*) from public.athlete_blocks),0::bigint,'block removed');
select lives_ok($$select public.seat_athlete_week_field('running',transaction_timestamp(),transaction_timestamp()+interval '7 days',8)$$,'existing field remains accessible');
select * from finish();
rollback;
