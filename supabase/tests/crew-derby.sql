-- Run after migrations in a transaction that is rolled back.
do $$
<<fixture>>
declare
  athlete uuid := gen_random_uuid(); teammate uuid := gen_random_uuid(); rival uuid := gen_random_uuid(); third uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
  crew_a uuid := gen_random_uuid(); crew_b uuid := gen_random_uuid(); crew_c uuid := gen_random_uuid();
  field_a uuid := gen_random_uuid(); field_b uuid := gen_random_uuid(); field_c uuid := gen_random_uuid();
  category uuid := (select id from public.categories limit 1);
  starts timestamptz := clock_timestamp()-interval '1 hour'; ends timestamptz := clock_timestamp()+interval '1 day';
  result jsonb; normal_score numeric; team jsonb;
begin
  insert into auth.users(id,email) select id,id::text||'@test.invalid' from unnest(array[athlete,teammate,rival,third,outsider]) id;
  insert into public.profiles(id,display_name) select id,'Private athlete '||id from unnest(array[athlete,teammate,rival,third,outsider]) id on conflict do nothing;
  insert into public.crews(id,name,invite_code,sport,created_by) values
    (crew_a,'A',substr(crew_a::text,1,8),'running',athlete), (crew_b,'B',substr(crew_b::text,1,8),'running',rival), (crew_c,'C',substr(crew_c::text,1,8),'running',third);
  insert into public.crew_members(crew_id,user_id,display_name) values(crew_a,athlete,'A'),(crew_a,teammate,'A2'),(crew_b,rival,'B'),(crew_c,third,'C');
  insert into public.week_fields(id,crew_id,name,sport,wave_start,week_end,member_ids,roster_locked_at) values
    (field_a,crew_a,'A','running',starts,ends,array[athlete,teammate],clock_timestamp()),
    (field_b,crew_b,'B','running',starts,ends,array[rival],clock_timestamp()),
    (field_c,crew_c,'C','running',starts,ends,array[third],clock_timestamp());
  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,verified,provenance,disposition,compete_key)
    select id,'strava',id::text||':derby',category,starts+interval '10 minutes',metres,'running',metres,600,true,'recorded','counted','derby-'||id
    from (values(athlete,1000),(teammate,500),(rival,1500),(third,1000)) rows(id,metres);
  -- Open, excluded, demo, stub, future and out-of-window inputs do not add GPS distance.
  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,verified,provenance,disposition,compete_key)
    select athlete,'strava',athlete::text||':ignored-'||n,category,
      case when n=5 then ends-interval '1 minute' when n=6 then starts-interval '1 hour' else starts+interval '15 minutes' end,
      50000,'running',50000,600,n<>1,case when n=3 then 'demo' else 'recorded' end,
      case when n=2 then 'excluded' else 'counted' end,case when n=4 then 'strava-stub-derby' else 'ignored-'||n end from generate_series(1,6)n;
  perform set_config('request.jwt.claim.sub',athlete::text,true);
  result := public.crew_derby_standings(crew_a);
  if jsonb_array_length(result->'teams') <> 3 then raise exception 'missing crews: %',result; end if;
  if (result->>'wave_start')::timestamptz is distinct from starts or (result->>'week_end')::timestamptz is distinct from ends then raise exception 'event dates changed'; end if;
  select t into team from jsonb_array_elements(result->'teams')t where t->>'crew_id'=crew_a::text;
  select sum(verified_distance_m) into normal_score from public.week_field_roster(field_a);
  if (team->>'score')::numeric <> 1500 or (team->>'score')::numeric <> normal_score then raise exception 'Derby differs from normal GPS scoring'; end if;
  if (select (t->>'place')::integer from jsonb_array_elements(result->'teams')t where t->>'crew_id'=crew_c::text) <> 3 then raise exception 'ties must rank 1,1,3'; end if;
  if result::text like '%Private athlete%' or result::text like '%'||rival::text||'%' then raise exception 'opponent athlete identity leaked'; end if;
  begin perform public.week_field_roster(field_b); raise exception 'opponent roster exposed'; exception when others then if sqlerrm <> 'not_in_field' then raise; end if; end;
  -- Other benchmark cohorts, future fields and solo fields cannot become opponents.
  update public.week_fields set wave_start=starts-interval '1 minute' where id=field_b;
  update public.week_fields set wave_start=ends+interval '1 day',week_end=ends+interval '2 days' where id=field_c;
  if public.crew_derby_standings(crew_a) is not null then raise exception 'invented a current opponent'; end if;
  update public.week_fields set wave_start=starts,week_end=ends,sport='strength' where id in(field_a,field_b,field_c);
  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,avg_hr,verified,provenance,disposition,compete_key)
    values(athlete,'strava',athlete::text||':strength',category,starts+interval '10 minutes',0,'strength',0,3600,150,false,'manual','counted','derby-strength');
  result := public.crew_derby_standings(crew_a);
  select sum(effort)::numeric into normal_score from public.week_field_roster(field_a);
  select t into team from jsonb_array_elements(result->'teams')t where t->>'crew_id'=crew_a::text;
  if (team->>'score')::numeric <> normal_score or normal_score <= 8 then raise exception 'strength lost normal HR-weighted effort'; end if;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  begin perform public.crew_derby_standings(crew_a); raise exception 'outsider read Derby'; exception when others then if sqlerrm <> 'not_a_member' then raise; end if; end;
  if has_function_privilege('authenticated','private.week_field_scores(uuid)','EXECUTE') or has_function_privilege('anon','public.crew_derby_standings(uuid)','EXECUTE') then raise exception 'private score reader exposed'; end if;
end; $$;
