do $$ declare u uuid:=gen_random_uuid(); begin
 insert into auth.users(id,email) values(u,u::text||'@test.invalid');
 insert into public.daily_health_readings(user_id,provider,day,steps,resting_hr) values(u,'garmin','2026-10-30',5000,50);
 insert into public.daily_health_readings(user_id,provider,day,hrv) values(u,'garmin','2026-10-30',45) on conflict(user_id,provider,day) do update set steps=excluded.steps,resting_hr=excluded.resting_hr,hrv=excluded.hrv;
 if not exists(select 1 from public.daily_health_readings where user_id=u and steps=5000 and resting_hr=50 and hrv=45) then raise exception 'independent feed erased other metrics'; end if;
 if has_table_privilege('authenticated','public.daily_health_readings','INSERT') then raise exception 'client can forge daily measurements'; end if;
end $$;
