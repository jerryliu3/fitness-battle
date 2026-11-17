-- Product surfaces (onboarding, etc.) reference catalog routes without freezing weekly snapshots.
create table public.route_surface_assignments (
  surface_id text primary key check (surface_id ~ '^[a-z0-9-]{3,80}$'),
  route_id text not null references public.race_routes(id) on delete restrict,
  updated_at timestamptz not null default now()
);
alter table public.route_surface_assignments enable row level security;
revoke all on public.route_surface_assignments from public, anon, authenticated;
grant select on public.route_surface_assignments to service_role;

insert into public.race_routes (id, name, location, coordinates, is_active) values
  ('onboarding-overtake', 'First overtake', 'Tutorial',
   '[[-73.974,40.764],[-73.970,40.770],[-73.965,40.773]]'::jsonb, true)
on conflict (id) do nothing;

insert into public.route_surface_assignments (surface_id, route_id)
  values ('onboarding-overtake', 'onboarding-overtake')
on conflict (surface_id) do nothing;

create function public.route_surface_course(p_surface_id text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'surfaceId', a.surface_id,
    'routeId', r.id,
    'name', r.name,
    'coordinates', r.coordinates
  )
  from public.route_surface_assignments a
  join public.race_routes r on r.id = a.route_id
  where a.surface_id = p_surface_id;
$$;
revoke all on function public.route_surface_course(text) from public;
grant execute on function public.route_surface_course(text) to anon, authenticated, service_role;

create function public.admin_assign_route_surface(
  p_actor_id uuid,
  p_surface_id text,
  p_route_id text
) returns public.route_surface_assignments
language plpgsql security invoker set search_path = '' as $$
declare chosen public.race_routes; saved public.route_surface_assignments;
begin
  if p_actor_id is null then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_surface_id is null or p_route_id is null then raise exception 'invalid_assignment'; end if;
  select * into chosen from public.race_routes where id = p_route_id;
  if chosen.id is null then raise exception 'route_not_found' using errcode = '23503'; end if;
  insert into public.route_surface_assignments(surface_id, route_id, updated_at)
    values (p_surface_id, chosen.id, clock_timestamp())
  on conflict (surface_id) do update set
    route_id = excluded.route_id,
    updated_at = clock_timestamp()
  returning * into saved;
  return saved;
end;
$$;
revoke all on function public.admin_assign_route_surface(uuid,text,text) from public, anon, authenticated;
grant execute on function public.admin_assign_route_surface(uuid,text,text) to service_role;