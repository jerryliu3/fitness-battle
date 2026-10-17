-- Timezone source of truth: America/New_York (EST/EDT) for periods, weeks, and leaderboards.

-- ---------------------------------------------------------------------------
-- 1. Period bounds in America/New_York (supports configurable timezone parameter)
-- ---------------------------------------------------------------------------
create or replace function public.period_bounds(
  p_kind public.period_kind,
  p_anchor timestamptz,
  p_custom_starts timestamptz default null,
  p_custom_ends timestamptz default null,
  p_timezone text default 'America/New_York'
)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select
    case p_kind
      when 'daily' then (date_trunc('day', p_anchor at time zone coalesce(nullif(trim(p_timezone), ''), 'America/New_York')) at time zone coalesce(nullif(trim(p_timezone), ''), 'America/New_York'))
      when 'monthly' then (date_trunc('month', p_anchor at time zone coalesce(nullif(trim(p_timezone), ''), 'America/New_York')) at time zone coalesce(nullif(trim(p_timezone), ''), 'America/New_York'))
      when 'custom' then p_custom_starts
      else (date_trunc('week', p_anchor at time zone coalesce(nullif(trim(p_timezone), ''), 'America/New_York')) at time zone coalesce(nullif(trim(p_timezone), ''), 'America/New_York'))
    end,
    case p_kind
      when 'daily' then ((date_trunc('day', p_anchor at time zone coalesce(nullif(trim(p_timezone), ''), 'America/New_York')) + interval '1 day') at time zone coalesce(nullif(trim(p_timezone), ''), 'America/New_York'))
      when 'monthly' then ((date_trunc('month', p_anchor at time zone coalesce(nullif(trim(p_timezone), ''), 'America/New_York')) + interval '1 month') at time zone coalesce(nullif(trim(p_timezone), ''), 'America/New_York'))
      when 'custom' then p_custom_ends
      else ((date_trunc('week', p_anchor at time zone coalesce(nullif(trim(p_timezone), ''), 'America/New_York')) + interval '7 days') at time zone coalesce(nullif(trim(p_timezone), ''), 'America/New_York'))
    end;
$$;

revoke all on function public.period_bounds(public.period_kind, timestamptz, timestamptz, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.period_bounds(public.period_kind, timestamptz, timestamptz, timestamptz, text)
  to current_user;
grant execute on function public.period_bounds(public.period_kind, timestamptz, timestamptz, timestamptz, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- 2. Backwards-compatible period_bounds_utc points to America/New_York
-- ---------------------------------------------------------------------------
create or replace function public.period_bounds_utc(
  p_kind public.period_kind,
  p_anchor timestamptz,
  p_custom_starts timestamptz default null,
  p_custom_ends timestamptz default null
)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select starts_at, ends_at
  from public.period_bounds(p_kind, p_anchor, p_custom_starts, p_custom_ends, 'America/New_York');
$$;

revoke all on function public.period_bounds_utc(public.period_kind, timestamptz, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.period_bounds_utc(public.period_kind, timestamptz, timestamptz, timestamptz)
  to current_user;
grant execute on function public.period_bounds_utc(public.period_kind, timestamptz, timestamptz, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- 3. Profile default timezone set to America/New_York
-- ---------------------------------------------------------------------------
alter table public.profiles alter column timezone set default 'America/New_York';
update public.profiles set timezone = 'America/New_York' where timezone = 'UTC' or timezone is null;

create or replace function public.complete_onboarding(
  p_display_name text,
  p_city text,
  p_primary_sport text,
  p_timezone text default 'America/New_York'
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  if p_primary_sport not in ('running', 'cycling', 'walking', 'strength') then
    raise exception using errcode = '22023', message = 'invalid_primary_sport';
  end if;

  update public.profiles
  set
    display_name = left(trim(coalesce(p_display_name, display_name)), 80),
    city = left(trim(coalesce(p_city, '')), 80),
    primary_sport = p_primary_sport,
    timezone = coalesce(nullif(trim(p_timezone), ''), 'America/New_York'),
    onboarding_completed_at = coalesce(onboarding_completed_at, now()),
    updated_at = now()
  where id = v_uid
  returning * into v_profile;

  if not found then
    raise exception using errcode = '22023', message = 'profile_not_found';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.complete_onboarding(text, text, text, text) from public, anon;
grant execute on function public.complete_onboarding(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Crew week sharing uses America/New_York bounds
-- ---------------------------------------------------------------------------
create or replace function public.share_crew_week(p_crew_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  crew_sport text;
  week_start timestamptz;
  week_end timestamptz;
  saved integer := 0;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  if not private.is_active_crew_member(p_crew_id) then
    raise exception 'not_a_member';
  end if;
  select sport into crew_sport from public.crews where id = p_crew_id;
  if crew_sport is null then
    raise exception 'crew_not_found';
  end if;

  week_start := (date_trunc('week', (statement_timestamp() at time zone 'America/New_York')) at time zone 'America/New_York');
  week_end := ((date_trunc('week', (statement_timestamp() at time zone 'America/New_York')) + interval '7 days') at time zone 'America/New_York');

  with incoming as (
    select
      a.compete_key as id,
      a.started_at,
      coalesce(a.sport, crew_sport) as sport,
      coalesce(
        a.distance_m,
        case
          when coalesce(a.sport, crew_sport) in ('running', 'cycling', 'walking')
            then a.metric_value
          else 0
        end,
        0
      ) as distance_m,
      coalesce(a.moving_sec, 0) as moving_sec,
      coalesce(a.provenance, 'recorded') as provenance
    from public.activities a
    where a.user_id = uid
      and coalesce(a.sport, crew_sport) = crew_sport
      and a.disposition = 'counted'
      and a.provenance <> 'demo'
      and coalesce(a.source_label, a.provider::text) <> 'history'
      and a.started_at >= week_start
      and a.started_at < week_end
      and a.compete_key is not null
  ),
  upserted as (
    insert into public.crew_entries (
      crew_id, user_id, activity_id, started_at, sport, distance_m, moving_sec, disposition, provenance
    )
    select p_crew_id, uid, id, started_at, sport, distance_m, moving_sec, 'counted', provenance
    from incoming
    on conflict (crew_id, user_id, activity_id) do update
      set started_at = excluded.started_at,
          sport = excluded.sport,
          distance_m = excluded.distance_m,
          moving_sec = excluded.moving_sec,
          disposition = 'counted',
          provenance = excluded.provenance
    returning 1
  ),
  retired as (
    update public.crew_entries entry
    set disposition = 'excluded'
    where entry.crew_id = p_crew_id
      and entry.user_id = uid
      and entry.started_at >= week_start
      and entry.started_at < week_end
      and not exists (
        select 1 from incoming where incoming.id = entry.activity_id
      )
    returning 1
  )
  select coalesce((select count(*) from upserted), 0)::integer into saved;

  return saved;
end;
$$;

revoke all on function public.share_crew_week(uuid) from public, anon;
grant execute on function public.share_crew_week(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Crew rest week planning uses America/New_York
-- ---------------------------------------------------------------------------
create or replace function public.set_crew_rest(p_crew_id uuid, p_rest boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  update public.crew_members
  set rest_week = case
    when p_rest then (date_trunc('week', (now() at time zone 'America/New_York')) )::date
    else null
  end
  where crew_id = p_crew_id and user_id = uid and status = 'active';
  if not found then
    raise exception 'not_a_member';
  end if;
end;
$$;

revoke all on function public.set_crew_rest(uuid, boolean) from public, anon;
grant execute on function public.set_crew_rest(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Align active non-custom periods to America/New_York and recompute standings
-- ---------------------------------------------------------------------------
update public.periods p
set
  starts_at = b.starts_at,
  ends_at = b.ends_at
from (
  select p2.id, pb.starts_at, pb.ends_at
  from public.periods p2
  cross join lateral public.period_bounds(p2.kind, now(), null, null, 'America/New_York') pb
  where p2.is_current = true and p2.kind <> 'custom'
) as b
where p.id = b.id;

do $$
declare
  r record;
begin
  for r in
    select distinct battle_id
    from public.periods
    where is_current = true and kind <> 'custom'
  loop
    perform public.recompute_battle_standings_internal(r.battle_id);
  end loop;
end;
$$;
