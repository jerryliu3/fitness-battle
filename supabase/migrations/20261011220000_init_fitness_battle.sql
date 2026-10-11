-- Fitness Battle core schema: profiles, categories, battles, memberships,
-- extendable periods, standings, fitness connections + synced activities.

create extension if not exists "pgcrypto";

create type public.battle_mode as enum ('group', 'one_v_one');
create type public.period_kind as enum ('daily', 'weekly', 'monthly', 'custom');
create type public.battle_status as enum ('open', 'active', 'completed', 'cancelled');
create type public.membership_role as enum ('owner', 'member');
create type public.fitness_provider as enum ('strava', 'mock');
create type public.metric_unit as enum ('meters', 'seconds', 'reps');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_]+$'),
  name text not null,
  unit public.metric_unit not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table public.battles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  mode public.battle_mode not null,
  category_id uuid not null references public.categories (id),
  period_kind public.period_kind not null default 'weekly',
  -- Optional bounds for period_kind = custom; ignored otherwise.
  custom_starts_at timestamptz,
  custom_ends_at timestamptz,
  status public.battle_status not null default 'open',
  invite_code text not null unique check (char_length(invite_code) between 4 and 16),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint battles_custom_period_check check (
    period_kind <> 'custom'
    or (
      custom_starts_at is not null
      and custom_ends_at is not null
      and custom_ends_at > custom_starts_at
    )
  ),
  constraint battles_one_v_one_open_or_active check (
    mode <> 'one_v_one' or status in ('open', 'active', 'completed', 'cancelled')
  )
);

create table public.battle_memberships (
  battle_id uuid not null references public.battles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.membership_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (battle_id, user_id)
);

create table public.periods (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles (id) on delete cascade,
  kind public.period_kind not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  constraint periods_bounds_check check (ends_at > starts_at)
);

create unique index periods_one_current_per_battle
  on public.periods (battle_id)
  where is_current;

create index periods_battle_window_idx
  on public.periods (battle_id, starts_at, ends_at);

create table public.standings (
  period_id uuid not null references public.periods (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  score numeric not null default 0 check (score >= 0),
  rank integer,
  updated_at timestamptz not null default now(),
  primary key (period_id, user_id)
);

create table public.fitness_connections (
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider public.fitness_provider not null,
  status text not null check (status in ('connected', 'disconnected', 'stub')),
  access_token text,
  refresh_token text,
  connected_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider public.fitness_provider not null,
  external_id text not null,
  category_id uuid not null references public.categories (id),
  started_at timestamptz not null,
  metric_value numeric not null check (metric_value >= 0),
  raw_name text not null default '',
  created_at timestamptz not null default now(),
  unique (provider, external_id)
);

create index activities_user_started_idx on public.activities (user_id, started_at desc);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Athlete')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.battles enable row level security;
alter table public.battle_memberships enable row level security;
alter table public.periods enable row level security;
alter table public.standings enable row level security;
alter table public.fitness_connections enable row level security;
alter table public.activities enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy categories_read on public.categories
  for select to authenticated using (true);
create policy categories_read_anon on public.categories
  for select to anon using (true);

create policy battles_select_member on public.battles
  for select to authenticated using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.battle_memberships m
      where m.battle_id = battles.id and m.user_id = (select auth.uid())
    )
    or status = 'open'
  );
create policy battles_insert on public.battles
  for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy battles_update_owner on public.battles
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy memberships_select on public.battle_memberships
  for select to authenticated using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.battle_memberships m
      where m.battle_id = battle_memberships.battle_id
        and m.user_id = (select auth.uid())
    )
  );
create policy memberships_insert on public.battle_memberships
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy periods_select on public.periods
  for select to authenticated using (
    exists (
      select 1 from public.battle_memberships m
      where m.battle_id = periods.battle_id and m.user_id = (select auth.uid())
    )
  );

create policy standings_select on public.standings
  for select to authenticated using (
    exists (
      select 1
      from public.periods p
      join public.battle_memberships m on m.battle_id = p.battle_id
      where p.id = standings.period_id and m.user_id = (select auth.uid())
    )
  );

create policy fitness_connections_own on public.fitness_connections
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy activities_own_select on public.activities
  for select to authenticated using (user_id = (select auth.uid()));
create policy activities_own_insert on public.activities
  for insert to authenticated with check (user_id = (select auth.uid()));

-- Join helper: one tap join by invite code (group or 1v1 with capacity check)
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

  if v_battle.mode = 'one_v_one' and v_member_count >= 2 then
    raise exception using errcode = '22023', message = 'one_v_one_full';
  end if;

  insert into public.battle_memberships (battle_id, user_id, role)
  values (
    v_battle.id,
    v_uid,
    case when v_battle.created_by = v_uid then 'owner'::public.membership_role else 'member'::public.membership_role end
  )
  on conflict do nothing;

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

revoke all on function public.join_battle_by_code(text) from public, anon;
grant execute on function public.join_battle_by_code(text) to authenticated;

-- Current-period standings for a battle (creates period row if missing)
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
      -- weekly default: Monday 00:00 UTC
      v_start := date_trunc('week', timezone('utc', now())) + interval '0 days';
      -- date_trunc('week') is Monday in Postgres
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

revoke all on function public.get_battle_standings(uuid) from public, anon;
grant execute on function public.get_battle_standings(uuid) to authenticated;
