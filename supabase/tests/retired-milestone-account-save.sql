-- Local/disposable database only; every fixture is rolled back.
begin;
do $$
declare
  athlete uuid := gen_random_uuid();
  old_revision timestamptz;
  reply jsonb;
  state jsonb := '{"name":"Legacy receipt fixture","city":"","primary":"running","freezesLeft":3,"calibrated":false,"onboardingCompleted":true,"units":"metric","clock":{"periodStart":"2026-11-16T05:00:00Z"},"focus":{"family":"sport","id":"running"},"ratings":[],"effortMilestones":[],"enrollments":[],"healthRatings":[],"healthResults":[],"frozenPeriods":[],"sleepNights":[],"duels":[],"periodResults":[{"sport":"running","track":"open","periodStart":"2026-10-19T04:00:00Z","periodEnd":"2026-10-26T04:00:00Z","place":1,"fieldSize":1,"effort":1000,"distanceM":1000,"movingSec":300,"eloBefore":1000,"eloAfter":1000,"frozen":false,"settledAt":"2026-10-26T04:00:00Z","acknowledgedAt":null}]}'::jsonb;
begin
  insert into auth.users(id,email) values(athlete,athlete::text||'@test.invalid');
  insert into public.profiles(id,display_name) values(athlete,'Legacy receipt fixture') on conflict(id) do nothing;
  insert into public.effort_milestones(user_id,sport,track,period_start,period_end,step,earned)
    values(athlete,'running','open','2026-10-19T04:00:00Z','2026-10-26T04:00:00Z',1609.344,1);
  select updated_at into old_revision from public.athlete_prefs where user_id=athlete;
  reply := public.save_compete_account_with_overtakes(athlete,state,'[]','[]',old_revision,0,clock_timestamp(),'[]','[]');
  if reply->>'updatedAt' is null then raise exception 'account was not saved'; end if;
  if (select earned from public.effort_milestones where user_id=athlete) <> 1 then raise exception 'legacy receipt changed'; end if;
  begin
    perform public.save_compete_account_with_overtakes(athlete,state,'[]','[]',old_revision,0,clock_timestamp(),'[]','[]');
    raise exception 'stale account write accepted';
  exception when others then
    if sqlerrm <> 'account_changed_reload' then raise; end if;
  end;
  if has_function_privilege('authenticated','public.save_compete_account_before_daily_waves(jsonb,jsonb,jsonb,timestamptz)','EXECUTE') then
    raise exception 'internal writer exposed';
  end if;
end;
$$;
rollback;
