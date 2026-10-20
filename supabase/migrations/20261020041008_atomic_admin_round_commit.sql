-- Admin-only transaction: settlement tables and successful audit snapshot commit together.
-- Activities, sleep nights and profile/preferences edits are deliberately not rewritten.
create function public.admin_commit_round(
  p_action_id uuid, p_actor_id uuid, p_target_id uuid, p_action text, p_reason text,
  p_expected_updated_at timestamptz, p_before jsonb, p_after jsonb
) returns timestamptz
language plpgsql security invoker set search_path = ''
as $$
declare
  version timestamptz;
  committed timestamptz := clock_timestamp();
begin
  select updated_at into version from public.athlete_prefs where user_id = p_target_id for update;
  if not found then raise exception 'account_not_found'; end if;
  if version is distinct from p_expected_updated_at then raise exception 'account_changed_reload_preview'; end if;
  if p_after->>'demoNow' is not null then raise exception 'simulation_clock_not_allowed'; end if;
  if jsonb_typeof(p_after->'ratings') is distinct from 'array'
    or jsonb_typeof(p_after->'enrollments') is distinct from 'array'
    or jsonb_typeof(p_after->'periodResults') is distinct from 'array'
    or jsonb_typeof(p_after->'healthRatings') is distinct from 'array'
    or jsonb_typeof(p_after->'healthResults') is distinct from 'array' then raise exception 'invalid_state'; end if;

  insert into public.admin_compete_actions(id, actor_id, target_id, action, reason, outcome, before_state, after_state, completed_at)
    values(p_action_id, p_actor_id, p_target_id, p_action, p_reason, 'succeeded', p_before, p_after, committed);

  insert into public.sport_ratings(user_id,sport,verified_elo,open_elo,opted_in,lock_verified,lock_open,lock_period)
    select p_target_id,r->>'sport',(r->>'verifiedElo')::numeric,(r->>'openElo')::numeric,(r->>'optedIn')::boolean,
      (r->>'lockVerified')::numeric,(r->>'lockOpen')::numeric,(r->>'lockPeriod')::timestamptz
    from jsonb_array_elements(p_after->'ratings') r
    on conflict(user_id,sport) do update set verified_elo=excluded.verified_elo,open_elo=excluded.open_elo,opted_in=excluded.opted_in,
      lock_verified=excluded.lock_verified,lock_open=excluded.lock_open,lock_period=excluded.lock_period;
  insert into public.period_results(user_id,period_start,sport,track,period_end,place,field_size,effort,distance_m,moving_sec,elo_before,elo_after,frozen,settled_at,acknowledged_at)
    select p_target_id,(r->>'periodStart')::timestamptz,r->>'sport',r->>'track',(r->>'periodEnd')::timestamptz,
      (r->>'place')::integer,(r->>'fieldSize')::integer,(r->>'effort')::numeric,(r->>'distanceM')::numeric,(r->>'movingSec')::numeric,
      (r->>'eloBefore')::numeric,(r->>'eloAfter')::numeric,(r->>'frozen')::boolean,(r->>'settledAt')::timestamptz,(r->>'acknowledgedAt')::timestamptz
    from jsonb_array_elements(p_after->'periodResults') r
    on conflict(user_id,period_start,sport,track) do update set period_end=excluded.period_end,place=excluded.place,field_size=excluded.field_size,
      effort=excluded.effort,distance_m=excluded.distance_m,moving_sec=excluded.moving_sec,elo_before=excluded.elo_before,elo_after=excluded.elo_after,
      frozen=excluded.frozen,settled_at=excluded.settled_at,acknowledged_at=coalesce(public.period_results.acknowledged_at,excluded.acknowledged_at);

  delete from public.wave_enrollments where user_id=p_target_id;
  insert into public.wave_enrollments(user_id,sport,wave_start,week_end,capacity,peer_ids,synthetic_ids,auto_enroll_next,crew_id)
    select p_target_id,r->>'sport',(r->>'waveStart')::timestamptz,(r->>'weekEnd')::timestamptz,(r->>'capacity')::integer,
      array(select jsonb_array_elements_text(r->'peerIds')),array(select jsonb_array_elements_text(r->'syntheticIds')),
      (r->>'autoEnrollNext')::boolean,
      case when r->>'crewId' ~ '^[0-9a-fA-F-]{36}$' then (r->>'crewId')::uuid else null end
    from jsonb_array_elements(p_after->'enrollments') r;
  delete from public.health_ratings where user_id=p_target_id;
  insert into public.health_ratings(user_id,metric,elo,opted_in,lock_elo,lock_period,auto_enroll_next)
    select p_target_id,r->>'metric',(r->>'elo')::numeric,(r->>'optedIn')::boolean,(r->>'lockElo')::numeric,
      (r->>'lockPeriod')::timestamptz,(r->>'autoEnrollNext')::boolean from jsonb_array_elements(p_after->'healthRatings') r;
  insert into public.health_period_results(user_id,result_id,metric,period_start,period_end,place,field_size,score,elo_before,elo_after,settled_at)
    select p_target_id,r->>'id',r->>'metric',(r->>'periodStart')::timestamptz,(r->>'periodEnd')::timestamptz,
      (r->>'place')::integer,(r->>'fieldSize')::integer,(r->>'score')::numeric,(r->>'eloBefore')::numeric,(r->>'eloAfter')::numeric,(r->>'settledAt')::timestamptz
    from jsonb_array_elements(p_after->'healthResults') r on conflict(user_id,result_id) do nothing;
  update public.athlete_prefs set clock_period_start=(p_after->'clock'->>'periodStart')::timestamptz,updated_at=committed where user_id=p_target_id;
  return committed;
end;
$$;
revoke all on function public.admin_commit_round(uuid,uuid,uuid,text,text,timestamptz,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.admin_commit_round(uuid,uuid,uuid,text,text,timestamptz,jsonb,jsonb) to service_role;
