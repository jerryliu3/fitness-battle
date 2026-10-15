-- Compete normalize P4: per-viewer wave enrollments (array seating).

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

create index if not exists wave_enrollments_user_sport_idx
  on public.wave_enrollments (user_id, sport);

alter table public.wave_enrollments enable row level security;

drop policy if exists wave_enrollments_own on public.wave_enrollments;
create policy wave_enrollments_own on public.wave_enrollments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
