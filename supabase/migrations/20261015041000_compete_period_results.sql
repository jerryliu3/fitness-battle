-- Compete normalize P2: prefs, ratings, settled weeks with acknowledge flag.
-- Snapshot jsonb remains full; these tables are dual-written for signed-in accounts.

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
  updated_at timestamptz not null default now()
);

alter table public.athlete_prefs enable row level security;

drop policy if exists athlete_prefs_own on public.athlete_prefs;
create policy athlete_prefs_own on public.athlete_prefs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

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

drop policy if exists sport_ratings_own on public.sport_ratings;
create policy sport_ratings_own on public.sport_ratings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

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

drop policy if exists period_results_own on public.period_results;
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

drop policy if exists period_freezes_own on public.period_freezes;
create policy period_freezes_own on public.period_freezes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
