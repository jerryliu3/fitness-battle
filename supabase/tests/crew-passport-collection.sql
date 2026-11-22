-- Run after migrations in a rollback transaction.
do $$
<<fixture>>
declare
  owner_id uuid := gen_random_uuid();
  teammate_id uuid := gen_random_uuid();
  outsider_id uuid := gen_random_uuid();
  crew uuid := gen_random_uuid();
  category uuid := (select id from public.categories limit 1);
  current_week date := date_trunc('week', statement_timestamp() at time zone 'America/New_York')::date;
  first_week timestamptz := (current_week - 21)::timestamp at time zone 'America/New_York';
  last_close timestamptz := current_week::timestamp at time zone 'America/New_York';
  result jsonb;
begin
  insert into auth.users(id,email)
  select id, id::text || '@test.invalid' from unnest(array[owner_id,teammate_id,outsider_id]) as ids(id);
  insert into public.profiles(id,display_name)
  select id, 'Athlete' from unnest(array[owner_id,teammate_id,outsider_id]) as ids(id) on conflict do nothing;
  insert into public.crews(id,name,invite_code,sport,created_by)
    values(crew,'Passport collection test',substr(crew::text,1,8),'running',owner_id);
  insert into public.crew_members(crew_id,user_id,display_name)
    values(crew,owner_id,'Owner'),(crew,teammate_id,'Teammate');
  update private.crew_passport_rosters set observed_at = first_week where crew_id = crew;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  result := public.crew_passport_collection(crew);
  if result->'badges' <> '[]'::jsonb then raise exception 'empty Passport awarded a badge'; end if;

  -- Clear only the test fixture's rounds to stage three eligible closed weeks.
  delete from private.crew_passport_weeks where crew_id = crew;
  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,provenance,disposition,compete_key)
    select uid,'strava',crew::text||':'||i||':'||uid,category,
      ((current_week - 21 + i*7)::timestamp at time zone 'America/New_York') + interval '1 day',
      1000,'running',1000,600,'recorded','counted',crew::text||':'||i||':'||uid
    from generate_series(0,2) i cross join unnest(array[owner_id,teammate_id]) as ids(uid);
  update private.competition_fact_versions v set accepted_at = (v.fact->>'started_at')::timestamptz + interval '1 hour'
    where v.owner_id = any(array[fixture.owner_id, teammate_id]);
  insert into public.crew_contracts(crew_id,title,sport,metric,target,starts_at,ends_at,member_ids,settled_at,result_value,result_contributors)
    values(crew,'Finish together','running','sessions',2, (current_week - 7)::timestamp at time zone 'America/New_York',
      last_close,array[owner_id,teammate_id],last_close,2,2);
  update public.crews set sport = 'cycling' where id = crew;
  result := public.crew_passport_collection(crew);
  if jsonb_array_length(result->'badges') <> 4 then raise exception 'missing awards %', result->'badges'; end if;
  if public.crew_passport_collection(crew)->'badges' <> result->'badges' then raise exception 'repeated read changed awards'; end if;
  update public.crew_members set status='declined' where crew_id=crew and user_id=teammate_id;
  if public.crew_passport_collection(crew)->'badges' <> result->'badges' then raise exception 'membership change rewrote awards'; end if;
  perform set_config('request.jwt.claim.sub',outsider_id::text,true);
  begin
    perform public.crew_passport_collection(crew);
    raise exception 'outsider read passport';
  exception when others then if sqlerrm <> 'not_a_member' then raise; end if; end;
end;
$$;
