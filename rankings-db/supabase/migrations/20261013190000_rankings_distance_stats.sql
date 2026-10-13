-- Fast public counts for /rankings. The function-backed leaderboard view times
-- out under PostgREST exact-count when the ledger is large.

create table if not exists public.rankings_distance_stats (
  distance_slug text primary key,
  result_count bigint not null check (result_count >= 0),
  refreshed_at timestamptz not null default now()
);

create or replace function public.refresh_rankings_distance_stats()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  truncate public.rankings_distance_stats;
  insert into public.rankings_distance_stats (distance_slug, result_count, refreshed_at)
  select p.distance_slug, count(*)::bigint, now()
  from public.performances p
  join public.source_records sr on sr.id = p.source_record_id
  join public.sources s on s.id = sr.source_id
  where p.eligible
    and not p.unpublished
    and s.display_allowed
  group by p.distance_slug;
end;
$$;

revoke all on function public.refresh_rankings_distance_stats() from public;
grant execute on function public.refresh_rankings_distance_stats() to service_role;

alter table public.rankings_distance_stats enable row level security;
revoke all on table public.rankings_distance_stats from anon, authenticated;
grant select on table public.rankings_distance_stats to anon, authenticated, service_role;
grant select, insert, update, delete on table public.rankings_distance_stats to service_role;

drop policy if exists rankings_distance_stats_select on public.rankings_distance_stats;
create policy rankings_distance_stats_select on public.rankings_distance_stats
  for select to anon, authenticated
  using (true);

create or replace function public.rankings_distance_counts()
returns table (distance_slug text, result_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select distance_slug, result_count from public.rankings_distance_stats;
$$;

revoke all on function public.rankings_distance_counts() from public;
grant execute on function public.rankings_distance_counts() to anon, authenticated, service_role;

-- Indexed top-N for distance boards (avoids scanning the full function view).
create or replace function public.rankings_top(
  p_distance text,
  p_sex text,
  p_limit integer default 200
)
returns table (
  id bigint,
  athlete_name text,
  sex text,
  distance_slug text,
  rank_time_ms bigint,
  rank_clock text,
  age_years integer,
  result_date date,
  event_name text,
  edition_year integer,
  attribution text,
  source_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.athlete_name,
    p.sex,
    p.distance_slug,
    p.rank_time_ms,
    p.rank_clock,
    p.age_years,
    p.result_date,
    e.name as event_name,
    ed.edition_year,
    s.attribution,
    p.source_url
  from public.performances p
  join public.source_records sr on sr.id = p.source_record_id
  join public.sources s on s.id = sr.source_id
  join public.event_editions ed on ed.id = p.event_edition_id
  join public.events e on e.id = ed.event_id
  where p.eligible
    and not p.unpublished
    and s.display_allowed
    and p.distance_slug = p_distance
    and p.sex = p_sex
  order by p.rank_time_ms asc, p.id asc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

revoke all on function public.rankings_top(text, text, integer) from public;
grant execute on function public.rankings_top(text, text, integer) to anon, authenticated, service_role;

select public.refresh_rankings_distance_stats();
