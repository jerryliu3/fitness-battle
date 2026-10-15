-- Normalize signed-in compete state out of compete_snapshots jsonb.
-- Battles/periods/standings remain a separate unused invite path — not the play SoT.
-- Per-viewer density matching stays: wave_enrollments.peer_ids / synthetic_ids are arrays.

-- ---------------------------------------------------------------------------
-- Phase 1 note: demoNow is stripped in the API layer (never account-durable).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Athlete prefs (durable non-rating prefs)
-- ---------------------------------------------------------------------------
create table if not exists public.athlete_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  freezes_left integer not null default 3 check (freezes_left >= 0),
  calibrated boolean not null default false,
  onboarding_completed boolean not null default false,
  lesson_done_on date,
  training_goal_distance text check (
    training_goal_distance is null
    or training_goal_distance in ('5k', '10k', 'half', 'marathon')
  ),
  training_goal_deadline date,
  focus jsonb,
  updated_at timestamptz not null default now()
);

alter table public.athlete_prefs enable row level security;

create policy athlete_prefs_own on public.athlete_prefs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Sport ratings
-- ---------------------------------------------------------------------------
create table if not exists public.sport_ratings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  sport text not null check (sport in ('running', 'cycling', 'walking', 'strength')),
  verified_elo numeric not null default 1000,
  open_elo numeric not null default 1000,
  opted_in boolean not null default false,
  lock_verified numeric not null default 1000,
  lock_open numeric not null default 1000,
  lock_period timestamptz not null,
  primary key (user_id, sport)
);

alter table public.sport_ratings enable row level security;

create policy sport_ratings_own on public.sport_ratings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Period results (settled weeks) + acknowledge flag for week reveal
-- ---------------------------------------------------------------------------
create table if not exists public.period_results (
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_start timestamptz not null,
  sport text not null check (sport in ('running', 'cycling', 'walking', 'strength')),
  track text not null check (track in ('open', 'verified')),
  period_end timestamptz not null,
  place integer not null check (place >= 1),
  field_size integer not null check (field_size >= 1),
  effort numeric not null default 0,
  distance_m numeric not null default 0,
  moving_sec numeric not null default 0,
  elo_before numeric not null,
  elo_after numeric not null,
  frozen boolean not null default false,
  settled_at timestamptz not null,
  acknowledged_at timestamptz,
  primary key (user_id, period_start, sport, track)
);

create index if not exists period_results_user_pending_idx
  on public.period_results (user_id)
  where acknowledged_at is null;

alter table public.period_results enable row level security;

create policy period_results_own on public.period_results
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table if not exists public.period_freezes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_start timestamptz not null,
  primary key (user_id, period_start)
);

alter table public.period_freezes enable row level security;

create policy period_freezes_own on public.period_freezes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Wave enrollments (per-viewer seating)
-- ---------------------------------------------------------------------------
create table if not exists public.wave_enrollments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  sport text not null check (sport in ('running', 'cycling', 'walking', 'strength')),
  wave_start timestamptz not null,
  week_end timestamptz not null,
  capacity integer not null default 8 check (capacity between 2 and 16),
  peer_ids text[] not null default '{}',
  synthetic_ids text[] not null default '{}',
  auto_enroll_next boolean not null default true,
  crew_id uuid references public.crews (id) on delete set null,
  primary key (user_id, sport, wave_start),
  constraint wave_enrollments_bounds check (week_end > wave_start)
);

create index if not exists wave_enrollments_user_open_idx
  on public.wave_enrollments (user_id, sport);

alter table public.wave_enrollments enable row level security;

create policy wave_enrollments_own on public.wave_enrollments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Sleep nights + health ratings / results
-- ---------------------------------------------------------------------------
create table if not exists public.sleep_nights (
  user_id uuid not null references public.profiles (id) on delete cascade,
  id text not null,
  day date not null,
  score numeric not null check (score >= 0 and score <= 100),
  duration_min numeric not null default 0,
  efficiency numeric,
  deep_min numeric,
  rem_min numeric,
  light_min numeric,
  awake_min numeric,
  source text not null,
  verified boolean not null default false,
  primary key (user_id, id)
);

alter table public.sleep_nights enable row level security;

create policy sleep_nights_own on public.sleep_nights
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table if not exists public.health_ratings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  metric text not null check (metric in ('sleep')),
  elo numeric not null default 1000,
  opted_in boolean not null default false,
  lock_elo numeric not null default 1000,
  lock_period timestamptz not null,
  auto_enroll_next boolean not null default true,
  primary key (user_id, metric)
);

alter table public.health_ratings enable row level security;

create policy health_ratings_own on public.health_ratings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table if not exists public.health_period_results (
  user_id uuid not null references public.profiles (id) on delete cascade,
  id text not null,
  metric text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  place integer not null,
  field_size integer not null,
  score numeric not null,
  elo_before numeric not null,
  elo_after numeric not null,
  settled_at timestamptz not null,
  primary key (user_id, id)
);

alter table public.health_period_results enable row level security;

create policy health_period_results_own on public.health_period_results
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Practice duels
-- ---------------------------------------------------------------------------
create table if not exists public.duels (
  user_id uuid not null references public.profiles (id) on delete cascade,
  id text not null,
  sport text not null,
  period_start timestamptz not null,
  rival_id text not null,
  rival_name text not null,
  rival_elo numeric not null,
  source text not null check (source in ('auto', 'invite')),
  primary key (user_id, id)
);

alter table public.duels enable row level security;

create policy duels_own on public.duels
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Enrich public.activities for compete SoT (phase 3)
-- Non-cloud sources (history/manual) use provider=mock + source_label.
-- ---------------------------------------------------------------------------
alter table public.activities
  add column if not exists sport text
    check (sport is null or sport in ('running', 'cycling', 'walking', 'strength')),
  add column if not exists distance_m numeric,
  add column if not exists verified boolean not null default false,
  add column if not exists provenance text not null default 'recorded'
    check (provenance in ('recorded', 'imported', 'manual', 'demo')),
  add column if not exists disposition text not null default 'counted'
    check (disposition in ('counted', 'pending', 'excluded')),
  add column if not exists disposition_reason text,
  add column if not exists compete_key text,
  add column if not exists source_label text;

-- Backfill compete_key from provider + external_id when missing.
update public.activities
set compete_key = provider::text || '-' || external_id
where compete_key is null;

update public.activities
set source_label = provider::text
where source_label is null;

alter table public.activities
  alter column compete_key set not null;

create unique index if not exists activities_user_compete_key_uidx
  on public.activities (user_id, compete_key);

create index if not exists activities_user_started_compete_idx
  on public.activities (user_id, started_at desc);

-- Authenticated athletes manage their own compete activity rows.
-- Insert was removed earlier for service-role-only sync; restore for dual-write.
drop policy if exists activities_own_insert on public.activities;
drop policy if exists activities_own_update on public.activities;
drop policy if exists activities_own_delete on public.activities;

create policy activities_own_insert on public.activities
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy activities_own_update on public.activities
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy activities_own_delete on public.activities
  for delete to authenticated
  using (user_id = (select auth.uid()));
-- ---------------------------------------------------------------------------
-- share_crew_week: read from enriched activities, not snapshot jsonb
-- ---------------------------------------------------------------------------
create or replace function public.share_crew_week(p_crew_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  crew_sport text;
  week_start timestamptz;
  week_end timestamptz;
  saved integer := 0;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;
  if not private.is_active_crew_member(p_crew_id) then
    raise exception 'not_a_member';
  end if;
  select sport into crew_sport from public.crews where id = p_crew_id;
  if crew_sport is null then
    raise exception 'crew_not_found';
  end if;

  week_start := (date_trunc('week', (statement_timestamp() at time zone 'utc')) at time zone 'utc');
  -- date_trunc('week') is Monday in ISO when timezone is UTC on modern Postgres.
  week_end := week_start + interval '7 days';

  with incoming as (
    select
      a.compete_key as id,
      a.started_at,
      coalesce(a.sport, crew_sport) as sport,
      coalesce(a.distance_m, case when a.sport in ('running', 'cycling', 'walking') then a.metric_value else 0 end, 0) as distance_m,
      coalesce(a.moving_sec, 0) as moving_sec,
      coalesce(a.provenance, 'recorded') as provenance
    from public.activities a
    where a.user_id = uid
      and coalesce(a.sport, crew_sport) = crew_sport
      and a.disposition = 'counted'
      and a.provenance <> 'demo'
      and coalesce(a.source_label, a.provider::text) <> 'history'
      and a.started_at >= week_start
      and a.started_at < week_end
  ),
  upserted as (
    insert into public.crew_entries (
      crew_id, user_id, activity_id, started_at, sport, distance_m, moving_sec, disposition, provenance
    )
    select p_crew_id, uid, id, started_at, sport, distance_m, moving_sec, 'counted', provenance
    from incoming
    on conflict (crew_id, user_id, activity_id) do update
      set started_at = excluded.started_at,
          sport = excluded.sport,
          distance_m = excluded.distance_m,
          moving_sec = excluded.moving_sec,
          disposition = 'counted',
          provenance = excluded.provenance
    returning 1
  ),
  retired as (
    update public.crew_entries entry
    set disposition = 'excluded'
    where entry.crew_id = p_crew_id
      and entry.user_id = uid
      and entry.started_at >= week_start
      and entry.started_at < week_end
      and not exists (
        select 1 from incoming where incoming.id = entry.activity_id
      )
    returning 1
  )
  select
    coalesce((select count(*) from upserted), 0)::integer
  into saved;

  return saved;
end;
$$;

revoke all on function public.share_crew_week(uuid) from public, anon;
grant execute on function public.share_crew_week(uuid) to authenticated;
