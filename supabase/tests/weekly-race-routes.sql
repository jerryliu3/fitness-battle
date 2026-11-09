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
  insert into public.week_fields(sport,wave_start,week_end,member_ids) values
    ('running',starts,ends,array[athlete]), ('cycling',starts,ends,array[athlete]);
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  begin
    perform public.competition_route('running',starts,ends);
    raise exception 'Outsider accepted';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from public.weekly_race_routes where wave_start=starts) then
    raise exception 'Unauthorized read created an assignment';
  end if;
  perform set_config('request.jwt.claim.sub',athlete::text,true);
  first_result := public.competition_route('running',starts,ends);
  select * into assigned from public.weekly_race_routes where wave_start=starts;
  if assigned.route_id is null then raise exception 'First read did not assign a route'; end if;
  second_result := public.competition_route('cycling',starts,ends);
  if first_result <> second_result then raise exception 'Week route differs by sport'; end if;
  if (select count(*) from public.weekly_race_routes where wave_start=starts) <> 1 then
    raise exception 'Fields in one week received multiple routes';
  end if;
  insert into public.week_fields(sport,wave_start,week_end,member_ids)
    values('running',starts+interval '7 days',ends+interval '7 days',array[athlete]);
  second_result := public.competition_route('running',starts+interval '7 days',ends+interval '7 days');
  if (select count(*) from public.race_routes where is_active) > 1 and second_result->>'id' = assigned.route_id then
    raise exception 'Consecutive weeks did not rotate';
  end if;
  update public.race_routes set name='Later catalog name', coordinates='[[0,0],[0.02,0]]'::jsonb
    where id=assigned.route_id;
  if public.competition_route('running',starts,ends) <> first_result then
    raise exception 'Catalog edit changed an active competition';
  end if;
  update public.week_fields set week_end=starts+interval '2 days'
    where sport='running' and wave_start=starts and week_end=ends;
  if public.competition_route('running',starts,starts+interval '2 days')->>'id' <> assigned.route_id then
    raise exception 'Early closure changed the competition route';
  end if;
  perform set_config('request.jwt.claim.sub','',true);
  begin
    perform public.competition_route('running',starts,starts+interval '2 days');
    raise exception 'Anonymous accepted';
  exception when insufficient_privilege then null; end;
  if has_function_privilege('anon','public.competition_route(text,timestamptz,timestamptz)','EXECUTE') then
    raise exception 'Anonymous execute granted';
  end if;
  if not has_function_privilege('authenticated','public.competition_route(text,timestamptz,timestamptz)','EXECUTE') then
    raise exception 'Authenticated route read not granted';
  end if;
  if has_table_privilege('authenticated','public.race_routes','INSERT')
     or has_table_privilege('authenticated','public.weekly_race_routes','UPDATE') then
    raise exception 'Athlete route write granted';
  end if;
  begin
    insert into public.race_routes(id,name,coordinates) values('invalid-coordinates','Invalid','[[999,0],[0,0]]');
    raise exception 'Invalid catalog geometry accepted';
  exception when check_violation then null; end;
  begin
    insert into public.race_routes(id,name,coordinates) values('empty-distance','Invalid','[[0,0],[0,0]]');
    raise exception 'Zero length catalog route accepted';
  exception when check_violation then null; end;
  update public.race_routes set is_active=false;
  insert into public.week_fields(sport,wave_start,week_end,member_ids)
    values('running',starts+interval '14 days',ends+interval '14 days',array[athlete]);
  perform set_config('request.jwt.claim.sub',athlete::text,true);
  begin
    perform public.competition_route('running',starts+interval '14 days',ends+interval '14 days');
    raise exception 'Empty catalog silently substituted a route';
  exception when raise_exception then
    if sqlerrm <> 'competition_route_unavailable' then raise; end if;
  end;
  update public.race_routes set is_active=true where id=assigned.route_id;
  second_result := public.competition_route('running',starts+interval '14 days',ends+interval '14 days');
  if second_result->>'id' <> assigned.route_id then raise exception 'Reactivated route not available on retry'; end if;
end;
$$;
rollback;
