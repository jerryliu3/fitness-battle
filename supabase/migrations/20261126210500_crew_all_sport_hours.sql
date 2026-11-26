-- Aggregate non-distance Crew metrics (hours, sessions, contributors) across
-- all counted sports (matching Home's This week chart) while keeping
-- distance_m contracts and Derbies scoped to crews.sport.

create or replace function public.crew_week_totals(p_crew_id uuid)
returns table (user_id uuid, distance_m numeric, moving_sec numeric, session_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
declare
  week_start timestamptz;
  week_end timestamptz;
  active_metric text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.is_active_crew_member(p_crew_id) then raise exception 'not_a_member'; end if;
  select b.starts_at, b.ends_at into week_start, week_end
    from public.period_bounds('weekly', statement_timestamp(), null, null, 'America/New_York') b;
  select cc.metric into active_metric
    from public.crew_contracts cc
    where cc.crew_id = p_crew_id and cc.cancelled_at is null
      and cc.starts_at <= statement_timestamp() and cc.ends_at > statement_timestamp()
    order by cc.created_at desc
    limit 1;
  if active_metric is null then
    select case when c.format = 'personal_target' or c.sport = 'strength' then 'sessions' else 'distance_m' end
      into active_metric
      from public.crews c where c.id = p_crew_id;
  end if;
  return query
    select m.user_id,
      coalesce(sum(a.distance_m), 0), coalesce(sum(a.moving_sec), 0), count(a.id)
    from public.crew_members m
    join public.crews c on c.id = m.crew_id
    left join public.activities a on a.user_id = m.user_id
      and (
        (coalesce(active_metric, 'distance_m') = 'distance_m' and a.sport = c.sport)
        or (coalesce(active_metric, 'distance_m') <> 'distance_m' and a.sport in ('running', 'cycling', 'walking', 'strength'))
      )
      and a.started_at >= week_start and a.started_at < week_end
      and a.started_at <= statement_timestamp()
      and a.disposition = 'counted' and a.provenance <> 'demo'
      and coalesce(a.source_label, a.provider::text) <> 'history'
      and coalesce(a.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
    where m.crew_id = p_crew_id and m.status = 'active'
    group by m.user_id;
end;
$$;
revoke all on function public.crew_week_totals(uuid) from public, anon;
grant execute on function public.crew_week_totals(uuid) to authenticated;

create or replace function public.crew_previous_week_totals(p_crew_id uuid)
returns table (user_id uuid, distance_m numeric, moving_sec numeric, session_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
declare
  current_start timestamptz;
  week_start timestamptz;
  week_end timestamptz;
  active_metric text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.is_active_crew_member(p_crew_id) then raise exception 'not_a_member'; end if;
  select b.starts_at into current_start from public.period_bounds('weekly', statement_timestamp(), null, null, 'America/New_York') b;
  select b.starts_at, b.ends_at into week_start, week_end from public.period_bounds('weekly', current_start - interval '1 microsecond', null, null, 'America/New_York') b;
  select cc.metric into active_metric
    from public.crew_contracts cc
    where cc.crew_id = p_crew_id and cc.cancelled_at is null
      and cc.starts_at = week_start
    order by cc.created_at desc
    limit 1;
  if active_metric is null then
    select case when c.format = 'personal_target' or c.sport = 'strength' then 'sessions' else 'distance_m' end
      into active_metric
      from public.crews c where c.id = p_crew_id;
  end if;
  return query select m.user_id, coalesce(sum(a.distance_m), 0), coalesce(sum(a.moving_sec), 0), count(a.id)
    from public.crew_members m join public.crews c on c.id = m.crew_id
    left join public.activities a on a.user_id = m.user_id
      and (
        (coalesce(active_metric, 'distance_m') = 'distance_m' and a.sport = c.sport)
        or (coalesce(active_metric, 'distance_m') <> 'distance_m' and a.sport in ('running', 'cycling', 'walking', 'strength'))
      )
      and a.started_at >= week_start and a.started_at < week_end
      and a.disposition = 'counted' and a.provenance <> 'demo'
      and coalesce(a.source_label, a.provider::text) <> 'history'
      and coalesce(a.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
    where m.crew_id = p_crew_id and m.status = 'active' group by m.user_id;
end;
$$;
revoke all on function public.crew_previous_week_totals(uuid) from public, anon;
grant execute on function public.crew_previous_week_totals(uuid) to authenticated;

create or replace function private.crew_contract_progress(p_contract public.crew_contracts)
returns table (value numeric, contributors integer)
language sql volatile security definer set search_path = '' as $$
  with totals as (
    select member_id, count(a.id) as sessions,
      coalesce(sum(a.distance_m), 0) as distance_m,
      coalesce(sum(a.moving_sec), 0) as moving_sec
    from unnest(p_contract.member_ids) as roster(member_id)
    left join lateral (
      select act.id, act.distance_m, act.moving_sec
      from private.competition_activity_rows(p_contract.sport, p_contract.starts_at, p_contract.ends_at, member_id) act
      where p_contract.metric = 'distance_m'
        and act.disposition = 'counted'
        and act.provenance not in ('demo', 'manual')
        and coalesce(act.journal_only, false) = false
        and coalesce(act.source_label, act.provider::text) <> 'history'
        and coalesce(act.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
      union all
      select act.id, act.distance_m, act.moving_sec
      from public.activities act
      where p_contract.metric <> 'distance_m'
        and act.user_id = member_id
        and act.sport in ('running', 'cycling', 'walking', 'strength')
        and act.started_at >= p_contract.starts_at
        and act.started_at < least(p_contract.ends_at, statement_timestamp())
        and act.disposition = 'counted'
        and act.provenance <> 'demo'
        and coalesce(act.source_label, act.provider::text) <> 'history'
        and coalesce(act.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
    ) a on true
    group by member_id
  )
  select coalesce(sum(case p_contract.metric when 'distance_m' then distance_m when 'moving_sec' then moving_sec
    when 'sessions' then sessions when 'contributors' then case when sessions > 0 then 1 else 0 end end), 0),
    count(*) filter (where sessions > 0)::integer from totals;
$$;
revoke all on function private.crew_contract_progress(public.crew_contracts) from public, anon, authenticated;
