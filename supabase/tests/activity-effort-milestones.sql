-- Run inside a rollback transaction after migrations.
do $$
declare u uuid:=gen_random_uuid(); c uuid:=(select id from public.categories limit 1); s timestamptz:=statement_timestamp()-interval '1 hour'; e timestamptz:=statement_timestamp()+interval '1 day'; doc jsonb; state jsonb; version timestamptz;
begin
  insert into auth.users(id,email) values(u,u::text||'@test.invalid');
  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,sport,distance_m,moving_sec,provenance,disposition,compete_key)
    values(u,'strava','milestone',c,statement_timestamp()-interval '1 minute',3218.688,'running',3218.688,1200,'recorded','counted','milestone-test');
  doc:=jsonb_build_object('enrollments',jsonb_build_array(jsonb_build_object('sport','running','waveStart',s)),
    'effortMilestones',jsonb_build_array(jsonb_build_object('sport','running','track','open','periodStart',s,'periodEnd',e,'step',1609.344,'earned',2)));
  perform private.store_effort_receipts(u,doc);
  perform private.store_effort_receipts(u,doc);
  if (select earned from public.effort_milestones where user_id=u)<>2 then raise exception 'receipt replay'; end if;
  begin
    perform private.store_effort_receipts(u,jsonb_set(doc,'{effortMilestones,0,earned}','3'));
    raise exception 'invalid credit accepted';
  exception when others then if sqlerrm<>'milestone_volume_mismatch' then raise; end if; end;
  begin
    perform private.store_effort_receipts(u,jsonb_set(doc,'{effortMilestones,0,earned}','0'));
    raise exception 'receipt decrease accepted';
  exception when others then if sqlerrm<>'milestone_receipt_changed' then raise; end if; end;
  perform set_config('request.jwt.claim.sub',u::text,true);
  select updated_at into version from public.athlete_prefs where user_id=u;
  state:='{"name":"Receipt test","city":"Toronto","primary":"running","freezesLeft":3,"calibrated":false,"onboardingCompleted":true,"units":"metric","clock":{"periodStart":"2026-10-19T04:00:00Z"},"focus":{"family":"sport","id":"running"},"ratings":[],"periodResults":[],"enrollments":[],"healthRatings":[],"healthResults":[],"frozenPeriods":[],"sleepNights":[],"duels":[]}'::jsonb;
  state:=state||jsonb_build_object('enrollments',jsonb_build_array(jsonb_build_object('sport','running','waveStart',s,'weekEnd',e,'capacity',2,'peerIds','[]'::jsonb,'syntheticIds','[]'::jsonb,'autoEnrollNext',true)));
  begin
    perform public.save_compete_account(state,'[]','[]',version);
    raise exception 'missing high-water receipt accepted';
  exception when others then if sqlerrm<>'account_changed_reload' then raise;end if;end;
  if (select updated_at from public.athlete_prefs where user_id=u) is distinct from version then raise exception 'rejected receipt reset advanced revision';end if;
  insert into public.sport_ratings(user_id,sport,open_elo,verified_elo,lock_period) values(u,'running',1200,1100,s);
  update public.sport_ratings set open_elo=900,verified_elo=800 where user_id=u;
  if (select open_elo<>1200 or verified_elo<>1100 from public.sport_ratings where user_id=u) then raise exception 'sport score decreased';end if;
  if has_table_privilege('authenticated','public.effort_milestones','INSERT') then raise exception 'direct writes allowed'; end if;
end; $$;
