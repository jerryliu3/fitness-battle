-- Add 'all' sport and 'duration' format (target_hours) as the crew defaults.

alter table public.crews drop constraint if exists crews_format_check;

alter table public.crews
  alter column sport set default 'all',
  alter column format set default 'duration',
  add column if not exists target_hours numeric not null default 10 check (target_hours > 0),
  add constraint crews_format_check check (format in ('volume', 'personal_target', 'cooperative', 'duration'));

drop function if exists public.create_crew(text, text, text, integer, numeric);

create function public.create_crew(
  p_name text,
  p_sport text default 'all',
  p_format text default 'duration',
  p_target_sessions integer default 3,
  p_journey_km numeric default 40,
  p_target_hours numeric default 10
)
returns public.crews
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  created public.crews;
  code text;
  normalized_sport text := trim(coalesce(nullif(p_sport, ''), 'all'));
  normalized_format text := coalesce(nullif(p_format, ''), 'duration');
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  if normalized_sport not in ('all', 'running', 'cycling', 'walking', 'strength') then
    raise exception 'invalid_sport';
  end if;
  if normalized_format not in ('volume', 'personal_target', 'cooperative', 'duration') then
    raise exception 'invalid_format';
  end if;
  if char_length(trim(p_name)) < 1 then
    raise exception 'name_required';
  end if;
  code := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.crews (name, invite_code, sport, format, target_sessions, journey_km, target_hours, created_by)
  values (
    left(trim(p_name), 80),
    code,
    normalized_sport,
    normalized_format,
    least(14, greatest(1, p_target_sessions)),
    greatest(1, p_journey_km),
    greatest(1, coalesce(p_target_hours, 10)),
    uid
  )
  returning * into created;
  insert into public.crew_members (crew_id, user_id, display_name, status)
  select created.id, uid, p.display_name, 'active'
  from public.profiles p
  where p.id = uid;
  return created;
end;
$$;

revoke all on function public.create_crew(text, text, text, integer, numeric, numeric) from public, anon;
grant execute on function public.create_crew(text, text, text, integer, numeric, numeric) to authenticated;

drop function if exists public.update_crew_settings(uuid, text, text, integer, numeric);

create function public.update_crew_settings(
  p_crew_id uuid,
  p_sport text,
  p_format text,
  p_target_sessions integer,
  p_journey_km numeric,
  p_target_hours numeric default null
)
returns public.crews
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  updated public.crews;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  if not exists (
    select 1
    from public.crew_members
    where crew_id = p_crew_id
      and user_id = uid
      and status = 'active'
  ) then
    raise exception 'not_a_member';
  end if;
  if p_format not in ('volume', 'personal_target', 'cooperative', 'duration') then
    raise exception 'invalid_format';
  end if;
  if trim(coalesce(p_sport, '')) not in ('all', 'running', 'cycling', 'walking', 'strength') then
    raise exception 'invalid_sport';
  end if;

  update public.crews
  set
    sport = trim(p_sport),
    format = p_format,
    target_sessions = least(14, greatest(1, coalesce(p_target_sessions, target_sessions))),
    journey_km = greatest(1, coalesce(p_journey_km, journey_km)),
    target_hours = greatest(1, coalesce(p_target_hours, target_hours))
  where id = p_crew_id
  returning * into updated;

  if updated.id is null then
    raise exception 'crew_not_found';
  end if;

  return updated;
end;
$$;

revoke all on function public.update_crew_settings(uuid, text, text, integer, numeric, numeric) from public, anon;
grant execute on function public.update_crew_settings(uuid, text, text, integer, numeric, numeric) to authenticated;

create or replace function public.set_crew_contract(p_crew_id uuid, p_title text, p_metric text, p_target numeric, p_expected_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare saved uuid; current_id uuid; sport_id text; roster uuid[]; season uuid;
  starts timestamptz;
  ends timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select sport into sport_id from public.crews where id = p_crew_id for update;
  if not private.is_active_crew_member(p_crew_id) then raise exception 'not_a_member'; end if;
  if p_title is null or char_length(trim(p_title)) not between 1 and 80 or p_metric is null
    or p_metric not in ('distance_m', 'moving_sec', 'sessions', 'contributors') or p_target is null
    or p_target <= 0 or p_target >= 'Infinity'::numeric then raise exception 'invalid_contract'; end if;
  starts := date_trunc('week', clock_timestamp() at time zone 'America/New_York') at time zone 'America/New_York';
  ends := ((starts at time zone 'America/New_York') + interval '7 days') at time zone 'America/New_York';
  perform private.settle_crew_contracts(p_crew_id);
  select id into current_id from public.crew_contracts where crew_id = p_crew_id and starts_at = starts and cancelled_at is null;
  if current_id is distinct from p_expected_id then raise exception 'contract_changed'; end if;
  select array_agg(user_id order by user_id) into roster from public.crew_members where crew_id = p_crew_id and status = 'active';
  if sport_id in ('strength', 'all') and p_metric = 'distance_m' then raise exception 'invalid_contract'; end if;
  if p_metric in ('sessions', 'contributors') and p_target <> trunc(p_target) then raise exception 'invalid_contract'; end if;
  if p_metric = 'contributors' and p_target > cardinality(roster) then raise exception 'invalid_contract'; end if;
  select id into season from public.crew_seasons where crew_id = p_crew_id and starts_at <= starts and ends_at >= ends;
  update public.crew_contracts set cancelled_at = clock_timestamp() where id = current_id;
  insert into public.crew_contracts(crew_id, season_id, title, sport, metric, target, starts_at, ends_at, member_ids)
    values (p_crew_id, season, trim(p_title), sport_id, p_metric, p_target, starts, ends, roster) returning id into saved;
  return saved;
end; $$;

revoke all on function public.set_crew_contract(uuid, text, text, numeric, uuid) from public, anon;
grant execute on function public.set_crew_contract(uuid, text, text, numeric, uuid) to authenticated;

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
    select case
      when c.format = 'duration' then 'moving_sec'
      when c.format = 'personal_target' or c.sport in ('strength', 'all') then 'sessions'
      else 'distance_m'
    end
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
        (coalesce(active_metric, 'moving_sec') = 'distance_m' and a.sport = c.sport)
        or (coalesce(active_metric, 'moving_sec') <> 'distance_m' and a.sport in ('running', 'cycling', 'walking', 'strength'))
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
    select case
      when c.format = 'duration' then 'moving_sec'
      when c.format = 'personal_target' or c.sport in ('strength', 'all') then 'sessions'
      else 'distance_m'
    end
      into active_metric
      from public.crews c where c.id = p_crew_id;
  end if;
  return query select m.user_id, coalesce(sum(a.distance_m), 0), coalesce(sum(a.moving_sec), 0), count(a.id)
    from public.crew_members m join public.crews c on c.id = m.crew_id
    left join public.activities a on a.user_id = m.user_id
      and (
        (coalesce(active_metric, 'moving_sec') = 'distance_m' and a.sport = c.sport)
        or (coalesce(active_metric, 'moving_sec') <> 'distance_m' and a.sport in ('running', 'cycling', 'walking', 'strength'))
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
