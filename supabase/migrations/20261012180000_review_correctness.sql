-- Review fixes: UTC period bounds, join status, profile markers,
-- server-only activity writes, and private token RPCs.

-- ---------------------------------------------------------------------------
-- UTC period bounds. date_trunc on a bare timestamp is interpreted in the
-- session time zone when stored as timestamptz; pin the conversion to UTC.
-- ---------------------------------------------------------------------------
create or replace function public.period_bounds_utc(
  p_kind public.period_kind,
  p_anchor timestamptz,
  p_custom_starts timestamptz default null,
  p_custom_ends timestamptz default null
)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select
    case p_kind
      when 'daily' then (date_trunc('day', p_anchor at time zone 'utc') at time zone 'utc')
      when 'monthly' then (date_trunc('month', p_anchor at time zone 'utc') at time zone 'utc')
      when 'custom' then p_custom_starts
      else (date_trunc('week', p_anchor at time zone 'utc') at time zone 'utc')
    end,
    case p_kind
      when 'daily' then (date_trunc('day', p_anchor at time zone 'utc') at time zone 'utc') + interval '1 day'
      when 'monthly' then (date_trunc('month', p_anchor at time zone 'utc') at time zone 'utc') + interval '1 month'
      when 'custom' then p_custom_ends
      else (date_trunc('week', p_anchor at time zone 'utc') at time zone 'utc') + interval '7 days'
    end;
$$;

revoke all on function public.period_bounds_utc(public.period_kind, timestamptz, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.period_bounds_utc(public.period_kind, timestamptz, timestamptz, timestamptz)
  to current_user;

create or replace function public.ensure_current_period(p_battle_id uuid)
returns public.periods
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_battle public.battles;
  v_period public.periods;
  v_start timestamptz;
  v_end timestamptz;
begin
  select * into v_battle
  from public.battles
  where id = p_battle_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'battle_not_found';
  end if;

  select * into v_period
  from public.periods
  where battle_id = p_battle_id and is_current
  limit 1;

  if found and (v_period.ends_at > now() or v_battle.period_kind = 'custom') then
    return v_period;
  end if;

  if found then
    update public.periods set is_current = false where id = v_period.id;
  end if;

  select b.starts_at, b.ends_at
  into v_start, v_end
  from public.period_bounds_utc(
    v_battle.period_kind,
    now(),
    v_battle.custom_starts_at,
    v_battle.custom_ends_at
  ) as b;

  if v_start is null or v_end is null or v_end <= v_start then
    raise exception using errcode = '22023', message = 'invalid_period_bounds';
  end if;

  insert into public.periods (battle_id, kind, starts_at, ends_at, is_current)
  values (p_battle_id, v_battle.period_kind, v_start, v_end, true)
  returning * into v_period;

  insert into public.standings (period_id, user_id, score)
  select v_period.id, m.user_id, 0
  from public.battle_memberships m
  where m.battle_id = p_battle_id
  on conflict do nothing;

  return v_period;
end;
$$;

revoke all on function public.ensure_current_period(uuid) from public, anon, authenticated;
grant execute on function public.ensure_current_period(uuid) to current_user;

-- ---------------------------------------------------------------------------
-- create_battle uses the same UTC bounds as later rolls
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

  if p_period_kind = 'custom'
     and (p_custom_starts_at is null or p_custom_ends_at is null or p_custom_ends_at <= p_custom_starts_at) then
    raise exception using errcode = '22023', message = 'invalid_custom_period';
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

  select b.starts_at, b.ends_at
  into v_start, v_end
  from public.period_bounds_utc(p_period_kind, now(), p_custom_starts_at, p_custom_ends_at) as b;

  insert into public.periods (battle_id, kind, starts_at, ends_at, is_current)
  values (v_battle.id, p_period_kind, v_start, v_end, true)
  returning * into v_period;

  insert into public.standings (period_id, user_id, score)
  values (v_period.id, v_uid, 0);

  return v_battle;
end;
$$;

-- ---------------------------------------------------------------------------
-- Re-joining must not pretend a new member arrived (1v1 would flip to active)
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
  v_inserted integer := 0;
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
  get diagnostics v_inserted = row_count;

  select * into v_period
  from public.periods p
  where p.battle_id = v_battle.id and p.is_current
  limit 1;

  if found then
    insert into public.standings (period_id, user_id, score)
    values (v_period.id, v_uid, 0)
    on conflict do nothing;
  end if;

  if v_inserted = 1 and v_battle.status = 'open' then
    if v_battle.mode = 'group'
       or (v_battle.mode = 'one_v_one' and v_member_count + 1 >= 2) then
      update public.battles set status = 'active' where id = v_battle.id
      returning * into v_battle;
    end if;
  end if;

  return v_battle;
end;
$$;

-- ---------------------------------------------------------------------------
-- Standings read rolls an expired period, then seeds late joiners
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
  v_period public.periods;
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

  v_period := public.ensure_current_period(p_battle_id);

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

create or replace function public.recompute_battle_standings_internal(p_battle_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_battle public.battles;
  v_period public.periods;
  v_category public.categories;
  v_updated integer := 0;
begin
  select * into v_battle from public.battles where id = p_battle_id;
  if not found then
    raise exception using errcode = '22023', message = 'battle_not_found';
  end if;

  v_period := public.ensure_current_period(p_battle_id);
  select * into v_category from public.categories where id = v_battle.category_id;

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

revoke all on function public.recompute_battle_standings_internal(uuid)
  from public, anon, authenticated;
grant execute on function public.recompute_battle_standings_internal(uuid) to current_user;

create or replace function public.recompute_battle_standings(p_battle_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
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

  return public.recompute_battle_standings_internal(p_battle_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Onboarding markers are not client-writable. Activity rows are server-written.
-- ---------------------------------------------------------------------------
revoke update on table public.profiles from authenticated, anon;
grant update (
  display_name,
  avatar_url,
  city,
  primary_sport,
  timezone,
  updated_at
) on table public.profiles to authenticated;

drop policy if exists fitness_connections_own on public.fitness_connections;
create policy fitness_connections_select on public.fitness_connections
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists activities_own_insert on public.activities;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := left(coalesce(
    nullif(btrim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Athlete'
  ), 80);

  insert into public.profiles (id, display_name)
  values (new.id, v_name);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Token RPCs. PostgREST only exposes public; private.fitness_tokens stays hidden.
-- ---------------------------------------------------------------------------
create or replace function public.store_fitness_tokens(
  p_user_id uuid,
  p_provider public.fitness_provider,
  p_access_token text,
  p_refresh_token text,
  p_expires_at timestamptz,
  p_athlete_external_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;

  insert into private.fitness_tokens (
    user_id, provider, access_token, refresh_token, expires_at, athlete_external_id, updated_at
  )
  values (
    p_user_id, p_provider, p_access_token, p_refresh_token, p_expires_at, p_athlete_external_id, now()
  )
  on conflict (user_id, provider) do update
  set
    access_token = excluded.access_token,
    refresh_token = excluded.refresh_token,
    expires_at = excluded.expires_at,
    athlete_external_id = excluded.athlete_external_id,
    updated_at = now();
end;
$$;

create or replace function public.read_fitness_tokens(
  p_user_id uuid,
  p_provider public.fitness_provider
)
returns table (
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  athlete_external_id text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;

  return query
  select t.access_token, t.refresh_token, t.expires_at, t.athlete_external_id
  from private.fitness_tokens t
  where t.user_id = p_user_id and t.provider = p_provider;
end;
$$;

create or replace function public.delete_fitness_tokens(
  p_user_id uuid,
  p_provider public.fitness_provider
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;

  delete from private.fitness_tokens t
  where t.user_id = p_user_id and t.provider = p_provider;
end;
$$;

revoke all on function public.store_fitness_tokens(uuid, public.fitness_provider, text, text, timestamptz, text)
  from public, anon, authenticated;
revoke all on function public.read_fitness_tokens(uuid, public.fitness_provider)
  from public, anon, authenticated;
revoke all on function public.delete_fitness_tokens(uuid, public.fitness_provider)
  from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.recompute_battle_standings_internal(uuid) to service_role;
    grant execute on function public.store_fitness_tokens(uuid, public.fitness_provider, text, text, timestamptz, text) to service_role;
    grant execute on function public.read_fitness_tokens(uuid, public.fitness_provider) to service_role;
    grant execute on function public.delete_fitness_tokens(uuid, public.fitness_provider) to service_role;
    grant execute on function public.ensure_current_period(uuid) to service_role;
    grant execute on function public.period_bounds_utc(public.period_kind, timestamptz, timestamptz, timestamptz) to service_role;
  end if;
end $$;
