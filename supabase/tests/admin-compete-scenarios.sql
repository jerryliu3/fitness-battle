-- Run after migrations inside a rolled-back transaction.
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  field_id uuid := gen_random_uuid(); test_action_id uuid := gen_random_uuid();
  va timestamptz; vb timestamptz; fv timestamptz;
  starts timestamptz := statement_timestamp()-interval '1 day';
  ends timestamptz := statement_timestamp()+interval '1 day';
  state jsonb := '{"name":"Scenario test","city":"Toronto","primary":"running","freezesLeft":3,"calibrated":false,"onboardingCompleted":true,"units":"us","clock":{"periodStart":"2026-10-19T04:00:00Z"},"focus":{"family":"sport","id":"running"},"ratings":[{"sport":"running","verifiedElo":1000,"openElo":1000,"optedIn":false,"lockVerified":1000,"lockOpen":1000,"lockPeriod":"2026-10-19T04:00:00Z"}],"periodResults":[],"enrollments":[],"healthRatings":[],"healthResults":[],"frozenPeriods":[],"sleepNights":[],"duels":[]}'::jsonb;
  registration jsonb;
  payload jsonb;
  original_activity uuid := gen_random_uuid();
  count_before integer;
begin
  insert into auth.users(id,email) values(a,a::text||'@test.invalid'),(b,b::text||'@test.invalid');
  insert into public.profiles(id,display_name) values(a,'A'),(b,'B') on conflict(id) do nothing;
  perform set_config('request.jwt.claim.sub',a::text,true);
  select updated_at into va from public.athlete_prefs where user_id=a;
  va := public.save_compete_account(state,'[]','[]',va);
  perform set_config('request.jwt.claim.sub',b::text,true);
  select updated_at into vb from public.athlete_prefs where user_id=b;
  vb := public.save_compete_account(state,'[]','[]',vb);
  registration := jsonb_build_object('enrollment',jsonb_build_object('sport','running','waveStart',starts,'weekEnd',ends,'capacity',2,'peerIds','[]'::jsonb,'syntheticIds','[]'::jsonb), 'rating',state->'ratings'->0);
  perform set_config('role','service_role',true);
  va := public.admin_apply_compete_scenario(gen_random_uuid(),a,a,va,'register','running','Register test',registration,state);
  vb := public.admin_apply_compete_scenario(gen_random_uuid(),a,b,vb,'register','running','Register peer',registration,state);
  perform set_config('role','postgres',true);
  if not exists(select 1 from public.sport_ratings where user_id=a and sport='running' and opted_in) then raise exception 'Registration failed'; end if;
  va := public.admin_apply_compete_scenario(gen_random_uuid(),a,a,va,'stop-renewal','running','Stop test renewal','{}',state);
  if exists(select 1 from public.wave_enrollments where user_id=a and auto_enroll_next) then raise exception 'Renewal not stopped'; end if;
  va := public.admin_apply_compete_scenario(gen_random_uuid(),a,a,va,'resume-renewal','running','Resume test renewal','{}',state);
  insert into public.week_fields(id,sport,wave_start,week_end,capacity,name,member_ids,synthetic_ids)
    values(field_id,'running',starts,ends,2,'Scenario field',array[b],array[]::text[]) returning updated_at into fv;
  payload := jsonb_build_object('fieldId',field_id,'fieldUpdatedAt',fv,'peerId',b,'peerUpdatedAt',vb);
  va := public.admin_apply_compete_scenario(gen_random_uuid(),a,a,va,'join-field','running','Join peer field',payload,state);
  if not exists(select 1 from public.week_fields where id=field_id and a=any(member_ids)) then raise exception 'Field seating failed'; end if;
  select updated_at into fv from public.week_fields where id=field_id;
  payload := payload || jsonb_build_object('fieldUpdatedAt',fv,'distanceM',5000,'movingSec',1800,'verified',true,'startedAt',statement_timestamp()-interval '1 minute');
  va := public.admin_apply_compete_scenario(test_action_id,a,a,va,'overtake','running','Overtake test peer',payload,state);
  if not exists(select 1 from public.activities where user_id=a and verified and distance_m=5000 and provenance='recorded') then raise exception 'Simulated GPS missing'; end if;
  if not exists(select 1 from public.admin_scenario_activities where user_id=a and action_id=test_action_id) then raise exception 'Generated activity untracked'; end if;
  select count(*) into count_before from public.admin_compete_scenarios;
  begin
    perform public.admin_apply_compete_scenario(gen_random_uuid(),a,a,starts,'reset-activities','running','Stale preview test','{}',state);
    raise exception 'Stale preview accepted';
  exception when others then if sqlerrm <> 'account_changed_reload_preview' then raise; end if; end;
  if (select count(*) from public.admin_compete_scenarios)<>count_before then raise exception 'Failed action audited as committed'; end if;
  insert into public.activities(id,user_id,provider,external_id,category_id,started_at,metric_value,moving_sec,raw_name,sport,distance_m,verified,provenance,disposition,compete_key,source_label)
    select original_activity,a,'mock',original_activity::text,id,statement_timestamp(),1000,600,'Original activity','running',1000,false,'manual','counted','original-'||original_activity::text,'manual' from public.categories where slug='running';
  -- Manual lab activities follow the ordinary mock-provider/source-label convention.
  va := public.admin_apply_compete_scenario(gen_random_uuid(),a,a,va,'add-activity','running','Manual session test',
    jsonb_build_object('distanceM',1000,'movingSec',600,'verified',false,'startedAt',statement_timestamp()-interval '2 minutes'),state);
  if not exists(select 1 from public.activities where user_id=a and raw_name='Admin scenario: manual activity' and provider='mock' and source_label='manual' and not verified and compete_key like 'admin-lab-%') then raise exception 'Manual activity storage inconsistent'; end if;
  -- Replay only the latest results for the chosen sport, preserving older history.
  insert into public.period_results(user_id,period_start,sport,track,period_end,place,field_size,elo_before,elo_after,settled_at,acknowledged_at)
    values(a,starts-interval '7 days','running','open',starts,1,2,1000,1010,starts,starts),
          (a,starts-interval '14 days','running','open',starts-interval '7 days',1,2,990,1000,starts,starts);
  va := public.admin_apply_compete_scenario(gen_random_uuid(),a,a,va,'replay-results','running','Replay latest results','{}',state);
  if not exists(select 1 from public.period_results where user_id=a and period_start=starts-interval '7 days' and acknowledged_at is null) then raise exception 'Latest results not reset'; end if;
  if not exists(select 1 from public.period_results where user_id=a and period_start=starts-interval '14 days' and acknowledged_at is not null) then raise exception 'Older result acknowledgment changed'; end if;
  va := public.admin_apply_compete_scenario(gen_random_uuid(),a,a,va,'reset-activities','running','Reset generated activities','{}',state);
  if exists(select 1 from public.admin_scenario_activities where user_id=a) then raise exception 'Generated activity not removed'; end if;
  if not exists(select 1 from public.activities where id=original_activity) then raise exception 'Original activity removed'; end if;
  va := public.admin_apply_compete_scenario(gen_random_uuid(),a,a,va,'remove-registration','running','Remove test registration','{}',state);
  if exists(select 1 from public.wave_enrollments where user_id=a) or exists(select 1 from public.week_fields where id=field_id and a=any(member_ids)) then raise exception 'Registration not removed'; end if;
  -- A full destination must fail without moving enrollment or advancing the account version.
  update public.week_fields set member_ids=array[b,gen_random_uuid()] where id=field_id returning updated_at into fv;
  payload := jsonb_build_object('fieldId',field_id,'fieldUpdatedAt',fv,'peerId',b,'peerUpdatedAt',vb);
  begin
    perform public.admin_apply_compete_scenario(gen_random_uuid(),a,a,va,'join-field','running','Full field must reject',payload,state);
    raise exception 'Full field accepted';
  exception when others then if sqlerrm<>'field_full' then raise; end if; end;
  if (select updated_at from public.athlete_prefs where user_id=a) is distinct from va then raise exception 'Failed scenario advanced account version'; end if;
  if has_function_privilege('authenticated','public.admin_apply_compete_scenario(uuid,uuid,uuid,timestamptz,text,text,text,jsonb,jsonb)','EXECUTE') or has_table_privilege('authenticated','public.admin_compete_scenarios','SELECT') then raise exception 'Client can access admin scenarios'; end if;
  -- Scenario audit/tracking must not prevent ordinary test-account deletion.
  delete from auth.users where id=a;
  if exists(select 1 from public.admin_compete_scenarios where target_id=a) then raise exception 'Deleted athlete audit retained'; end if;
end;
$$;
