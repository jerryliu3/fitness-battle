-- Run after audit + atomic commit migrations in a rollback-only transaction.
do $$
declare
  target uuid := gen_random_uuid();
  action_id uuid := gen_random_uuid();
  old_version timestamptz := '2026-10-19T12:00:00Z';
  committed timestamptz;
  state jsonb := '{"demoNow":null,"clock":{"periodStart":"2026-10-26T04:00:00Z"},"ratings":[],"periodResults":[],"enrollments":[],"healthRatings":[],"healthResults":[]}';
  bad jsonb;
begin
  insert into auth.users(id,email) values(target,target::text||'@test.invalid');
  insert into public.profiles(id,display_name) values(target,'Admin transaction test') on conflict(id) do nothing;
  insert into public.athlete_prefs(user_id,updated_at,units,clock_period_start) values(target,old_version,'metric','2026-10-19T04:00:00Z')
    on conflict(user_id) do update set updated_at=old_version,units='metric',clock_period_start='2026-10-19T04:00:00Z';
  state := state || '{"ratings":[{"sport":"running","verifiedElo":1000,"openElo":1200,"optedIn":true,"lockVerified":1000,"lockOpen":1200,"lockPeriod":"2026-10-26T04:00:00Z"}],"periodResults":[{"sport":"running","track":"open","periodStart":"2026-10-19T04:00:00Z","periodEnd":"2026-10-26T04:00:00Z","place":1,"fieldSize":2,"effort":50,"distanceM":5000,"movingSec":1800,"eloBefore":1000,"eloAfter":1200,"frozen":false,"settledAt":"2026-10-26T04:00:00Z"}],"enrollments":[{"sport":"running","waveStart":"2026-10-26T04:00:00Z","weekEnd":"2026-11-02T05:00:00Z","capacity":2,"peerIds":[],"syntheticIds":[],"autoEnrollNext":true}],"healthRatings":[{"metric":"sleep","elo":1100,"optedIn":true,"lockElo":1100,"lockPeriod":"2026-10-26T04:00:00Z","autoEnrollNext":true}],"healthResults":[{"id":"sleep-result","metric":"sleep","periodStart":"2026-10-19T04:00:00Z","periodEnd":"2026-10-26T04:00:00Z","place":1,"fieldSize":2,"score":85,"eloBefore":1000,"eloAfter":1100,"settledAt":"2026-10-26T04:00:00Z"}]}'::jsonb;
  -- This fails after the audit insert: all statements must roll back together.
  bad := jsonb_set(state,'{enrollments}','[{"sport":"running","waveStart":"2026-10-26T04:00:00Z","weekEnd":"2026-11-02T05:00:00Z","capacity":1,"peerIds":[],"syntheticIds":[],"autoEnrollNext":true}]');
  begin
    perform public.admin_commit_round(action_id,target,target,'close-round','Rollback test',old_version,'{}',bad);
    raise exception 'Invalid enrollment committed';
  exception when check_violation then null;
  end;
  if exists(select 1 from public.sport_ratings where user_id=target) then raise exception 'Failed transaction changed rating'; end if;
  if exists(select 1 from public.admin_compete_actions where id=action_id) then raise exception 'Failed transaction kept its audit'; end if;
  if (select updated_at from public.athlete_prefs where user_id=target) <> old_version then raise exception 'Failed transaction changed version'; end if;
  select public.admin_commit_round(action_id,target,target,'close-round','Successful test',old_version,'{}',state) into committed;
  if not exists(select 1 from public.admin_compete_actions where id=action_id and outcome='succeeded') then raise exception 'Audit missing'; end if;
  if (select units from public.athlete_prefs where user_id=target) <> 'metric' then raise exception 'Unrelated preference overwritten'; end if;
  if (select clock_period_start from public.athlete_prefs where user_id=target) <> '2026-10-26T04:00:00Z'::timestamptz then raise exception 'Round not updated'; end if;
  begin
    perform public.admin_commit_round(gen_random_uuid(),target,target,'close-round','Stale preview',old_version,'{}',state);
    raise exception 'Stale version was accepted';
  exception when others then if sqlerrm <> 'account_changed_reload_preview' then raise; end if;
  end;
  if has_function_privilege('authenticated','public.admin_commit_round(uuid,uuid,uuid,text,text,timestamptz,jsonb,jsonb)','EXECUTE') then raise exception 'Client can commit admin data'; end if;
end;
$$;
