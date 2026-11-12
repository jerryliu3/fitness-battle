-- Derby is a projection of ordinary crew event fields in the same exact wave.
-- Reuse the score reader; do not add another registration, score or result store.
create function private.week_field_scores(p_field_id uuid)
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
  field_rec public.week_fields;
begin
  select * into field_rec from public.week_fields where id = p_field_id;
  return query
  select
    p.id,
    coalesce(cm.display_name, p.display_name),
    coalesce((field_rec.entry_ratings->p.id::text->>'open')::numeric,r.open_elo,1000)::numeric,
    coalesce(sum(a.distance_m), 0)::numeric,
    coalesce(sum(a.moving_sec), 0)::numeric,
    coalesce((field_rec.entry_ratings->p.id::text->>'verified')::numeric,r.verified_elo,1000)::numeric,
    coalesce(sum(a.distance_m) filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling', 'walking')), 0)::numeric,
    coalesce(sum(a.moving_sec) filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling', 'walking')), 0)::numeric,
    coalesce(sum(private.field_activity_effort(field_rec.sport,a.distance_m,a.moving_sec,a.avg_hr)),0)::double precision,
    coalesce(sum(private.field_activity_effort(field_rec.sport,a.distance_m,a.moving_sec,a.avg_hr)) filter (where a.verified and a.provenance='recorded' and field_rec.sport in ('running','cycling','walking')),0)::double precision
  from unnest(field_rec.member_ids) as m(id)
  join public.profiles p on p.id = m.id
  left join public.sport_ratings r
    on r.user_id = m.id and r.sport = field_rec.sport
  left join public.crew_members cm
    on cm.crew_id = field_rec.crew_id and cm.user_id = m.id
  left join lateral (
    select activity.distance_m, activity.moving_sec, activity.avg_hr, activity.verified, activity.provenance
    from private.competition_activity_rows(field_rec.sport,field_rec.wave_start,field_rec.week_end,m.id) activity
    where activity.user_id = m.id
      and activity.disposition = 'counted'
      and activity.provenance <> 'demo'
      and coalesce(activity.source_label, activity.provider::text) <> 'history'
      and coalesce(activity.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
      and activity.sport = field_rec.sport
      and activity.started_at >= field_rec.wave_start
      and activity.started_at < field_rec.week_end
      and activity.started_at <= statement_timestamp()
  ) a on true
  group by p.id, cm.display_name, p.display_name, r.open_elo, r.verified_elo
  order by p.id;
end;
$$;

revoke all on function private.week_field_scores(uuid) from public, anon, authenticated;

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
  if field_rec.wave_start>statement_timestamp() then raise exception 'wave_not_started'; end if;

  return query select * from private.week_field_scores(p_field_id);
end;
$$;

revoke all on function public.week_field_roster(uuid) from public, anon;
grant execute on function public.week_field_roster(uuid) to authenticated;

create function public.crew_derby_standings(p_crew_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare event public.week_fields; teams jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.is_active_crew_member(p_crew_id) then raise exception 'not_a_member'; end if;
  select f.* into event from public.week_fields f where f.crew_id = p_crew_id
    and f.wave_start <= statement_timestamp() and f.week_end > statement_timestamp() and f.roster_locked_at is not null
    order by exists (select 1 from public.wave_enrollments e where e.field_id = f.id and e.user_id = auth.uid()) desc,
      f.wave_start desc limit 1;
  if event.id is null then return null; end if;
  -- Only aggregate team identity and score cross the crew membership boundary.
  -- Individual identities, activity summaries, synthetic fillers and ratings do not.
  with totals as (
    select f.crew_id, min(f.name) as name,
      sum(case when event.sport in ('running', 'cycling') then s.verified_distance_m else s.distance_m end) as distance_m,
      sum(s.effort) as effort
    from public.week_fields f cross join lateral private.week_field_scores(f.id) s
    where f.sport = event.sport and f.wave_start = event.wave_start and f.week_end = event.week_end
      and f.crew_id is not null and f.roster_locked_at is not null
    group by f.crew_id
  ), scores as (
    select crew_id, name, case when event.sport = 'strength' then effort::numeric else distance_m end as score from totals
  ), ranked as (
    select *, rank() over (order by score desc) as place from scores
  )
  select jsonb_agg(to_jsonb(r) order by place, crew_id) into teams from ranked r;
  -- A team race needs at least two actual crews. No opponent is invented.
  if coalesce(jsonb_array_length(teams), 0) < 2 then return null; end if;
  return jsonb_build_object('field_id', event.id, 'sport', event.sport, 'wave_start', event.wave_start,
    'week_end', event.week_end, 'teams', teams);
end; $$;
revoke all on function public.crew_derby_standings(uuid) from public, anon;
grant execute on function public.crew_derby_standings(uuid) to authenticated;
