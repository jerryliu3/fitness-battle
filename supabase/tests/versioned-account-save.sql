-- Run in a rolled-back local transaction after migrations.
do $$
declare
  athlete uuid := gen_random_uuid();
  version timestamptz;
  latest timestamptz;
  state jsonb := '{"name":"Version test","city":"Toronto","primary":"running","freezesLeft":3,"calibrated":false,"onboardingCompleted":true,"units":"metric","clock":{"periodStart":"2026-10-19T04:00:00Z"},"focus":{"family":"sport","id":"running"},"ratings":[],"periodResults":[],"enrollments":[],"healthRatings":[],"healthResults":[],"frozenPeriods":[],"sleepNights":[],"duels":[]}'::jsonb;
begin
  insert into auth.users(id,email) values(athlete,athlete::text||'@test.invalid');
  insert into public.profiles(id,display_name) values(athlete,'Version test') on conflict(id) do nothing;
  perform set_config('request.jwt.claim.sub',athlete::text,true);
  select updated_at into version from public.athlete_prefs where user_id=athlete;
  state := state || '{"ratings":[{"sport":"running","verifiedElo":1000,"openElo":1100,"optedIn":true,"lockVerified":1000,"lockOpen":1100,"lockPeriod":"2026-10-19T04:00:00Z"}],"sleepNights":[{"id":"night","day":"2026-10-19","score":80,"durationMin":480,"source":"manual","verified":false}]}'::jsonb;
  perform set_config('role','authenticated',true);
  latest := public.save_compete_account(state,'[]','[]',version);
  if (select count(*) from public.sleep_nights where user_id=athlete) <> 1 then raise exception 'Sleep night not saved'; end if;
  if (select units from public.athlete_prefs where user_id=athlete) <> 'metric' then raise exception 'Units not saved'; end if;
  begin
    perform public.save_compete_account(jsonb_set(state,'{name}','"Stale"'),'[]','[]',version);
    raise exception 'Stale save accepted';
  exception when others then if sqlerrm <> 'account_changed_reload' then raise; end if; end;
  begin
    perform public.save_compete_account(jsonb_set(state,'{enrollments}','[{"sport":"running","waveStart":"2026-10-19T04:00:00Z","weekEnd":"2026-10-26T04:00:00Z","capacity":99,"peerIds":[],"syntheticIds":[],"autoEnrollNext":true}]'),'[]','[]',latest);
    raise exception 'Invalid enrollment accepted';
  exception when check_violation then null; end;
  if (select updated_at from public.athlete_prefs where user_id=athlete) is distinct from latest then raise exception 'Failed save advanced revision'; end if;
  if (select display_name from public.profiles where id=athlete) <> 'Version test' then raise exception 'Stale save modified profile'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.save_compete_account(state,'[]','[]',latest);
    raise exception 'Anonymous allowed';
  exception when others then if sqlerrm <> 'authentication_required' then raise; end if; end;
  perform set_config('role','postgres',true);
end;
$$;
