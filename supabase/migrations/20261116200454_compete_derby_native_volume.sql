-- Team event places use native duration, steps or distance, independently of weekly Effort Score.
create or replace function public.crew_derby_standings(p_crew_id uuid) returns jsonb
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
      sum(s.moving_sec) as moving_sec
    from public.week_fields f cross join lateral private.week_field_scores(f.id) s
    where f.sport = event.sport and f.wave_start = event.wave_start and f.week_end = event.week_end
      and f.crew_id is not null and f.roster_locked_at is not null
    group by f.crew_id
  ), scores as (
    select crew_id, name, case when event.sport = 'strength' then moving_sec else distance_m end as score from totals
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
