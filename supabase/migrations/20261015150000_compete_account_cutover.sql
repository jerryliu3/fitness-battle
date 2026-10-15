-- Compete account cutover: signed-in play no longer depends on compete_snapshots jsonb.
-- Dual-written collections stay in their tables; leftovers get first-class rows or prefs columns.

alter table public.athlete_prefs
  add column if not exists clock_period_start timestamptz,
  add column if not exists focus_family text
    check (focus_family is null or focus_family in ('sport', 'health')),
  add column if not exists focus_id text;

create table if not exists public.sleep_nights (
  user_id uuid not null references public.profiles (id) on delete cascade,
  night_id text not null,
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
  primary key (user_id, night_id)
);

create index if not exists sleep_nights_user_day_idx
  on public.sleep_nights (user_id, day desc);

alter table public.sleep_nights enable row level security;
drop policy if exists sleep_nights_own on public.sleep_nights;
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
drop policy if exists health_ratings_own on public.health_ratings;
create policy health_ratings_own on public.health_ratings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table if not exists public.health_period_results (
  user_id uuid not null references public.profiles (id) on delete cascade,
  result_id text not null,
  metric text not null check (metric in ('sleep')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  place integer not null check (place >= 1),
  field_size integer not null check (field_size >= 1),
  score numeric not null default 0,
  elo_before numeric not null,
  elo_after numeric not null,
  settled_at timestamptz not null,
  primary key (user_id, result_id)
);

create index if not exists health_period_results_user_period_idx
  on public.health_period_results (user_id, period_start desc);

alter table public.health_period_results enable row level security;
drop policy if exists health_period_results_own on public.health_period_results;
create policy health_period_results_own on public.health_period_results
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table if not exists public.compete_duels (
  user_id uuid not null references public.profiles (id) on delete cascade,
  duel_id text not null,
  sport text not null check (sport in ('running', 'cycling', 'walking', 'strength')),
  period_start timestamptz not null,
  rival_id text not null,
  rival_name text not null,
  rival_elo numeric not null,
  source text not null check (source in ('auto', 'invite')),
  primary key (user_id, duel_id)
);

alter table public.compete_duels enable row level security;
drop policy if exists compete_duels_own on public.compete_duels;
create policy compete_duels_own on public.compete_duels
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Compete readiness uses the existing ingest table; allow the owner to write.
drop policy if exists readiness_marks_own on public.readiness_marks;
create policy readiness_marks_own on public.readiness_marks
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
