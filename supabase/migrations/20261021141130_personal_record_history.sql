-- Store qualifying whole-session receipts, never scaled estimates from a longer session.
create table public.personal_record_attempts (
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_key text not null,
  sport text not null check (sport in ('running','cycling')),
  distance_id text not null,
  started_at timestamptz not null,
  seconds numeric not null check (seconds>0),
  source text not null,
  verified boolean not null,
  primary key(activity_id,distance_id)
);
create index record_attempts_owner_date on public.personal_record_attempts(user_id,started_at);
alter table public.personal_record_attempts enable row level security;
create policy own_record_attempts on public.personal_record_attempts for select to authenticated using (user_id=(select auth.uid()));
grant select on public.personal_record_attempts to authenticated;
revoke insert,update,delete on public.personal_record_attempts from anon,authenticated;
grant all on public.personal_record_attempts to service_role;

create function private.capture_record_attempt() returns trigger language plpgsql security definer set search_path='' as $$
begin
  delete from public.personal_record_attempts where activity_id=new.id;
  if new.sport not in ('running','cycling') or new.moving_sec<=0 or new.disposition<>'counted' or new.provenance='demo'
    or coalesce(new.source_label,new.provider::text)='history' or coalesce(new.compete_key,'') ~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)' then return new; end if;
  insert into public.personal_record_attempts(activity_id,user_id,activity_key,sport,distance_id,started_at,seconds,source,verified)
    select new.id,new.user_id,coalesce(new.compete_key,new.provider::text||'-'||new.external_id),new.sport,d.id,new.started_at,new.moving_sec,
      case when new.provenance='recorded' then coalesce(new.source_label,new.provider::text) else new.provenance end,
      new.verified and new.provenance='recorded'
    from (values('running','5k',5000::numeric),('running','10k',10000),('running','half',21097.5),('running','marathon',42195),
      ('cycling','50k',50000),('cycling','100k',100000),('cycling','150k',150000),('cycling','180k',180000)) d(sport,id,meters)
    where d.sport=new.sport and new.distance_m>=d.meters and new.distance_m<=d.meters*1.02;
  return new;
end; $$;
revoke all on function private.capture_record_attempt() from public,anon,authenticated;
create trigger capture_personal_record after insert or update of sport,started_at,distance_m,moving_sec,verified,provenance,disposition,source_label,compete_key on public.activities
  for each row execute function private.capture_record_attempt();
-- Backfill through the identical trigger; no activity values change.
update public.activities set distance_m=distance_m where sport in ('running','cycling') and distance_m>=5000 and moving_sec>0;
