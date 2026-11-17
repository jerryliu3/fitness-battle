begin;
do $$
declare
  actor uuid := gen_random_uuid();
  future timestamptz := statement_timestamp() + interval '30 days';
  assigned public.weekly_race_routes;
begin
  if not has_function_privilege('service_role', 'public.admin_assign_weekly_race_route(uuid,timestamptz,text)', 'EXECUTE') then
    raise exception 'Admin assign not granted to service_role';
  end if;
  if has_function_privilege('authenticated', 'public.admin_assign_weekly_race_route(uuid,timestamptz,text)', 'EXECUTE') then
    raise exception 'Admin assign exposed to athletes';
  end if;
  assigned := public.admin_assign_weekly_race_route(actor, future, 'central-park-loop');
  if assigned.route_id <> 'central-park-loop' then raise exception 'Wrong route assigned'; end if;
  assigned := public.admin_assign_weekly_race_route(actor, future, 'marin-headlands-loop');
  if assigned.route_id <> 'marin-headlands-loop' then raise exception 'Future wave not reassigned'; end if;
  begin
    perform public.admin_assign_weekly_race_route(actor, statement_timestamp() - interval '1 day', 'central-park-loop');
    raise exception 'Past wave reassignment accepted';
  exception when sqlstate '40001' then null; end;
end;
$$;
rollback;