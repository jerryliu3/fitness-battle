begin;
do $$
declare course jsonb;
begin
  course := public.route_surface_course('onboarding-overtake');
  if course is null or course->>'routeId' not like 'marathon-%' then
    raise exception 'Onboarding surface route unavailable';
  end if;
  if not has_function_privilege('anon', 'public.route_surface_course(text)', 'EXECUTE') then
    raise exception 'Onboarding surface not readable anonymously';
  end if;
  if has_function_privilege('authenticated', 'public.admin_assign_route_surface(uuid,text,text)', 'EXECUTE') then
    raise exception 'Surface assign exposed to athletes';
  end if;
end;
$$;
rollback;