-- Standalone regression fixture. No test rows survive execution.
begin;
do $$
declare
  athlete uuid := gen_random_uuid(); peer uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
  field uuid := gen_random_uuid(); crew uuid := gen_random_uuid();
  category uuid := (select id from public.categories limit 1);
  starts timestamptz := statement_timestamp()-interval '2 days';
  ends timestamptz := statement_timestamp()+interval '1 day';
  result jsonb;
begin
  insert into auth.users(id,email) values (athlete,athlete::text||'@test.invalid'),(peer,peer::text||'@test.invalid'),(outsider,outsider::text||'@test.invalid');
  insert into public.profiles(id,display_name) values (athlete,'Replay viewer'),(peer,'Replay peer'),(outsider,'Outsider') on conflict(id) do nothing;
  insert into public.week_fields(id,sport,wave_start,week_end,capacity,name,member_ids,synthetic_ids)
    values(field,'running',starts,ends,2,'Replay field',array[athlete,peer],array[]::text[]);
  -- More than the default API row limit must remain individual replay events.
  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,avg_hr,provenance,disposition,compete_key,verified)
    select athlete,'strava','replay-'||n,category,starts+interval '1 minute',1000,'running',1000,300,140,'recorded','counted','replay-'||n,true from generate_series(1,1005) n;
  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,avg_hr,provenance,disposition,compete_key,verified,source_label)
    select case when n=1 then peer else athlete end,'strava','special-'||n,category,
      case when n=6 then ends when n=7 then starts-interval '1 second' when n=8 then statement_timestamp()+interval '1 hour' else starts end,
      1000,'running',1000,300,150,
      case when n=2 then 'manual' when n=3 then 'demo' else 'recorded' end,
      case when n=4 then 'pending' when n=5 then 'excluded' else 'counted' end,
      case when n=9 then 'mock-replay' else 'replay-special-'||n end,true,
      case when n=10 then 'history' else 'strava' end
    from generate_series(1,10) n;
  perform set_config('request.jwt.claim.sub',athlete::text,true);
  result := public.competition_replay('running',starts,ends,'verified');
  if jsonb_array_length(result->'events')<>1006 then raise exception 'GPS eligibility or event count incorrect'; end if;
  if jsonb_array_length(result->'athletes')<>2 then raise exception 'Unexpected roster'; end if;
  if exists(select 1 from jsonb_array_elements(result->'events') e where e->>'athleteId'=peer::text and e->>'avgHr' is not null) then raise exception 'Peer sensor value disclosed'; end if;
  result := public.competition_replay('running',starts,ends,'open');
  if jsonb_array_length(result->'events')<>1007 then raise exception 'Open eligibility incorrect'; end if;
  -- An outsider must never obtain a field by guessing its sport and dates.
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  begin
    perform public.competition_replay('running',starts,ends,'open');
    raise exception 'Outsider accepted';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.competition_replay('running',starts,ends,'open');
    raise exception 'Anonymous accepted';
  exception when insufficient_privilege then null; end;
  if has_function_privilege('anon','public.competition_replay(text,timestamptz,timestamptz,text)','EXECUTE') then raise exception 'Anonymous execute granted'; end if;
  -- Field seating alone is insufficient after leaving a private crew.
  insert into public.crews(id,name,invite_code,sport,created_by) values(crew,'Replay crew',substr(crew::text,1,8),'running',athlete);
  insert into public.crew_members(crew_id,user_id,display_name) values(crew,athlete,'Replay viewer'),(crew,peer,'Replay peer');
  update public.week_fields set crew_id=crew where id=field;
  perform set_config('request.jwt.claim.sub',athlete::text,true);
  perform public.competition_replay('running',starts,ends,'open');
  delete from public.crew_members where crew_id=crew and user_id=athlete;
  begin
    perform public.competition_replay('running',starts,ends,'open');
    raise exception 'Former crew member accepted';
  exception when insufficient_privilege then null; end;
end;
$$;
rollback;
