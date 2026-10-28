-- Catalog changes and their audit records commit together. Saved competition
-- snapshots are intentionally outside this write path.
create table public.admin_race_route_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  route_id text not null references public.race_routes(id),
  before_route jsonb,
  after_route jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);
alter table public.admin_race_route_actions enable row level security;
revoke all on public.admin_race_route_actions from public, anon, authenticated;
grant select, insert on public.admin_race_route_actions to service_role;

create function public.admin_save_race_route(
  p_actor_id uuid, p_route_id text, p_name text, p_location text,
  p_coordinates jsonb, p_is_active boolean, p_expected_updated_at timestamptz
) returns public.race_routes
language plpgsql security invoker set search_path = '' as $$
declare previous public.race_routes; saved public.race_routes;
begin
  if p_actor_id is null then raise exception 'admin_required' using errcode='42501'; end if;
  select * into previous from public.race_routes where id=p_route_id for update;
  if found then
    if p_expected_updated_at is null or previous.updated_at is distinct from p_expected_updated_at then
      raise exception 'route_changed_reload' using errcode='40001';
    end if;
    update public.race_routes set name=p_name, location=p_location, coordinates=p_coordinates,
      is_active=p_is_active, updated_at=clock_timestamp() where id=p_route_id returning * into saved;
  else
    if p_expected_updated_at is not null then raise exception 'route_changed_reload' using errcode='40001'; end if;
    insert into public.race_routes(id,name,location,coordinates,is_active)
      values(p_route_id,p_name,p_location,p_coordinates,p_is_active) returning * into saved;
  end if;
  insert into public.admin_race_route_actions(actor_id,route_id,before_route,after_route)
    values(p_actor_id,saved.id,case when previous.id is null then null else to_jsonb(previous) end,to_jsonb(saved));
  return saved;
end;
$$;
revoke all on function public.admin_save_race_route(uuid,text,text,text,jsonb,boolean,timestamptz) from public, anon, authenticated;
grant execute on function public.admin_save_race_route(uuid,text,text,text,jsonb,boolean,timestamptz) to service_role;
