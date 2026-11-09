-- Allow the same assigned route to be previewed by its own queued registrant.
create or replace function public.competition_route(p_sport text, p_start timestamptz, p_end timestamptz)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); assignment public.weekly_race_routes;
begin
  if uid is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_sport is null or p_sport not in ('running', 'cycling', 'walking') or p_start is null or p_end is null or p_end <= p_start then
    raise exception 'invalid_competition_route';
  end if;
  if not exists (
    select 1 from public.week_fields f
    where f.sport = p_sport and f.wave_start = p_start and f.week_end = p_end
      and uid = any(f.member_ids)
      and (f.crew_id is null or private.is_active_crew_member(f.crew_id))
  ) and not exists (
    select 1 from public.wave_enrollments e
    where e.user_id = uid and e.sport = p_sport
      and e.wave_start = p_start and e.week_end = p_end
      and e.wave_start > statement_timestamp()
  ) then raise exception 'field_not_found' using errcode = '42501'; end if;
  select * into assignment from public.weekly_race_routes
    where wave_start = p_start;
  if assignment.route_id is null then
    -- Choose once on the first authorized 4D read. The single statement uses
    -- one catalog snapshot; concurrent readers converge on the primary key.
    insert into public.weekly_race_routes(wave_start, route_id, route_name, coordinates)
    select p_start, id, name, coordinates from public.race_routes where is_active order by id
      offset mod(floor(extract(epoch from p_start) / 604800)::bigint,
        greatest((select count(*) from public.race_routes where is_active), 1)) limit 1
    on conflict (wave_start) do nothing;
    select * into assignment from public.weekly_race_routes where wave_start = p_start;
  end if;
  if assignment.route_id is null then raise exception 'competition_route_unavailable'; end if;
  return jsonb_build_object('id', assignment.route_id, 'name', assignment.route_name,
    'coordinates', assignment.coordinates, 'periodStart', assignment.wave_start,
    'periodEnd', p_end);
end;
$$;
revoke all on function public.competition_route(text,timestamptz,timestamptz) from public, anon;
grant execute on function public.competition_route(text,timestamptz,timestamptz) to authenticated;
