begin;
do $$
declare
  actor uuid := gen_random_uuid(); starts timestamptz := statement_timestamp()+interval '460 days';
  saved public.race_routes; edited public.race_routes; snapshot jsonb;
begin
  if has_function_privilege('authenticated','public.admin_save_race_route(uuid,text,text,text,jsonb,boolean,timestamptz)','EXECUTE')
     or has_function_privilege('anon','public.admin_save_race_route(uuid,text,text,text,jsonb,boolean,timestamptz)','EXECUTE') then
    raise exception 'Admin save exposed to athletes';
  end if;
  if not has_function_privilege('service_role','public.admin_save_race_route(uuid,text,text,text,jsonb,boolean,timestamptz)','EXECUTE') then
    raise exception 'Admin save not granted';
  end if;
  update public.race_routes set is_active=false;
  saved := public.admin_save_race_route(actor,'admin-test-loop','Original','Test','[[0,0],[0.02,0]]',true,null);
  if (select count(*) from public.admin_race_route_actions where route_id=saved.id and before_route is null) <> 1 then
    raise exception 'Creation not audited';
  end if;
  insert into auth.users(id,email) values(actor,actor::text||'@test.invalid');
  insert into public.week_fields(sport,wave_start,week_end,member_ids) values('running',starts,starts+interval '7 days',array[actor]);
  perform set_config('request.jwt.claim.sub',actor::text,true);
  snapshot := public.competition_route('running',starts,starts+interval '7 days');
  edited := public.admin_save_race_route(actor,saved.id,'Edited','Test','[[0,0],[0.03,0]]',false,saved.updated_at);
  if edited.updated_at=saved.updated_at or edited.is_active then raise exception 'Revision or availability not updated'; end if;
  if (select count(*) from public.admin_race_route_actions where route_id=saved.id) <> 2 then raise exception 'Edit not audited'; end if;
  if public.competition_route('running',starts,starts+interval '7 days') <> snapshot then raise exception 'Admin edit changed assigned scenery'; end if;
  begin
    perform public.admin_save_race_route(actor,saved.id,'Stale','Test','[[0,0],[0.04,0]]',true,saved.updated_at);
    raise exception 'Stale edit accepted';
  exception when serialization_failure then null; end;
  begin
    perform public.admin_save_race_route(actor,saved.id,'Invalid','Test','[[0,0],[999,0]]',true,edited.updated_at);
    raise exception 'Invalid geometry accepted';
  exception when check_violation then null; end;
  if (select count(*) from public.admin_race_route_actions where route_id=saved.id) <> 2 then raise exception 'Failed save created an audit record'; end if;
  if (select name from public.race_routes where id=saved.id) <> 'Edited' then raise exception 'Failed save mutated route'; end if;
end;
$$;
rollback;
