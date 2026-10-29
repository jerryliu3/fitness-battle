-- Daily registrations use the existing enrollment/field model. Queued entries have
-- no field; a wave is assigned atomically once its shared benchmark is reached.
alter table public.wave_enrollments
  add column registered_at timestamptz not null default statement_timestamp(),
  add column field_id uuid references public.week_fields(id) on delete set null;
alter table public.week_fields add column roster_locked_at timestamptz;
update public.wave_enrollments set registered_at=least(statement_timestamp(),wave_start);
update public.week_fields set roster_locked_at=statement_timestamp() where wave_start<=statement_timestamp();
update public.wave_enrollments e set field_id=(select f.id from public.week_fields f
  where e.sport=f.sport and e.wave_start=f.wave_start and e.week_end=f.week_end
    and e.user_id=any(f.member_ids) and e.crew_id is not distinct from f.crew_id
  order by f.updated_at desc,f.created_at desc,f.id limit 1);
create unique index wave_enrollments_user_sport_unique on public.wave_enrollments(user_id,sport);
drop index if exists public.wave_enrollments_user_sport_idx;
create index wave_enrollments_queue_idx on public.wave_enrollments(sport,wave_start,week_end);
create index wave_enrollments_field_idx on public.wave_enrollments(field_id) where field_id is not null;

create function private.next_daily_wave(p_now timestamptz) returns timestamptz
language sql immutable set search_path='' as $$
  select case when (p_now at time zone 'America/New_York')::time <= time '06:00'
    then ((p_now at time zone 'America/New_York')::date+time '06:00') at time zone 'America/New_York'
    else (((p_now at time zone 'America/New_York')::date+1)+time '06:00') at time zone 'America/New_York' end;
$$;
create function private.wave_week_end(p_start timestamptz) returns timestamptz
language sql immutable set search_path='' as $$
  select (date_trunc('week',p_start at time zone 'America/New_York')+interval '7 days') at time zone 'America/New_York';
$$;

-- Same FNV-1a bank as shared/synthetic-bank.ts. IDs and Elo are stable;
-- the database freezes the chosen IDs rather than allowing each reader to refill.
create function private.wave_hash(p_value text) returns bigint
language plpgsql immutable set search_path='' as $$
declare h bigint:=2166136261; i integer;
begin
  for i in 1..length(p_value) loop h:=((h # ascii(substr(p_value,i,1)))*16777619)%4294967296; end loop;
  return h;
end; $$;
create function private.wave_synthetics(p_sport text,p_elo numeric,p_count integer,p_seed text) returns text[]
language sql immutable set search_path='' as $$
  with names as (select name,ord::integer-1 as n from unnest(array[
    'Maya Chen','Leo Park','Ava Singh','Noah Brooks','Priya Shah','Eli Navarro','Hana Ito','Owen Blake',
    'Sofia Rossi','Jonah Adeyemi','Mina Cho','Chris Dalton','Lila Berg','Sam Okonkwo','Nora Feldman','Theo March',
    'Ivy Santos','Ben Alvarez','Ruth Keller','Omar Farouk','Jane Cho','Felix Berg','Ada Nwosu','Kai Lind',
    'Riley Quinn','Jordan Vale','Casey Monroe','Drew Patel','Skye Romero','Quinn Harper','Reese Okada','Alex Rivera'
  ]) with ordinality as x(name,ord)), bank as (
    select 'synth:'||p_sport||':'||n as id,
      round((array[500,850,1100,1350])[n%4+1]+(private.wave_hash('synth-elo:'||p_sport||':'||name)%10000)::numeric/10000*
        ((array[849,1099,1349,2400])[n%4+1]-(array[500,850,1100,1350])[n%4+1])) as elo from names
  ) select coalesce(array(select id from bank order by abs(elo-p_elo),md5(p_seed||id),id limit greatest(0,p_count)),'{}'::text[]);
$$;

-- Repair only live legacy filler counts once; future reads always use the
-- stored IDs, and archived field identity/results remain untouched.
update public.week_fields f set synthetic_ids=private.wave_synthetics(f.sport,
  coalesce((select percentile_disc(0.5) within group(order by r.open_elo) from public.sport_ratings r where r.sport=f.sport and r.user_id=any(f.member_ids)),1000),
  greatest(0,f.capacity-cardinality(f.member_ids)),f.id::text)
  where f.week_end>statement_timestamp() and cardinality(f.synthetic_ids)<>greatest(0,f.capacity-cardinality(f.member_ids));
update public.wave_enrollments set peer_ids='{}',synthetic_ids='{}',field_id=null where wave_start>statement_timestamp();

-- Older clients could save an enrollment without ever loading its field.
-- Give those existing started entries their own immutable legacy field instead
-- of appending them to another athlete's already-running roster.
do $$
declare e public.wave_enrollments; f uuid; syn text[]; elo numeric;
begin
  for e in select * from public.wave_enrollments where wave_start<=statement_timestamp() and field_id is null loop
    select case when e.sport in ('running','cycling') then verified_elo else open_elo end into elo
      from public.sport_ratings where user_id=e.user_id and sport=e.sport;
    f:=gen_random_uuid();
    syn:=case when cardinality(e.synthetic_ids)=e.capacity-1 then e.synthetic_ids
      else private.wave_synthetics(e.sport,coalesce(elo,1000),e.capacity-1,f::text) end;
    insert into public.week_fields(id,sport,wave_start,week_end,capacity,member_ids,synthetic_ids,roster_locked_at)
      values(f,e.sport,e.wave_start,e.week_end,e.capacity,array[e.user_id],syn,statement_timestamp());
    update public.wave_enrollments set field_id=f,crew_id=null,peer_ids='{}',synthetic_ids=syn
      where user_id=e.user_id and sport=e.sport and wave_start=e.wave_start;
  end loop;
end; $$;

-- Caller serializes saves with this same sport/benchmark lock. All eligible
-- registrations are considered, including automatic Monday renewals whose
-- owners have not opened the application since the previous week.
create function private.finalize_week_wave(p_sport text,p_start timestamptz,p_end timestamptz) returns void
language plpgsql security definer set search_path='' as $$
declare pool jsonb; head jsonb; roster uuid[]; assigned uuid[]:='{}'; crew uuid; cap integer; f uuid;
  target_elo numeric; label text; syn text[];
begin
  if p_start>statement_timestamp() then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_sport||extract(epoch from p_start)::text,61028));
  -- Existing (including legacy/admin) fields are immutable once started.
  if exists(select 1 from public.week_fields where sport=p_sport and wave_start=p_start and week_end=p_end and roster_locked_at is not null) then return; end if;
  if exists(select 1 from public.week_fields where sport=p_sport and wave_start=p_start and week_end=p_end) then
    update public.week_fields set roster_locked_at=statement_timestamp() where sport=p_sport and wave_start=p_start and week_end=p_end;
    return;
  end if;
  with latest as (
    select distinct on (e.user_id) e.* from public.wave_enrollments e
    where e.sport=p_sport and e.wave_start<=p_start order by e.user_id,e.wave_start desc
  ), candidates as (
    select e.user_id,e.capacity,e.registered_at,
      case when e.crew_id is not null and exists(select 1 from public.crew_members m where m.crew_id=e.crew_id and m.user_id=e.user_id and m.status='active') then e.crew_id end as crew_id,
      case when p_sport in ('running','cycling') then case when r.lock_period=p_start then r.lock_verified else r.verified_elo end else case when r.lock_period=p_start then r.lock_open else r.open_elo end end as elo
    from latest e join public.sport_ratings r on r.user_id=e.user_id and r.sport=e.sport and r.opted_in
    where e.registered_at<=p_start and (
      (e.wave_start=p_start and e.week_end=p_end) or
      (e.week_end<=p_start and e.auto_enroll_next and p_start=(date_trunc('week',p_start at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York')
    )
  ) select coalesce(jsonb_agg(to_jsonb(c) order by c.crew_id nulls last,c.elo,c.registered_at,c.user_id),'[]') into pool from candidates c;
  while jsonb_array_length(pool)>0 loop
    head:=pool->0; crew:=(head->>'crew_id')::uuid; cap:=(head->>'capacity')::integer;
    select array_agg((x->>'user_id')::uuid order by x->>'user_id'),percentile_disc(0.5) within group(order by (x->>'elo')::numeric)
      into roster,target_elo from (
        select x from jsonb_array_elements(pool) x where (x->>'crew_id')::uuid is not distinct from crew and (x->>'capacity')::integer=cap
          and (crew is not null or abs((x->>'elo')::numeric-(head->>'elo')::numeric)<=400)
        order by exists(
          select 1 from public.weekly_field_choices c join public.weekly_field_choices rev
            on rev.field_id=c.field_id and rev.actor_id=c.recipient_id and rev.recipient_id=c.actor_id and rev.track=c.track and rev.repeat
          join public.week_fields source on source.id=c.field_id and source.sport=p_sport and source.week_end<=p_start
          where c.actor_id=(head->>'user_id')::uuid and c.recipient_id=(x->>'user_id')::uuid and c.repeat
            and c.expires_at>p_start and rev.expires_at>p_start and c.attempted_wave is null and rev.attempted_wave is null
        ) desc,abs((x->>'elo')::numeric-(head->>'elo')::numeric),x->>'user_id' limit cap
      ) picks;
    f:=gen_random_uuid(); syn:=private.wave_synthetics(p_sport,target_elo,cap-cardinality(roster),f::text);
    label:=coalesce((select name from public.crews where id=crew),'Open Field');
    insert into public.week_fields(id,sport,wave_start,week_end,capacity,crew_id,name,member_ids,synthetic_ids,roster_locked_at)
      values(f,p_sport,p_start,p_end,cap,crew,label,roster,syn,statement_timestamp());
    update public.wave_enrollments e set field_id=f,crew_id=crew,
      peer_ids=array(select id::text from unnest(roster) id where id<>e.user_id),synthetic_ids=syn
      where e.user_id=any(roster) and e.sport=p_sport and e.wave_start=p_start and e.week_end=p_end;
    assigned:=assigned||roster;
    select coalesce(jsonb_agg(x),'[]') into pool from jsonb_array_elements(pool) x where not (x->>'user_id')::uuid=any(roster);
  end loop;
  update public.weekly_field_choices c set attempted_wave=p_start
    where c.actor_id=any(assigned) and c.repeat and c.attempted_wave is null and c.expires_at>p_start
      and exists(select 1 from public.week_fields source where source.id=c.field_id and source.sport=p_sport and source.week_end<=p_start)
      and exists(select 1 from public.weekly_field_choices rev where rev.field_id=c.field_id and rev.actor_id=c.recipient_id
        and rev.recipient_id=c.actor_id and rev.track=c.track and rev.repeat and rev.expires_at>p_start);
end; $$;

create function public.resolve_week_field(p_sport text,p_wave_start timestamptz,p_week_end timestamptz) returns public.week_fields
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); f public.week_fields;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.wave_enrollments where user_id=uid and sport=p_sport and wave_start=p_wave_start and week_end=p_week_end)
    and not exists(select 1 from public.wave_enrollments where user_id=uid and sport=p_sport and auto_enroll_next and week_end<=p_wave_start
      and p_wave_start=(date_trunc('week',p_wave_start at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York'
      and p_week_end=private.wave_week_end(p_wave_start))
    and not exists(select 1 from public.week_fields where sport=p_sport and wave_start=p_wave_start and week_end=p_week_end and uid=any(member_ids)) then
    raise exception 'not_registered';
  end if;
  if p_wave_start>statement_timestamp() then return null; end if;
  perform private.finalize_week_wave(p_sport,p_wave_start,p_week_end);
  select field.* into f from public.week_fields field
    where field.sport=p_sport and field.wave_start=p_wave_start and field.week_end=p_week_end and uid=any(field.member_ids)
    order by exists(select 1 from public.wave_enrollments e where e.user_id=uid and e.sport=p_sport and e.field_id=field.id) desc,field.created_at desc,field.id limit 1;
  if f.id is null then raise exception 'field_not_assigned'; end if;
  return f;
end; $$;
revoke all on function public.resolve_week_field(text,timestamptz,timestamptz) from public,anon;
grant execute on function public.resolve_week_field(text,timestamptz,timestamptz) to authenticated;

-- Retain the old signature for older readers, but it can no longer invent a
-- registration, reveal a queued roster, or add someone to a running field.
create or replace function public.seat_athlete_week_field(p_sport text,p_wave_start timestamptz,p_week_end timestamptz,p_capacity integer default 8,p_crew_id uuid default null,p_crew_name text default null,p_synthetic_ids text[] default '{}') returns public.week_fields
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_capacity is null or p_capacity<2 or p_capacity>16 then raise exception 'invalid_capacity'; end if;
  return public.resolve_week_field(p_sport,p_wave_start,p_week_end);
end; $$;

-- Only account saves own registrations; clients cannot forge a field pointer or
-- bypass the start/cancellation checks by writing the table through PostgREST.
drop policy wave_enrollments_own on public.wave_enrollments;
create policy wave_enrollments_read_own on public.wave_enrollments for select to authenticated using(user_id=(select auth.uid()));
revoke insert,update,delete on public.wave_enrollments from authenticated,anon;
drop policy week_fields_select on public.week_fields;
create policy week_fields_select on public.week_fields for select to authenticated
  using(wave_start<=statement_timestamp() and (select auth.uid())=any(member_ids));

-- Preserve the existing versioned account transaction and milestone checks.
-- The wrapper validates and restores database-owned registration metadata across
-- the legacy transaction's delete/reinsert, so no second write path is added.
alter function public.save_compete_account(jsonb,jsonb,jsonb,timestamptz) rename to save_compete_account_before_daily_waves;
revoke all on function public.save_compete_account_before_daily_waves(jsonb,jsonb,jsonb,timestamptz) from public,anon,authenticated;
create function public.save_compete_account(p_state jsonb,p_activities jsonb,p_readiness jsonb,p_expected_updated_at timestamptz) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); old public.wave_enrollments; r jsonb; prior jsonb; metadata jsonb:='[]'; clean jsonb:='[]'; renewal_start timestamptz;
  start_at timestamptz; end_at timestamptz; registered timestamptz; fid uuid; f public.week_fields; crew uuid;
  committed timestamptz; lock_key text; old_sleep public.health_ratings; at_time timestamptz;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  -- Fixed ordering makes a multi-sport save serialize safely with finalization.
  for lock_key in select distinct k from (
    select sport||extract(epoch from wave_start)::text as k from public.wave_enrollments where user_id=uid
    union select sport||extract(epoch from private.next_daily_wave(week_end))::text from public.wave_enrollments where user_id=uid and auto_enroll_next
    union select sport||extract(epoch from ((date_trunc('week',clock_timestamp() at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York'))::text from public.wave_enrollments where user_id=uid and auto_enroll_next
    union select (e->>'sport')||extract(epoch from (e->>'waveStart')::timestamptz)::text from jsonb_array_elements(p_state->'enrollments') e
  ) locks order by k loop perform pg_advisory_xact_lock(hashtextextended(lock_key,61028)); end loop;
  at_time:=clock_timestamp();
  for old in select * from public.wave_enrollments where user_id=uid loop
    -- A stale device cannot cancel an automatic renewal after Monday's start
    -- merely because its previous enrollment has not yet been rolled forward.
    renewal_start:=(date_trunc('week',at_time at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York';
    if old.auto_enroll_next and old.week_end<=renewal_start and renewal_start<=at_time and not exists(
      select 1 from jsonb_array_elements(p_state->'enrollments') e where e->>'sport'=old.sport
        and (e->>'waveStart')::timestamptz=renewal_start and (e->>'weekEnd')::timestamptz=private.wave_week_end(renewal_start)
    ) then raise exception 'week_still_open'; end if;
    if old.wave_start<=at_time and old.week_end>at_time and not exists(
      select 1 from jsonb_array_elements(p_state->'enrollments') e where e->>'sport'=old.sport
        and (e->>'waveStart')::timestamptz=old.wave_start and (e->>'weekEnd')::timestamptz=old.week_end
        and nullif(e->>'crewId','')::uuid is not distinct from old.crew_id
    ) then raise exception 'week_still_open'; end if;
  end loop;
  for r in select value from jsonb_array_elements(p_state->'enrollments') loop
    start_at:=(r->>'waveStart')::timestamptz; end_at:=(r->>'weekEnd')::timestamptz;
    if (r->>'capacity')::integer not between 2 and 16 then raise check_violation using message='invalid_capacity'; end if;
    crew:=case when r->>'crewId' ~ '^[0-9a-fA-F-]{36}$' then (r->>'crewId')::uuid else null end;
    select * into old from public.wave_enrollments where user_id=uid and sport=r->>'sport' order by wave_start desc limit 1;
    if old.wave_start is distinct from start_at or old.week_end is distinct from end_at then
      if old.week_end<=at_time and old.auto_enroll_next then
        if start_at<>private.next_daily_wave(old.week_end) and start_at<>(date_trunc('week',at_time at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York' then
          raise exception 'invalid_renewal_window';
        end if;
      elsif start_at<>private.next_daily_wave(at_time) then raise exception 'registration_window_changed';
      end if;
      if end_at<>private.wave_week_end(start_at) then raise exception 'invalid_wave_bounds'; end if;
    end if;
    if crew is not null and not exists(select 1 from public.crew_members m join public.crews c on c.id=m.crew_id
      where m.crew_id=crew and m.user_id=uid and m.status='active' and c.sport=r->>'sport')
      and not exists(select 1 from public.week_fields where crew_id=crew and sport=r->>'sport' and wave_start=start_at and week_end=end_at and uid=any(member_ids) and roster_locked_at is not null)
      then raise exception 'not_a_crew_member'; end if;
    r:=r||jsonb_build_object('capacity',case when old.wave_start=start_at and old.week_end=end_at or old.auto_enroll_next and old.week_end<=at_time then old.capacity else 8 end);
    registered:=case when old.wave_start=start_at or old.week_end<=at_time and old.auto_enroll_next then old.registered_at else at_time end;
    select * into f from public.week_fields where sport=r->>'sport' and wave_start=start_at and week_end=end_at and uid=any(member_ids) and crew_id is not distinct from crew limit 1;
    fid:=f.id;
    metadata:=metadata||jsonb_build_array(jsonb_build_object('sport',r->>'sport','start',start_at,'registered',registered,'field',fid));
    clean:=clean||jsonb_build_array(r||jsonb_build_object('peerIds',coalesce((select jsonb_agg(id::text) from unnest(f.member_ids) id where id<>uid),'[]'::jsonb),'syntheticIds',coalesce(to_jsonb(f.synthetic_ids),'[]'::jsonb)));
  end loop;
  select * into old_sleep from public.health_ratings where user_id=uid and metric='sleep';
  select value into prior from jsonb_array_elements(p_state->'healthRatings') where value->>'metric'='sleep';
  if old_sleep.opted_in and old_sleep.lock_period<=at_time and private.wave_week_end(old_sleep.lock_period)>at_time
    and (coalesce((prior->>'optedIn')::boolean,false)=false or (prior->>'lockPeriod')::timestamptz<>old_sleep.lock_period) then raise exception 'week_still_open'; end if;
  if (prior->>'optedIn')::boolean and not coalesce(old_sleep.opted_in,false)
    and (prior->>'lockPeriod')::timestamptz<>private.next_daily_wave(at_time) then raise exception 'registration_window_changed'; end if;
  if (prior->>'optedIn')::boolean and old_sleep.opted_in and (prior->>'lockPeriod')::timestamptz<>old_sleep.lock_period then
    if private.wave_week_end(old_sleep.lock_period)>at_time then raise exception 'invalid_wave_bounds'; end if;
    if (prior->>'lockPeriod')::timestamptz<>private.next_daily_wave(private.wave_week_end(old_sleep.lock_period))
      and (prior->>'lockPeriod')::timestamptz<>(date_trunc('week',at_time at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York' then raise exception 'invalid_renewal_window'; end if;
  end if;
  committed:=public.save_compete_account_before_daily_waves(jsonb_set(p_state,'{enrollments}',clean),p_activities,p_readiness,p_expected_updated_at);
  update public.wave_enrollments e set registered_at=(m->>'registered')::timestamptz,field_id=(m->>'field')::uuid
    from jsonb_array_elements(metadata) m where e.user_id=uid and e.sport=m->>'sport' and e.wave_start=(m->>'start')::timestamptz;
  return committed;
end; $$;
revoke all on function public.save_compete_account(jsonb,jsonb,jsonb,timestamptz) from public,anon;
grant execute on function public.save_compete_account(jsonb,jsonb,jsonb,timestamptz) to authenticated;

-- Field participation remains authorized after a Crew departure: its frozen
-- roster, benchmark and counted totals are independent of current Crew membership.
create or replace function public.week_field_roster(p_field_id uuid)
returns table (
  user_id uuid,
  display_name text,
  open_elo numeric,
  distance_m numeric,
  moving_sec numeric,
  verified_elo numeric,
  verified_distance_m numeric,
  verified_moving_sec numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  field_rec public.week_fields;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;

  select * into field_rec from public.week_fields where id = p_field_id;
  if field_rec.id is null then
    raise exception 'field_not_found';
  end if;
  if not (uid = any(field_rec.member_ids)) then
    raise exception 'not_in_field';
  end if;
  if field_rec.wave_start>statement_timestamp() then raise exception 'wave_not_started'; end if;

  return query
  select
    p.id,
    coalesce(cm.display_name, p.display_name),
    coalesce(r.open_elo, 1000)::numeric,
    coalesce(sum(a.distance_m), 0)::numeric,
    coalesce(sum(a.moving_sec), 0)::numeric,
    coalesce(r.verified_elo, 1000)::numeric,
    coalesce(sum(a.distance_m) filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling', 'walking')), 0)::numeric,
    coalesce(sum(a.moving_sec) filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling', 'walking')), 0)::numeric
  from unnest(field_rec.member_ids) as m(id)
  join public.profiles p on p.id = m.id
  left join public.sport_ratings r
    on r.user_id = m.id and r.sport = field_rec.sport
  left join public.crew_members cm
    on cm.crew_id = field_rec.crew_id and cm.user_id = m.id
  left join lateral (
    select activity.distance_m, activity.moving_sec, activity.verified, activity.provenance
    from public.activities activity
    where activity.user_id = m.id
      and activity.disposition = 'counted'
      and activity.provenance <> 'demo'
      and coalesce(activity.source_label, activity.provider::text) <> 'history'
      and coalesce(activity.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
      and activity.sport = field_rec.sport
      and activity.started_at >= field_rec.wave_start
      and activity.started_at < field_rec.week_end
      and activity.started_at <= statement_timestamp()
  ) a on true
  group by p.id, cm.display_name, p.display_name, r.open_elo, r.verified_elo
  order by p.id;
end;
$$;

revoke all on function public.week_field_roster(uuid) from public, anon;
grant execute on function public.week_field_roster(uuid) to authenticated;


revoke all on function private.next_daily_wave(timestamptz),private.wave_week_end(timestamptz),private.wave_hash(text),private.wave_synthetics(text,numeric,integer,text),private.finalize_week_wave(text,timestamptz,timestamptz) from public,anon,authenticated;

-- A private Crew can disappear without deleting already-assigned competitions.
alter table public.week_fields drop constraint week_fields_crew_id_fkey;
alter table public.week_fields add constraint week_fields_crew_id_fkey foreign key(crew_id) references public.crews(id) on delete set null;
create function private.validate_wave_field_reference() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.field_id is not null and not exists(select 1 from public.week_fields f where f.id=new.field_id and f.sport=new.sport
    and f.wave_start=new.wave_start and f.week_end=new.week_end and (f.crew_id is not distinct from new.crew_id or new.crew_id is null and not exists(select 1 from public.crews where id=f.crew_id)) and new.user_id=any(f.member_ids)) then raise exception 'invalid_field_reference'; end if;
  return new;
end; $$;
revoke all on function private.validate_wave_field_reference() from public,anon,authenticated;
create trigger wave_field_reference before insert or update of field_id,sport,wave_start,week_end,crew_id on public.wave_enrollments
  for each row execute function private.validate_wave_field_reference();

-- Leaving a Crew can cancel its queued context, but cannot change a started field.
create or replace function public.leave_crew(p_crew_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  is_owner boolean;
  active_count integer;
  c_name text;
  leaver text;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  if not private.is_active_crew_member(p_crew_id) then
    raise exception 'not_a_member';
  end if;

  select name into c_name from public.crews where id = p_crew_id;
  select display_name into leaver from public.profiles where id = uid;

  delete from public.crew_members
  where crew_id = p_crew_id and user_id = uid;

  update public.wave_enrollments
  set crew_id = null
  where user_id = uid and crew_id = p_crew_id
    and (wave_start > statement_timestamp() or week_end <= statement_timestamp());

  update public.week_fields
  set member_ids = array_remove(member_ids, uid)
  where crew_id = p_crew_id and wave_start > statement_timestamp();

  select count(*) into active_count
  from public.crew_members
  where crew_id = p_crew_id and status = 'active';

  select (created_by = uid) into is_owner
  from public.crews
  where id = p_crew_id;

  if is_owner and active_count > 0 then
    update public.crews
    set created_by = (
      select user_id
      from public.crew_members
      where crew_id = p_crew_id and status = 'active'
      limit 1
    )
    where id = p_crew_id;
  elsif active_count = 0 then
    delete from public.crews where id = p_crew_id;
  end if;

  if active_count > 0 then
    insert into public.crew_notices (user_id, crew_id, kind, body)
    select created_by, id, 'member_left', coalesce(leaver, 'A member') || ' left ' || c_name || '.'
    from public.crews
    where id = p_crew_id;
  end if;

  return true;
end;
$$;

revoke all on function public.leave_crew(uuid) from public, anon;
grant execute on function public.leave_crew(uuid) to authenticated;

-- Replays use the same frozen membership, and cannot reveal queued fields.
create or replace function public.competition_replay(
  p_sport text, p_start timestamptz, p_end timestamptz, p_track text
) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  f public.week_fields;
  through_at timestamptz;
  roster jsonb;
  ledger jsonb;
begin
  if uid is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_sport is null or p_track is null or p_sport not in ('running','cycling','walking','strength')
     or p_track not in ('open','verified') or p_start is null or p_end is null
     or p_end <= p_start then raise exception 'invalid_replay'; end if;
  select * into f from public.week_fields
    where sport=p_sport and wave_start=p_start and week_end=p_end
      and uid=any(member_ids)
    order by created_at desc, id limit 1;
  if f.id is null then raise exception 'field_not_found' using errcode = '42501'; end if;
  if f.wave_start>statement_timestamp() then raise exception 'wave_not_started' using errcode='42501'; end if;
  through_at := least(statement_timestamp(), f.week_end);
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'name',coalesce(cm.display_name,p.display_name,'Athlete'), 'you',p.id=uid
  ) order by p.id),'[]'::jsonb) into roster
  from unnest(f.member_ids) m(id)
  join public.profiles p on p.id=m.id
  left join public.crew_members cm on cm.crew_id=f.crew_id and cm.user_id=m.id
;

  -- Same eligibility and half-open bounds as week_field_roster. Peer sensor
  -- values are not disclosed. GPS presentation uses distance, strength uses time.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',a.id,'athleteId',a.user_id,'at',a.started_at,
    'distanceM',coalesce(a.distance_m,0),'movingSec',coalesce(a.moving_sec,0),
    'avgHr',case when a.user_id=uid then a.avg_hr else null end
  ) order by a.started_at,a.user_id,a.id),'[]'::jsonb) into ledger
  from public.activities a
  where a.user_id=any(f.member_ids)
    and a.sport=f.sport and a.disposition='counted' and a.provenance<>'demo'
    and coalesce(a.source_label,a.provider::text)<>'history'
    and coalesce(a.compete_key,'') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
    and a.started_at>=f.wave_start and a.started_at<f.week_end and a.started_at<through_at
    and (p_track='open' or (a.verified and a.provenance='recorded' and f.sport in ('running','cycling','walking')));
  -- One JSON result avoids PostgREST's row limit truncating a busy week's ledger.
  return jsonb_build_object('sport',f.sport,'track',p_track,
    'periodStart',f.wave_start,'periodEnd',f.week_end,'through',through_at,
    'athletes',roster,'events',ledger,'syntheticIds',f.synthetic_ids,'scope','field');
end;
$$;
revoke all on function public.competition_replay(text,timestamptz,timestamptz,text) from public, anon;
grant execute on function public.competition_replay(text,timestamptz,timestamptz,text) to authenticated;
