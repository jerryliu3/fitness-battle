create table public.daily_health_readings (
 user_id uuid not null references public.profiles(id) on delete cascade,
 provider public.fitness_provider not null,
 day date not null,
 steps double precision check(steps>=0),
 resting_hr double precision check(resting_hr>0),
 hrv double precision check(hrv>=0),
 updated_at timestamptz not null default now(),
 primary key(user_id,provider,day)
);
alter table public.daily_health_readings enable row level security;
revoke all on public.daily_health_readings from public,anon,authenticated;
grant select on public.daily_health_readings to authenticated;
grant all on public.daily_health_readings to service_role;
create policy daily_health_owner_read on public.daily_health_readings for select to authenticated using(user_id=(select auth.uid()));
-- Separate health feeds update the same day without erasing other measurements.
create function private.merge_daily_health() returns trigger language plpgsql set search_path='' as $$
begin new.steps=coalesce(new.steps,old.steps); new.resting_hr=coalesce(new.resting_hr,old.resting_hr); new.hrv=coalesce(new.hrv,old.hrv); return new; end $$;
create trigger merge_daily_health before update on public.daily_health_readings for each row execute function private.merge_daily_health();
insert into public.daily_health_readings(user_id,provider,day,steps,resting_hr)
select distinct on(user_id,payload->>'calendarDate') user_id,'garmin',(payload->>'calendarDate')::date,(payload->>'steps')::double precision,nullif((payload->>'restingHeartRateInBeatsPerMinute')::double precision,0)
from private.garmin_records where feed='dailies' and payload->>'calendarDate' ~ '^\d{4}-\d{2}-\d{2}$' order by user_id,payload->>'calendarDate',updated_at desc
on conflict(user_id,provider,day) do update set steps=excluded.steps,resting_hr=excluded.resting_hr;
insert into public.daily_health_readings(user_id,provider,day,hrv)
select distinct on(user_id,payload->>'calendarDate') user_id,'garmin',(payload->>'calendarDate')::date,(payload->>'lastNightAvg')::double precision
from private.garmin_records where feed='hrv' and payload->>'calendarDate' ~ '^\d{4}-\d{2}-\d{2}$' order by user_id,payload->>'calendarDate',updated_at desc
on conflict(user_id,provider,day) do update set hrv=excluded.hrv;
