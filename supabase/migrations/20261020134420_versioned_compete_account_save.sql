-- Account version comparison and every account-owned write commit together.
create function public.save_compete_account(p_state jsonb, p_activities jsonb, p_readiness jsonb, p_expected_updated_at timestamptz)
returns timestamptz language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
  version timestamptz;
  committed timestamptz := clock_timestamp();
begin
  if uid is null then raise exception 'authentication_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select updated_at into version from public.athlete_prefs where user_id=uid for update;
  if version is distinct from p_expected_updated_at then raise exception 'account_changed_reload'; end if;
  if p_state->>'demoNow' is not null then raise exception 'simulation_clock_not_allowed'; end if;
  if exists(select 1 from jsonb_array_elements(p_activities || p_readiness) r where r->>'user_id' is distinct from uid::text) then
    raise exception 'account_mismatch';
  end if;

  insert into public.profiles(id,display_name,city,primary_sport,avatar_url,updated_at)
    values(uid,coalesce(nullif(left(p_state->>'name',80),''),'Athlete'),left(p_state->>'city',80),p_state->>'primary',p_state->>'avatarUrl',committed)
    on conflict(id) do update set display_name=excluded.display_name,city=excluded.city,primary_sport=excluded.primary_sport,avatar_url=excluded.avatar_url,updated_at=excluded.updated_at;
  insert into public.athlete_prefs(user_id,freezes_left,calibrated,onboarding_completed,lesson_done_on,training_goal_distance,training_goal_deadline,clock_period_start,focus_family,focus_id,units,updated_at)
    values(uid,(p_state->>'freezesLeft')::integer,(p_state->>'calibrated')::boolean,(p_state->>'onboardingCompleted')::boolean,
      (p_state->>'lessonDoneOn')::date,p_state->'trainingGoal'->>'distance',(p_state->'trainingGoal'->>'deadline')::date,
      (p_state->'clock'->>'periodStart')::timestamptz,p_state->'focus'->>'family',p_state->'focus'->>'id',
      case when p_state->>'units'='metric' then 'metric' else 'us' end,committed)
    on conflict(user_id) do update set freezes_left=excluded.freezes_left,calibrated=excluded.calibrated,onboarding_completed=excluded.onboarding_completed,
      lesson_done_on=excluded.lesson_done_on,training_goal_distance=excluded.training_goal_distance,training_goal_deadline=excluded.training_goal_deadline,
      clock_period_start=excluded.clock_period_start,focus_family=excluded.focus_family,focus_id=excluded.focus_id,units=excluded.units,updated_at=excluded.updated_at;
  insert into public.sport_ratings(user_id,sport,verified_elo,open_elo,opted_in,lock_verified,lock_open,lock_period)
    select uid,r->>'sport',(r->>'verifiedElo')::numeric,(r->>'openElo')::numeric,(r->>'optedIn')::boolean,
      (r->>'lockVerified')::numeric,(r->>'lockOpen')::numeric,(r->>'lockPeriod')::timestamptz
    from jsonb_array_elements(p_state->'ratings') r
    on conflict(user_id,sport) do update set verified_elo=excluded.verified_elo,open_elo=excluded.open_elo,opted_in=excluded.opted_in,
      lock_verified=excluded.lock_verified,lock_open=excluded.lock_open,lock_period=excluded.lock_period;
  insert into public.period_results(user_id,period_start,sport,track,period_end,place,field_size,effort,distance_m,moving_sec,elo_before,elo_after,frozen,settled_at,acknowledged_at)
    select uid,(r->>'periodStart')::timestamptz,r->>'sport',r->>'track',(r->>'periodEnd')::timestamptz,
      (r->>'place')::integer,(r->>'fieldSize')::integer,(r->>'effort')::numeric,(r->>'distanceM')::numeric,(r->>'movingSec')::numeric,
      (r->>'eloBefore')::numeric,(r->>'eloAfter')::numeric,(r->>'frozen')::boolean,(r->>'settledAt')::timestamptz,(r->>'acknowledgedAt')::timestamptz
    from jsonb_array_elements(p_state->'periodResults') r
    on conflict(user_id,period_start,sport,track) do update set period_end=excluded.period_end,place=excluded.place,field_size=excluded.field_size,
      effort=excluded.effort,distance_m=excluded.distance_m,moving_sec=excluded.moving_sec,elo_before=excluded.elo_before,elo_after=excluded.elo_after,
      frozen=excluded.frozen,settled_at=excluded.settled_at,acknowledged_at=coalesce(public.period_results.acknowledged_at,excluded.acknowledged_at);

  delete from public.wave_enrollments where user_id=uid;
  insert into public.wave_enrollments(user_id,sport,wave_start,week_end,capacity,peer_ids,synthetic_ids,auto_enroll_next,crew_id)
    select uid,r->>'sport',(r->>'waveStart')::timestamptz,(r->>'weekEnd')::timestamptz,(r->>'capacity')::integer,
      array(select jsonb_array_elements_text(r->'peerIds')),array(select jsonb_array_elements_text(r->'syntheticIds')),
      (r->>'autoEnrollNext')::boolean,
      case when r->>'crewId' ~ '^[0-9a-fA-F-]{36}$' then (r->>'crewId')::uuid else null end
    from jsonb_array_elements(p_state->'enrollments') r;
  delete from public.health_ratings where user_id=uid;
  insert into public.health_ratings(user_id,metric,elo,opted_in,lock_elo,lock_period,auto_enroll_next)
    select uid,r->>'metric',(r->>'elo')::numeric,(r->>'optedIn')::boolean,(r->>'lockElo')::numeric,
      (r->>'lockPeriod')::timestamptz,(r->>'autoEnrollNext')::boolean from jsonb_array_elements(p_state->'healthRatings') r;
  insert into public.health_period_results(user_id,result_id,metric,period_start,period_end,place,field_size,score,elo_before,elo_after,settled_at)
    select uid,r->>'id',r->>'metric',(r->>'periodStart')::timestamptz,(r->>'periodEnd')::timestamptz,
      (r->>'place')::integer,(r->>'fieldSize')::integer,(r->>'score')::numeric,(r->>'eloBefore')::numeric,(r->>'eloAfter')::numeric,(r->>'settledAt')::timestamptz
    from jsonb_array_elements(p_state->'healthResults') r on conflict(user_id,result_id) do nothing;

  delete from public.period_freezes where user_id=uid;
  insert into public.period_freezes(user_id,period_start)
    select uid,value::timestamptz from jsonb_array_elements_text(p_state->'frozenPeriods');
  delete from public.sleep_nights where user_id=uid;
  insert into public.sleep_nights(user_id,night_id,day,score,duration_min,efficiency,deep_min,rem_min,light_min,awake_min,source,verified)
    select uid,r->>'id',(r->>'day')::date,(r->>'score')::numeric,(r->>'durationMin')::numeric,(r->>'efficiency')::numeric,
      (r->>'deepMin')::numeric,(r->>'remMin')::numeric,(r->>'lightMin')::numeric,(r->>'awakeMin')::numeric,r->>'source',(r->>'verified')::boolean
      from jsonb_array_elements(p_state->'sleepNights') r;
  delete from public.compete_duels where user_id=uid;
  insert into public.compete_duels(user_id,duel_id,sport,period_start,rival_id,rival_name,rival_elo,source)
    select uid,r->>'id',r->>'sport',(r->>'periodStart')::timestamptz,r->>'rivalId',r->>'rivalName',(r->>'rivalElo')::numeric,r->>'source'
      from jsonb_array_elements(p_state->'duels') r;

  insert into public.activities(user_id,provider,external_id,category_id,started_at,metric_value,moving_sec,avg_hr,raw_name,sport,distance_m,verified,provenance,disposition,disposition_reason,compete_key,source_label)
    select uid,r.provider,r.external_id,r.category_id,r.started_at,r.metric_value,r.moving_sec,r.avg_hr,r.raw_name,r.sport,r.distance_m,r.verified,r.provenance,r.disposition,r.disposition_reason,r.compete_key,r.source_label
      from jsonb_populate_recordset(null::public.activities,p_activities) r
    on conflict(user_id,provider,external_id) do update set category_id=excluded.category_id,started_at=excluded.started_at,metric_value=excluded.metric_value,
      moving_sec=excluded.moving_sec,avg_hr=excluded.avg_hr,raw_name=excluded.raw_name,sport=excluded.sport,distance_m=excluded.distance_m,
      verified=excluded.verified,provenance=excluded.provenance,disposition=excluded.disposition,disposition_reason=excluded.disposition_reason,
      compete_key=excluded.compete_key,source_label=excluded.source_label;
  insert into public.readiness_marks(user_id,provider,external_id,day,score)
    select uid,r.provider,r.external_id,r.day,r.score from jsonb_populate_recordset(null::public.readiness_marks,p_readiness) r
    on conflict(user_id,provider,external_id) do update set day=excluded.day,score=excluded.score;
  return committed;
end;
$$;
revoke all on function public.save_compete_account(jsonb,jsonb,jsonb,timestamptz) from public,anon;
grant execute on function public.save_compete_account(jsonb,jsonb,jsonb,timestamptz) to authenticated;
