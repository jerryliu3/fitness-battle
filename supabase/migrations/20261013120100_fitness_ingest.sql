-- Activity detail, per-user external ids, readiness marks, and Garmin user lookup.

alter table public.activities
  add column if not exists moving_sec numeric,
  add column if not exists avg_hr numeric;

alter table public.activities
  drop constraint if exists activities_provider_external_id_key;

alter table public.activities
  drop constraint if exists activities_user_provider_external_key;

alter table public.activities
  add constraint activities_user_provider_external_key
  unique (user_id, provider, external_id);

create table if not exists public.readiness_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider public.fitness_provider not null,
  external_id text not null,
  day date not null,
  score numeric not null check (score >= 0 and score <= 100),
  created_at timestamptz not null default now(),
  unique (user_id, provider, external_id)
);

alter table public.readiness_marks enable row level security;

create policy readiness_marks_own on public.readiness_marks
  for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.user_id_for_fitness_athlete(
  p_provider public.fitness_provider,
  p_athlete_external_id text
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select t.user_id
  from private.fitness_tokens t
  where t.provider = p_provider
    and t.athlete_external_id = p_athlete_external_id
  limit 1;
$$;

create or replace function public.user_id_for_fitness_access_token(
  p_provider public.fitness_provider,
  p_access_token text
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select t.user_id
  from private.fitness_tokens t
  where t.provider = p_provider
    and t.access_token = p_access_token
  limit 1;
$$;

revoke all on function public.user_id_for_fitness_athlete(public.fitness_provider, text)
  from public, anon, authenticated;
revoke all on function public.user_id_for_fitness_access_token(public.fitness_provider, text)
  from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.user_id_for_fitness_athlete(public.fitness_provider, text) to service_role;
    grant execute on function public.user_id_for_fitness_access_token(public.fitness_provider, text) to service_role;
  end if;
end
$$;
