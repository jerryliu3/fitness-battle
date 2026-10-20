-- Align aggregate Crew progress with canonical Eastern periods, including DST.
create or replace function public.crew_week_totals(p_crew_id uuid)
returns table (user_id uuid, distance_m numeric, moving_sec numeric, session_count bigint)
language plpgsql stable security definer set search_path = ''
as $$
declare
  week_start timestamptz;
  week_end timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if not private.is_active_crew_member(p_crew_id) then raise exception 'not_a_member'; end if;
  select b.starts_at, b.ends_at into week_start, week_end
    from public.period_bounds('weekly', statement_timestamp(), null, null, 'America/New_York') b;
  return query
    select m.user_id,
      coalesce(sum(a.distance_m), 0), coalesce(sum(a.moving_sec), 0), count(a.id)
    from public.crew_members m
    join public.crews c on c.id = m.crew_id
    left join public.activities a on a.user_id = m.user_id and a.sport = c.sport
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
