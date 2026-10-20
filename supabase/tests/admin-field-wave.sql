-- Run after migrations inside a rolled-back local transaction.
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  field uuid := gen_random_uuid(); replacement uuid := gen_random_uuid();
  test_action_id uuid := gen_random_uuid();
  va timestamptz; vb timestamptz; field_version timestamptz;
  boundary timestamptz := statement_timestamp();
  state jsonb := '{"name":"Field test","city":"Toronto","primary":"running","freezesLeft":3,"calibrated":false,"onboardingCompleted":true,"units":"us","clock":{"periodStart":"2026-10-19T04:00:00Z"},"focus":{"family":"sport","id":"running"},"ratings":[{"sport":"running","verifiedElo":1000,"openElo":1000,"optedIn":true,"lockVerified":1000,"lockOpen":1000,"lockPeriod":"2026-10-19T04:00:00Z"}],"periodResults":[],"enrollments":[],"healthRatings":[],"healthResults":[],"frozenPeriods":[],"sleepNights":[],"duels":[]}'::jsonb;
  next_field jsonb; accounts jsonb; invalid_accounts jsonb;
begin
  insert into auth.users(id,email) values(a,a::text||'@test.invalid'),(b,b::text||'@test.invalid');
  insert into public.profiles(id,display_name) values(a,'A'),(b,'B') on conflict(id) do nothing;
  perform set_config('request.jwt.claim.sub',a::text,true);
  select updated_at into va from public.athlete_prefs where user_id=a;
  va := public.save_compete_account(state,'[]','[]',va);
  perform set_config('request.jwt.claim.sub',b::text,true);
  select updated_at into vb from public.athlete_prefs where user_id=b;
  vb := public.save_compete_account(state,'[]','[]',vb);
  insert into public.week_fields(id,sport,wave_start,week_end,capacity,name,member_ids,synthetic_ids)
    values(field,'running',boundary-interval '1 day',boundary+interval '1 day',2,'Test',array[a,b],array[]::text[]) returning updated_at into field_version;
  next_field := jsonb_build_object('id',replacement,'wave_start',boundary,'week_end',boundary+interval '7 days','member_ids',jsonb_build_array(a,b),'synthetic_ids','[]'::jsonb);
  accounts := jsonb_build_array(
    jsonb_build_object('userId',a,'updatedAt',va,'actionId',gen_random_uuid(),'before',state,'after',jsonb_set(state,'{ratings,0,openElo}','1200')),
    jsonb_build_object('userId',b,'updatedAt',vb,'actionId',gen_random_uuid(),'before',state,'after',state));
  invalid_accounts := jsonb_set(accounts,'{1,after,enrollments}','[{"sport":"running","waveStart":"2026-10-19T04:00:00Z","weekEnd":"2026-10-26T04:00:00Z","capacity":99,"peerIds":[],"syntheticIds":[],"autoEnrollNext":true}]');
  begin
    perform public.admin_commit_field_wave(test_action_id,a,field,field_version,a,'Rollback check','restart-field',boundary,next_field,invalid_accounts);
    raise exception 'Invalid second athlete accepted';
  exception when check_violation then null; end;
  if (select open_elo from public.sport_ratings where user_id=a and sport='running') <> 1000 then raise exception 'First athlete partially committed'; end if;
  if exists(select 1 from public.admin_field_wave_actions where id=test_action_id) then raise exception 'Failed test_action_id audited as committed'; end if;
  if (select week_end from public.week_fields where id=field) <> boundary+interval '1 day' then raise exception 'Field partially closed'; end if;
  perform public.admin_commit_field_wave(test_action_id,a,field,field_version,a,'Valid test test_action_id','restart-field',boundary,next_field,accounts);
  if (select week_end from public.week_fields where id=field) <> boundary then raise exception 'Field not closed'; end if;
  if not exists(select 1 from public.week_fields where id=replacement) then raise exception 'Replacement field missing'; end if;
  begin
    perform public.admin_commit_field_wave(gen_random_uuid(),a,field,field_version,a,'Stale preview','restart-field',boundary,next_field,accounts);
    raise exception 'Stale field accepted';
  exception when others then if sqlerrm <> 'field_changed_reload' then raise; end if; end;
  if has_function_privilege('authenticated','public.admin_commit_field_wave(uuid,uuid,uuid,timestamptz,uuid,text,text,timestamptz,jsonb,jsonb)','EXECUTE') then raise exception 'Client can invoke field controls'; end if;
end;
$$;
