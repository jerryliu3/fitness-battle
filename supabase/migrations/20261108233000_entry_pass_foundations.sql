-- ---------------------------------------------------------------------------
-- Entry Pass & In-App Purchase Foundations
--
-- 1. Sequential athlete numbering (1..10,000 for founding lifetime passes).
-- 2. Athlete entitlements store (lifetime, monthly $0.99, annual $9.99, lifetime $49).
-- 3. Automatic founding pass allocation trigger for the first 10,000 profiles.
-- 4. Option A competition rule: 1 sport is free; multi-sport & sleep requires an Entry Pass.
-- ---------------------------------------------------------------------------

-- 1. Sequential athlete counter
create sequence if not exists public.athlete_signup_seq start 1;

alter table public.profiles
  add column if not exists athlete_number bigint unique default nextval('public.athlete_signup_seq');

-- Deterministically backfill existing profiles ordered by created_at
with ordered as (
  select id, row_number() over (order by created_at asc, id asc) as rn
  from public.profiles
)
update public.profiles p
set athlete_number = o.rn
from ordered o
where p.id = o.id and p.athlete_number is distinct from o.rn;

-- Fast-forward sequence past the highest existing athlete_number
select setval(
  'public.athlete_signup_seq',
  greatest(1, coalesce((select max(athlete_number) from public.profiles), 0) + 1),
  false
);

-- 2. Entitlements table
create table if not exists public.athlete_entitlements (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tier text not null check (tier in ('founder_lifetime', 'monthly_pass', 'annual_pass', 'lifetime_pass', 'complimentary')),
  status text not null check (status in ('active', 'past_due', 'canceled', 'expired', 'trialing')),
  provider text not null check (provider in ('early_adopter_grant', 'apple', 'google', 'stripe', 'admin')),
  product_id text,
  original_transaction_id text,
  latest_transaction_id text,
  current_period_start timestamptz not null default now(),
  expires_at timestamptz, -- null represents lifetime access
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists athlete_entitlements_status_idx
  on public.athlete_entitlements (status, expires_at);

alter table public.athlete_entitlements enable row level security;

drop policy if exists athlete_entitlements_select_own on public.athlete_entitlements;
create policy athlete_entitlements_select_own on public.athlete_entitlements
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on table public.athlete_entitlements from public, anon, authenticated;
grant select on table public.athlete_entitlements to authenticated;
grant all on table public.athlete_entitlements to service_role;

-- 3. Helper function: has_active_entry_pass
create or replace function public.has_active_entry_pass(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.athlete_entitlements
    where user_id = p_user_id
      and status = 'active'
      and (expires_at is null or expires_at > statement_timestamp())
  );
$$;

revoke all on function public.has_active_entry_pass(uuid) from public, anon;
grant execute on function public.has_active_entry_pass(uuid) to authenticated, service_role;

-- 4. Backfill founding lifetime pass for first 10,000 athletes
insert into public.athlete_entitlements (
  user_id,
  tier,
  status,
  provider,
  expires_at
)
select
  id,
  'founder_lifetime',
  'active',
  'early_adopter_grant',
  null
from public.profiles
where athlete_number <= 10000
on conflict (user_id) do nothing;

-- 5. Trigger: grant early adopter lifetime pass on new profile creation
create or replace function private.grant_early_adopter_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.athlete_number is not null and new.athlete_number <= 10000 then
    insert into public.athlete_entitlements (
      user_id,
      tier,
      status,
      provider,
      expires_at
    ) values (
      new.id,
      'founder_lifetime',
      'active',
      'early_adopter_grant',
      null
    ) on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_grant_early_adopter on public.profiles;
create trigger trigger_grant_early_adopter
  after insert on public.profiles
  for each row execute function private.grant_early_adopter_entitlement();

-- 6. Enforce Option A in save_compete_account (1 sport free, multi-sport requires active pass)
create or replace function public.save_compete_account(p_state jsonb,p_activities jsonb,p_readiness jsonb,p_expected_updated_at timestamptz) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); old public.wave_enrollments; r jsonb; prior jsonb; metadata jsonb:='[]'; clean jsonb:='[]'; renewal_start timestamptz;
  start_at timestamptz; end_at timestamptz; registered timestamptz; fid uuid; f public.week_fields; crew uuid;
  committed timestamptz; lock_key text; old_sleep public.health_ratings; at_time timestamptz;
  v_distinct_sports integer; v_sleep_opted boolean; v_total_events integer;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));

  -- Option A check: multi-sport or sport+sleep requires an active Entry Pass
  select count(distinct value->>'sport') into v_distinct_sports
  from jsonb_array_elements(coalesce(p_state->'enrollments', '[]'::jsonb));

  select coalesce((value->>'optedIn')::boolean, false) into v_sleep_opted
  from jsonb_array_elements(coalesce(p_state->'healthRatings', '[]'::jsonb))
  where value->>'metric' = 'sleep';

  v_total_events := coalesce(v_distinct_sports, 0) + (case when coalesce(v_sleep_opted, false) then 1 else 0 end);

  if v_total_events > 1 and not public.has_active_entry_pass(uid) then
    raise exception 'entry_pass_required';
  end if;

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
  renewal_start:=(date_trunc('week',at_time at time zone 'America/New_York')+interval '6 hours') at time zone 'America/New_York';
  if old_sleep.opted_in and old_sleep.auto_enroll_next and private.wave_week_end(old_sleep.lock_period)<=renewal_start and renewal_start<=at_time
    and (not coalesce((prior->>'optedIn')::boolean,false) or (prior->>'lockPeriod')::timestamptz is distinct from renewal_start) then
    raise exception 'week_still_open';
  end if;
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
grant execute on function public.save_compete_account(jsonb,jsonb,jsonb,timestamptz) to authenticated, service_role;
