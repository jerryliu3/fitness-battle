-- Run with migrations inside a rolled-back transaction.
do $$
declare
  athlete uuid := gen_random_uuid(); newcomer uuid := gen_random_uuid();
  closed_id uuid := gen_random_uuid(); crew uuid := gen_random_uuid(); replacement uuid := gen_random_uuid();
  starts timestamptz := statement_timestamp()-interval '2 hours';
  cutoff timestamptz := statement_timestamp()-interval '1 hour';
  ends timestamptz := statement_timestamp()+interval '2 days';
  seated public.week_fields;
begin
  insert into auth.users(id,email) values(athlete,athlete::text||'@test.invalid'),(newcomer,newcomer::text||'@test.invalid');
  insert into public.profiles(id,display_name) values(athlete,'Athlete'),(newcomer,'Newcomer') on conflict(id) do nothing;
  perform set_config('request.jwt.claim.sub',athlete::text,true);
  insert into public.week_fields(id,sport,wave_start,week_end,capacity,name,member_ids,synthetic_ids)
    values(closed_id,'running',starts,cutoff,2,'Closed solo',array[athlete],array[]::text[]);
  select * into seated from public.seat_athlete_week_field('running',starts,ends,2,null,null,array[]::text[]);
  if seated.id=closed_id or seated.week_end<>ends then raise exception 'Closed solo field reused'; end if;
  if not exists(select 1 from public.week_fields where id=closed_id and member_ids=array[athlete] and week_end=cutoff) then raise exception 'Closed solo history changed'; end if;
  perform set_config('request.jwt.claim.sub',newcomer::text,true);
  select * into seated from public.seat_athlete_week_field('running',starts,ends,2,null,null,array[]::text[]);
  if seated.id=closed_id or not(newcomer=any(seated.member_ids)) then raise exception 'Newcomer seated into closed field'; end if;
  insert into public.crews(id,name,invite_code,sport,created_by) values(crew,'Test Crew',substr(crew::text,1,8),'running',athlete);
  insert into public.crew_members(crew_id,user_id,display_name) values(crew,athlete,'Athlete'),(crew,newcomer,'Newcomer');
  insert into public.week_fields(sport,wave_start,week_end,capacity,crew_id,name,member_ids,synthetic_ids)
    values('running',starts,cutoff,2,crew,'Closed Crew',array[athlete],array[]::text[]);
  insert into public.week_fields(id,sport,wave_start,week_end,capacity,crew_id,name,member_ids,synthetic_ids)
    values(replacement,'running',cutoff,ends,2,crew,'Replacement',array[athlete],array[]::text[]);
  select * into seated from public.seat_athlete_week_field('running',starts,ends,2,crew,null,array[]::text[]);
  if seated.id<>replacement or seated.week_end<>ends then raise exception 'Crew replacement not used'; end if;
  if not exists(select 1 from public.week_fields where crew_id=crew and wave_start=starts and week_end=cutoff and member_ids=array[athlete]) then raise exception 'Closed Crew history changed'; end if;
  -- End-only actions can schedule the replacement in the future.
  update public.week_fields set wave_start=statement_timestamp()+interval '1 day' where id=replacement;
  select * into seated from public.seat_athlete_week_field('running',starts,ends,2,crew,null,array[]::text[]);
  if seated.id<>replacement or seated.wave_start<=statement_timestamp() then raise exception 'Scheduled replacement not used'; end if;
end;
$$;
