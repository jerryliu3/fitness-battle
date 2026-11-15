-- Walking competes on daily steps; manual and walk workouts stay in activities as journal-only.
-- Profile gender + country for onboarding.

alter table public.profiles
  add column if not exists gender text check (gender in ('male', 'female', 'other')),
  add column if not exists country_code text;

create or replace function private.walking_steps_total(
  p_user_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_as_of timestamptz default statement_timestamp()
) returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(day_steps), 0)::bigint
  from (
    select d.day,
      max(coalesce(d.steps, 0))::bigint as day_steps
    from public.daily_health_readings d
    where d.user_id = p_user_id
      and d.day >= (timezone('America/New_York', p_start))::date
      and d.day < (timezone('America/New_York', p_end))::date
      and (d.day < (timezone('America/New_York', p_as_of))::date
        or d.day = (timezone('America/New_York', p_as_of))::date)
    group by d.day
  ) s;
$$;

revoke all on function private.walking_steps_total(uuid, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;

create or replace function public.week_field_roster(p_field_id uuid)
returns table (
  user_id uuid,
  display_name text,
  open_elo numeric,
  distance_m numeric,
  moving_sec numeric,
  verified_elo numeric,
  verified_distance_m numeric,
  verified_moving_sec numeric,
  effort double precision,
  verified_effort double precision
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  field_rec public.week_fields;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;

  select * into field_rec from public.week_fields where id = p_field_id;
  if field_rec.id is null then
    raise exception 'field_not_found';
  end if;
  if not (uid = any(field_rec.member_ids)) then
    raise exception 'not_in_field';
  end if;
  if field_rec.wave_start > statement_timestamp() then raise exception 'wave_not_started'; end if;

  return query
  select
    p.id,
    coalesce(cm.display_name, p.display_name),
    coalesce(r.open_elo, 1000)::numeric,
    case
      when field_rec.sport = 'walking' then private.walking_steps_total(p.id, field_rec.wave_start, field_rec.week_end)::numeric
      else coalesce(sum(a.distance_m), 0)::numeric
    end,
    coalesce(sum(a.moving_sec), 0)::numeric,
    coalesce(r.verified_elo, 1000)::numeric,
    coalesce(sum(a.distance_m) filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling')), 0)::numeric,
    coalesce(sum(a.moving_sec) filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling')), 0)::numeric,
  case
    when field_rec.sport = 'walking' then private.walking_steps_total(p.id, field_rec.wave_start, field_rec.week_end)::double precision
    else coalesce(sum(private.field_activity_effort(field_rec.sport, a.distance_m, a.moving_sec, a.avg_hr)), 0)::double precision
  end,
    coalesce(sum(private.field_activity_effort(field_rec.sport, a.distance_m, a.moving_sec, a.avg_hr))
      filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling')), 0)::double precision
  from unnest(field_rec.member_ids) as m(id)
  join public.profiles p on p.id = m.id
  left join public.sport_ratings r
    on r.user_id = m.id and r.sport = field_rec.sport
  left join public.crew_members cm
    on cm.crew_id = field_rec.crew_id and cm.user_id = m.id
  left join lateral (
    select activity.distance_m, activity.moving_sec, activity.avg_hr, activity.verified, activity.provenance
    from public.activities activity
    where field_rec.sport <> 'walking'
      and activity.user_id = m.id
      and activity.disposition = 'counted'
      and activity.provenance not in ('demo', 'manual')
      and coalesce(activity.source_label, activity.provider::text) <> 'history'
      and coalesce(activity.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
      and activity.sport = field_rec.sport
      and activity.started_at >= field_rec.wave_start
      and activity.started_at < field_rec.week_end
      and activity.started_at <= statement_timestamp()
  ) a on true
  group by p.id, cm.display_name, p.display_name, r.open_elo, r.verified_elo, field_rec.sport, field_rec.wave_start, field_rec.week_end;
end;
$$;

create or replace function public.save_compete_account_before_milestones(p_state jsonb, p_activities jsonb, p_readiness jsonb, p_expected_updated_at timestamptz)
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

  insert into public.profiles(id,display_name,city,primary_sport,avatar_url,gender,country_code,updated_at)
    values(uid,coalesce(nullif(left(p_state->>'name',80),''),'Athlete'),left(p_state->>'city',80),p_state->>'primary',p_state->>'avatarUrl',
      case when p_state->>'gender' in ('male','female','other') then p_state->>'gender' else null end,
      case when length(coalesce(p_state->>'countryCode',''))=2 then upper(left(p_state->>'countryCode',2)) else null end,
      committed)
    on conflict(id) do update set display_name=excluded.display_name,city=excluded.city,primary_sport=excluded.primary_sport,avatar_url=excluded.avatar_url,
      gender=excluded.gender,country_code=excluded.country_code,updated_at=excluded.updated_at;
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
  insert into public.sleep_nights(user_id,night_id,day,score,duration_min,efficiency,deep_min,rem_min,light_min,awake_min,source,verified)
    select uid,r->>'id',(r->>'day')::date,(r->>'score')::numeric,(r->>'durationMin')::numeric,(r->>'efficiency')::numeric,
      (r->>'deepMin')::numeric,(r->>'remMin')::numeric,(r->>'lightMin')::numeric,(r->>'awakeMin')::numeric,r->>'source',(r->>'verified')::boolean
      from jsonb_array_elements(p_state->'sleepNights') r
    on conflict(user_id,night_id) do update set day=excluded.day,score=excluded.score,duration_min=excluded.duration_min,efficiency=excluded.efficiency,
      deep_min=excluded.deep_min,rem_min=excluded.rem_min,light_min=excluded.light_min,awake_min=excluded.awake_min,source=excluded.source,verified=excluded.verified;
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

