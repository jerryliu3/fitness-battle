-- Standalone regression fixture; no rows survive execution.
begin;
do $$
declare
  athlete uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
  starts timestamptz := statement_timestamp() + interval '370 days';
  ends timestamptz := statement_timestamp() + interval '377 days';
  assigned public.weekly_race_routes;
  first_result jsonb; second_result jsonb;
begin
  insert into auth.users(id,email) values
    (athlete, athlete::text || '@test.invalid'),
    (outsider, outsider::text || '@test.invalid');
  insert into public.week_fields(sport,wave_start,week_end,member_ids)
    values('running',starts,ends,array[athlete]);
  select * into assigned from public.weekly_race_routes where wave_start=starts;
  if assigned.route_id is null then raise exception 'Route not assigned at field creation'; end if;
  insert into public.week_fields(sport,wave_start,week_end,member_ids)
    values('cycling',starts,ends,array[athlete]);
  if (select count(*) from public.weekly_race_routes where wave_start=starts) <> 1 then
    raise exception 'Fields in one week received multiple routes';
  end if;
  insert into public.week_fields(sport,wave_start,week_end,member_ids)
    values('running',starts+interval '7 days',ends+interval '7 days',array[athlete]);
  if (select count(*) from public.race_routes where is_active) > 1
     and (select route_id from public.weekly_race_routes where wave_start=starts+interval '7 days') = assigned.route_id then
    raise exception 'Consecutive weeks did not rotate';
  end if;
  perform set_config('request.jwt.claim.sub',athlete::text,true);
  first_result := public.competition_route('running',starts,ends);
  second_result := public.competition_route('cycling',starts,ends);
  if first_result->>'id' <> second_result->>'id' then raise exception 'Week route differs by sport'; end if;
  update public.race_routes set name='Later catalog name', coordinates='[[0,0],[0.02,0]]'::jsonb
    where id=assigned.route_id;
  if public.competition_route('running',starts,ends)->>'name' <> assigned.route_name then
    raise exception 'Catalog edit changed an active competition';
  end if;
  if public.competition_route('running',starts,ends)->'coordinates' <> assigned.coordinates then
    raise exception 'Catalog edit changed competition geometry';
  end if;
  update public.week_fields set week_end=starts+interval '2 days'
    where sport='running' and wave_start=starts and week_end=ends;
  if public.competition_route('running',starts,starts+interval '2 days')->>'id' <> assigned.route_id then
    raise exception 'Early closure changed the competition route';
  end if;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  begin
    perform public.competition_route('running',starts,starts+interval '2 days');
    raise exception 'Outsider accepted';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.competition_route('running',starts,starts+interval '2 days');
    raise exception 'Anonymous accepted';
  exception when insufficient_privilege then null; end;
  if has_function_privilege('anon','public.competition_route(text,timestamptz,timestamptz)','EXECUTE') then
    raise exception 'Anonymous execute granted';
  end if;
  if has_table_privilege('authenticated','public.race_routes','INSERT')
     or has_table_privilege('authenticated','public.weekly_race_routes','UPDATE') then
    raise exception 'Athlete route write granted';
  end if;
end;
$$;
rollback;
