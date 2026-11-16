begin;
do $$
declare
  viewer uuid := gen_random_uuid(); peer uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
  starts timestamptz := date_trunc('day', statement_timestamp() at time zone 'America/New_York') at time zone 'America/New_York' - interval '2 days';
  ends timestamptz := date_trunc('day', statement_timestamp() at time zone 'America/New_York') at time zone 'America/New_York' + interval '1 day';
  result jsonb;
begin
  insert into auth.users(id,email) select id,id::text||'@test.invalid' from unnest(array[viewer,peer,outsider]) id;
  insert into public.profiles(id,display_name) select id,'Walker' from unnest(array[viewer,peer,outsider]) id on conflict(id) do nothing;
  insert into public.week_fields(sport,wave_start,week_end,capacity,name,member_ids,synthetic_ids)
    values('walking',starts,ends,2,'Walking replay',array[viewer,peer],array[]::text[]);
  insert into public.daily_health_readings(user_id,provider,day,steps) values
    (viewer,'strava',(starts at time zone 'America/New_York')::date,4000),
    (viewer,'garmin',(starts at time zone 'America/New_York')::date,6000),
    (peer,'garmin',(starts at time zone 'America/New_York')::date,8000),
    (outsider,'garmin',(starts at time zone 'America/New_York')::date,99999),
    (viewer,'garmin',(ends at time zone 'America/New_York')::date,99999),
    (viewer,'garmin',(starts at time zone 'America/New_York')::date-1,99999);
  perform set_config('request.jwt.claim.sub',viewer::text,true);
  result := public.competition_replay('walking',starts,ends,'open');
  if jsonb_array_length(result->'events') <> 2 then raise exception 'Incorrect walking event scope'; end if;
  if (select sum((e->>'effort')::bigint) from jsonb_array_elements(result->'events') e) <> 14000 then raise exception 'Providers duplicated or rival missing'; end if;
  if exists(select 1 from jsonb_array_elements(result->'events') e where e ? 'avgHr' or e ? 'resting_hr' or e ? 'hrv') then raise exception 'Health metadata disclosed'; end if;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  begin
    perform public.competition_replay('walking',starts,ends,'open');
    raise exception 'Outsider accepted';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.competition_replay('walking',starts,ends,'open');
    raise exception 'Anonymous accepted';
  exception when insufficient_privilege then null; end;
end;
$$;
rollback;
