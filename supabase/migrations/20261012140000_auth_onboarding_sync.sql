-- Auth/onboarding profile fields, private fitness tokens, sync state,
-- create_battle RPC, period roll + late-joiner standings, join-only memberships,
-- and activity → standings recompute.

-- ---------------------------------------------------------------------------
-- Profiles: preferences + one-time onboarding / backfill markers
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists city text not null default '',
  add column if not exists primary_sport text not null default 'running'
    check (primary_sport in ('running', 'cycling', 'walking', 'strength')),
  add column if not exists timezone text not null default 'UTC',
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists backfill_completed_at timestamptz,
  add column if not exists backfill_level text
    check (backfill_level is null or backfill_level in ('light', 'steady', 'heavy'));

comment on column public.profiles.backfill_completed_at is
  'Set once when the 90-day history calibration finishes. Cannot be cleared by the client.';

-- ---------------------------------------------------------------------------
-- Private token store (never exposed to authenticated clients)
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.fitness_tokens (
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider public.fitness_provider not null,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  athlete_external_id text,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

revoke all on table private.fitness_tokens from public, anon, authenticated;

-- Drop client-readable token columns if present (additive safety).
alter table public.fitness_connections
  drop column if exists access_token,
  drop column if exists refresh_token;

alter table public.fitness_connections
  add column if not exists last_sync_at timestamptz,
  add column if not exists last_activity_at timestamptz,
  add column if not exists last_error text not null default '';

create table if not exists public.fitness_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider public.fitness_provider not null,
  kind text not null check (kind in ('backfill', 'incremental', 'recent')),
  status text not null check (status in ('running', 'succeeded', 'failed')),
  since_at timestamptz,
  until_at timestamptz,
  activity_count integer not null default 0 check (activity_count >= 0),
  error_summary text not null default '',
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists fitness_sync_runs_user_idx
  on public.fitness_sync_runs (user_id, started_at desc);

alter table public.fitness_sync_runs enable row level security;

create policy fitness_sync_runs_own on public.fitness_sync_runs
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Strength unit: session seconds (align with compete effort model)
-- ---------------------------------------------------------------------------
update public.categories
set unit = 'seconds',
    description = 'Session duration from strength workouts.'
where slug = 'strength' and unit = 'reps';

-- ---------------------------------------------------------------------------
-- Membership inserts must go through join_battle_by_code (capacity / status)
-- ---------------------------------------------------------------------------
drop policy if exists memberships_insert on public.battle_memberships;

-- ---------------------------------------------------------------------------
-- create_battle: owner membership + first current period + standings seed
-- ---------------------------------------------------------------------------
create or replace function public.create_battle(
  p_name text,
  p_mode public.battle_mode,
  p_category_id uuid,
  p_period_kind public.period_kind default 'weekly',
  p_invite_code text default null,
  p_custom_starts_at timestamptz default null,
  p_custom_ends_at timestamptz default null
)
returns public.battles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_battle public.battles;
  v_code text;
  v_start timestamptz;
  v_end timestamptz;
  v_period public.periods;
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  if p_name is null or char_length(trim(p_name)) < 1 or char_length(p_name) > 80 then
    raise exception using errcode = '22023', message = 'invalid_battle_name';
  end if;

  if not exists (select 1 from public.categories c where c.id = p_category_id) then
    raise exception using errcode = '22023', message = 'category_not_found';
  end if;

  v_code := coalesce(
    nullif(upper(trim(p_invite_code)), ''),
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  );

  insert into public.battles (
    name, mode, category_id, period_kind, custom_starts_at, custom_ends_at,
    status, invite_code, created_by
  )
  values (
    trim(p_name),
    p_mode,
    p_category_id,
    p_period_kind,
    p_custom_starts_at,
    p_custom_ends_at,
    'open',
    v_code,
    v_uid
  )
  returning * into v_battle;

  insert into public.battle_memberships (battle_id, user_id, role)
  values (v_battle.id, v_uid, 'owner');

  if p_period_kind = 'daily' then
    v_start := date_trunc('day', timezone('utc', now()));
    v_end := v_start + interval '1 day';
  elsif p_period_kind = 'monthly' then
    v_start := date_trunc('month', timezone('utc', now()));
    v_end := v_start + interval '1 month';
  elsif p_period_kind = 'custom' then
    v_start := p_custom_starts_at;
    v_end := p_custom_ends_at;
  else
    v_start := date_trunc('week', timezone('utc', now()));
    v_end := v_start + interval '7 days';
  end if;

  insert into public.periods (battle_id, kind, starts_at, ends_at, is_current)
  values (v_battle.id, p_period_kind, v_start, v_end, true)
  returning * into v_period;

  insert into public.standings (period_id, user_id, score)
  values (v_period.id, v_uid, 0);

  return v_battle;
end;
$$;

revoke all on function public.create_battle(text, public.battle_mode, uuid, public.period_kind, text, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.create_battle(text, public.battle_mode, uuid, public.period_kind, text, timestamptz, timestamptz)
  to authenticated;

-- ---------------------------------------------------------------------------
-- join_battle_by_code: also seed standings for the current period
-- ---------------------------------------------------------------------------
create or replace function public.join_battle_by_code(p_invite_code text)
returns public.battles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_battle public.battles;
  v_member_count integer;
  v_period public.periods;
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  select * into v_battle
  from public.battles b
  where upper(b.invite_code) = upper(p_invite_code)
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'battle_not_found';
  end if;

  if v_battle.status in ('completed', 'cancelled') then
    raise exception using errcode = '22023', message = 'battle_closed';
  end if;

  select count(*)::integer into v_member_count
  from public.battle_memberships m
  where m.battle_id = v_battle.id;

  if v_battle.mode = 'one_v_one' and v_member_count >= 2
     and not exists (
       select 1 from public.battle_memberships m
       where m.battle_id = v_battle.id and m.user_id = v_uid
     ) then
    raise exception using errcode = '22023', message = 'one_v_one_full';
  end if;

  insert into public.battle_memberships (battle_id, user_id, role)
  values (
    v_battle.id,
    v_uid,
    case when v_battle.created_by = v_uid then 'owner'::public.membership_role else 'member'::public.membership_role end
  )
  on conflict do nothing;

  select * into v_period
  from public.periods p
  where p.battle_id = v_battle.id and p.is_current
  limit 1;

  if found then
    insert into public.standings (period_id, user_id, score)
    values (v_period.id, v_uid, 0)
    on conflict do nothing;
  end if;

  if v_battle.mode = 'one_v_one' and v_member_count + 1 >= 2 and v_battle.status = 'open' then
    update public.battles set status = 'active' where id = v_battle.id
    returning * into v_battle;
  elsif v_battle.status = 'open' and v_battle.mode = 'group' then
    update public.battles set status = 'active' where id = v_battle.id
    returning * into v_battle;
  end if;

  return v_battle;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_battle_standings: roll expired current period, seed late joiners
-- ---------------------------------------------------------------------------
create or replace function public.get_battle_standings(p_battle_id uuid)
returns table (
  period_id uuid,
  user_id uuid,
  display_name text,
  score numeric,
  rank integer,
  is_viewer boolean,
  starts_at timestamptz,
  ends_at timestamptz,
  period_kind public.period_kind
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_battle public.battles;
  v_period public.periods;
  v_start timestamptz;
  v_end timestamptz;
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  if not exists (
    select 1 from public.battle_memberships m
    where m.battle_id = p_battle_id and m.user_id = v_uid
  ) then
    raise exception using errcode = '42501', message = 'battle_join_required';
  end if;

  select * into v_battle from public.battles where id = p_battle_id;
  if not found then
    raise exception using errcode = '22023', message = 'battle_not_found';
  end if;

  select * into v_period
  from public.periods p
  where p.battle_id = p_battle_id and p.is_current
  limit 1;

  if not found then
    if v_battle.period_kind = 'daily' then
      v_start := date_trunc('day', timezone('utc', now()));
      v_end := v_start + interval '1 day';
    elsif v_battle.period_kind = 'monthly' then
      v_start := date_trunc('month', timezone('utc', now()));
      v_end := v_start + interval '1 month';
    elsif v_battle.period_kind = 'custom' then
      v_start := v_battle.custom_starts_at;
      v_end := v_battle.custom_ends_at;
    else
      v_start := date_trunc('week', timezone('utc', now()));
      v_end := v_start + interval '7 days';
    end if;

    insert into public.periods (battle_id, kind, starts_at, ends_at, is_current)
    values (p_battle_id, v_battle.period_kind, v_start, v_end, true)
    returning * into v_period;
  elsif v_period.ends_at <= timezone('utc', now()) and v_battle.period_kind <> 'custom' then
    -- Roll an expired current period forward (weekly/daily/monthly only).
    update public.periods set is_current = false where id = v_period.id;

    if v_battle.period_kind = 'daily' then
      v_start := date_trunc('day', timezone('utc', now()));
      v_end := v_start + interval '1 day';
    elsif v_battle.period_kind = 'monthly' then
      v_start := date_trunc('month', timezone('utc', now()));
      v_end := v_start + interval '1 month';
    else
      v_start := date_trunc('week', timezone('utc', now()));
      v_end := v_start + interval '7 days';
    end if;

    insert into public.periods (battle_id, kind, starts_at, ends_at, is_current)
    values (p_battle_id, v_battle.period_kind, v_start, v_end, true)
    returning * into v_period;

    insert into public.standings (period_id, user_id, score)
    select v_period.id, m.user_id, 0
    from public.battle_memberships m
    where m.battle_id = p_battle_id
    on conflict do nothing;
  end if;

  -- Late joiners: ensure every member has a standings row for the current period.
  insert into public.standings (period_id, user_id, score)
  select v_period.id, m.user_id, 0
  from public.battle_memberships m
  where m.battle_id = p_battle_id
  on conflict do nothing;

  return query
  select
    s.period_id,
    s.user_id,
    coalesce(pr.display_name, 'Athlete') as display_name,
    s.score,
    dense_rank() over (order by s.score desc, s.updated_at asc, s.user_id asc)::integer as rank,
    (s.user_id = v_uid) as is_viewer,
    v_period.starts_at,
    v_period.ends_at,
    v_period.kind
  from public.standings s
  join public.profiles pr on pr.id = s.user_id
  where s.period_id = v_period.id
  order by rank asc, s.user_id asc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Recompute period standings from synced activities (category unit = metric)
-- ---------------------------------------------------------------------------
create or replace function public.recompute_battle_standings(p_battle_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_battle public.battles;
  v_period public.periods;
  v_category public.categories;
  v_updated integer := 0;
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  if not exists (
    select 1 from public.battle_memberships m
    where m.battle_id = p_battle_id and m.user_id = v_uid
  ) then
    raise exception using errcode = '42501', message = 'battle_join_required';
  end if;

  select * into v_battle from public.battles where id = p_battle_id;
  if not found then
    raise exception using errcode = '22023', message = 'battle_not_found';
  end if;

  select * into v_category from public.categories where id = v_battle.category_id;
  select * into v_period from public.periods
  where battle_id = p_battle_id and is_current
  limit 1;

  if not found then
    perform public.get_battle_standings(p_battle_id);
    select * into v_period from public.periods
    where battle_id = p_battle_id and is_current
    limit 1;
  end if;

  update public.standings s
  set
    score = coalesce((
      select sum(a.metric_value)
      from public.activities a
      where a.user_id = s.user_id
        and a.category_id = v_category.id
        and a.started_at >= v_period.starts_at
        and a.started_at < v_period.ends_at
    ), 0),
    updated_at = now()
  where s.period_id = v_period.id;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.recompute_battle_standings(uuid) from public, anon;
grant execute on function public.recompute_battle_standings(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Onboarding: complete preferences (one-shot backfill marker is separate)
-- ---------------------------------------------------------------------------
create or replace function public.complete_onboarding(
  p_display_name text,
  p_city text,
  p_primary_sport text,
  p_timezone text default 'UTC'
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  if p_primary_sport not in ('running', 'cycling', 'walking', 'strength') then
    raise exception using errcode = '22023', message = 'invalid_primary_sport';
  end if;

  update public.profiles
  set
    display_name = left(trim(coalesce(p_display_name, display_name)), 80),
    city = left(trim(coalesce(p_city, '')), 80),
    primary_sport = p_primary_sport,
    timezone = coalesce(nullif(trim(p_timezone), ''), 'UTC'),
    onboarding_completed_at = coalesce(onboarding_completed_at, now()),
    updated_at = now()
  where id = v_uid
  returning * into v_profile;

  if not found then
    raise exception using errcode = '22023', message = 'profile_not_found';
  end if;

  return v_profile;
end;
$$;

revoke all on function public.complete_onboarding(text, text, text, text) from public, anon;
grant execute on function public.complete_onboarding(text, text, text, text) to authenticated;

create or replace function public.mark_backfill_complete(p_level text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  if p_level not in ('light', 'steady', 'heavy') then
    raise exception using errcode = '22023', message = 'invalid_backfill_level';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception using errcode = '22023', message = 'profile_not_found';
  end if;

  if v_profile.backfill_completed_at is not null then
    raise exception using errcode = '22023', message = 'backfill_already_completed';
  end if;

  update public.profiles
  set
    backfill_completed_at = now(),
    backfill_level = p_level,
    updated_at = now()
  where id = v_uid
  returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public.mark_backfill_complete(text) from public, anon;
grant execute on function public.mark_backfill_complete(text) to authenticated;
