-- Owner override for a competition wave before it starts. Catalog geometry is copied into the
-- frozen snapshot the same way automatic assignment does.
create function public.admin_assign_weekly_race_route(
  p_actor_id uuid,
  p_wave_start timestamptz,
  p_route_id text
) returns public.weekly_race_routes
language plpgsql security invoker set search_path = '' as $$
declare chosen public.race_routes; saved public.weekly_race_routes;
begin
  if p_actor_id is null then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_wave_start is null or p_route_id is null then raise exception 'invalid_assignment'; end if;
  if p_wave_start <= clock_timestamp() then
    raise exception 'competition_already_started' using errcode = '40001';
  end if;
  select * into chosen from public.race_routes where id = p_route_id;
  if chosen.id is null then raise exception 'route_not_found' using errcode = '23503'; end if;
  insert into public.weekly_race_routes(wave_start, route_id, route_name, coordinates)
    values (p_wave_start, chosen.id, chosen.name, chosen.coordinates)
  on conflict (wave_start) do update set
    route_id = excluded.route_id,
    route_name = excluded.route_name,
    coordinates = excluded.coordinates
  where public.weekly_race_routes.wave_start > clock_timestamp()
  returning * into saved;
  if saved.wave_start is null then raise exception 'competition_already_started' using errcode = '40001'; end if;
  return saved;
end;
$$;
revoke all on function public.admin_assign_weekly_race_route(uuid,timestamptz,text) from public, anon, authenticated;
grant execute on function public.admin_assign_weekly_race_route(uuid,timestamptz,text) to service_role;