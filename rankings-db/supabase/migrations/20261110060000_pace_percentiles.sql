-- Migration: Percentiles throughout race results, athlete reports, and edition/distance analytics.
-- Additive only: preserves existing records, views, and functions.

-- Drop legacy overloads to avoid ambiguous function call resolution and clear parameter defaults
drop function if exists public.rankings_page_scoped(text, text, integer, text, integer, date, date, bigint);
drop function if exists public.rankings_page_scoped(text, text, integer, text, integer, date, date, bigint, text);

-- 1. Full-field reads with strict-slower percentile calculation, unrounded percentile filtering, and qualifying cutoffs.
-- The canonical 9-argument implementation has no default on p_percentile to prevent signature ambiguity with the 8-argument compatibility wrapper.
create or replace function public.rankings_page_scoped(
  p_distance text,
  p_sex text,
  p_year integer,
  p_query text,
  p_page integer,
  p_from date,
  p_until date,
  p_edition_id bigint,
  p_percentile text
) returns jsonb
language sql stable security definer set search_path = '' as $$
  with cohort as materialized (
    select
      p.event_edition_id,
      p.id,
      p.athlete_name,
      p.sex,
      p.distance_slug,
      p.rank_time_ms,
      p.rank_clock,
      p.age_years,
      p.result_date,
      ed.name as event_name,
      ed.edition_year,
      s.attribution,
      p.source_url,
      sr.normalized_bib as bib,
      rank() over (order by p.rank_time_ms) as place,
      count(*) over () as cohort_total,
      ((count(*) over () - count(*) over (order by p.rank_time_ms range between unbounded preceding and current row))::numeric / greatest(1, count(*) over ()) * 100.0) as percentile
    from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    join public.event_editions ed on ed.id = p.event_edition_id
    where p.eligible and not p.unpublished and s.display_allowed
      and ed.publication_state in ('published', 'frozen')
      and p.distance_slug = p_distance
      and (p_sex = 'all' or p.sex = p_sex)
      and (p_edition_id is null or p.event_edition_id = p_edition_id)
      and (p_year is null or ed.edition_year = p_year)
      and (p_from is null or p.result_date >= p_from)
      and (p_until is null or p.result_date < p_until)
  ), stats as (
    select
      count(*) as total,
      count(distinct event_edition_id) as edition_count,
      min(rank_time_ms) as fastest_ms,
      max(rank_time_ms) as slowest_ms,
      percentile_cont(0.50) within group (order by rank_time_ms) as median_ms,
      -- Derived from the exact qualifying population: slowest time among runners who meet each percentile filter
      max(rank_time_ms) filter (where percentile >= 99.0) as p99_ms,
      max(rank_time_ms) filter (where percentile >= 95.0) as p95_ms,
      max(rank_time_ms) filter (where percentile >= 90.0) as p90_ms,
      max(rank_time_ms) filter (where percentile >= 75.0) as p75_ms,
      floor(min(rank_time_ms) / 1000.0) * 1000 as minimum_ms,
      greatest(1000, ceil((max(rank_time_ms) - floor(min(rank_time_ms) / 1000.0) * 1000) / 40000.0) * 1000) as width_ms,
      count(*) filter (where rank_clock = 'chip') as chip_count,
      count(*) filter (where rank_clock = 'gun') as official_count
    from cohort
  ), bins as (
    select floor((c.rank_time_ms - s.minimum_ms) / s.width_ms)::integer as bucket, count(*) as count
    from cohort c cross join stats s where s.total > 0 group by 1
  ), matches as materialized (
    select * from cohort
    where (
      btrim(coalesce(p_query, '')) = ''
      or position(lower(left(btrim(p_query), 100)) in lower(athlete_name)) > 0
      or bib = upper(btrim(p_query))
    ) and (
      p_percentile is null or p_percentile = 'all'
      or (p_percentile = 'top1' and percentile >= 99.0)
      or (p_percentile = 'top5' and percentile >= 95.0)
      or (p_percentile = 'top10' and percentile >= 90.0)
      or (p_percentile = 'top25' and percentile >= 75.0)
      or (p_percentile = 'top50' and percentile >= 50.0)
    )
  ), totals as (
    select count(*) as total, greatest(1, least(greatest(1, coalesce(p_page, 1)),
      ceil(count(*) / 50.0)::integer)) as page from matches
  ), rows as (
    select
      id,
      athlete_name,
      sex,
      distance_slug,
      rank_time_ms,
      rank_clock,
      age_years,
      result_date,
      event_name,
      edition_year,
      attribution,
      source_url,
      bib,
      place,
      percentile,
      cohort_total
    from matches order by rank_time_ms, id
    limit 50 offset (select (page - 1)::bigint * 50 from totals)
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(r) order by r.rank_time_ms, r.id) from rows r), '[]'::jsonb),
    'total', t.total,
    'cohortTotal', (select count(*) from cohort),
    'analytics', (select case when s.total > 0 then jsonb_build_object(
      'total', s.total,
      'editionCount', s.edition_count,
      'fastestMs', s.fastest_ms,
      'slowestMs', s.slowest_ms,
      'medianMs', s.median_ms,
      'minimumMs', s.minimum_ms,
      'binWidthMs', s.width_ms,
      'chipCount', s.chip_count,
      'officialCount', s.official_count,
      'benchmarks', jsonb_build_object(
        'top1Ms', s.p99_ms,
        'top5Ms', s.p95_ms,
        'top10Ms', s.p90_ms,
        'top25Ms', s.p75_ms,
        'medianMs', s.median_ms
      ),
      'bins', coalesce((select jsonb_agg(to_jsonb(b) order by b.bucket) from bins b), '[]'::jsonb)
    ) else null end from stats s),
    'page', t.page,
    'pageSize', 50,
    'windowFrom', p_from,
    'windowUntil', p_until
  )
  from totals t;
$$;
revoke all on function public.rankings_page_scoped(text, text, integer, text, integer, date, date, bigint, text) from public;
grant execute on function public.rankings_page_scoped(text, text, integer, text, integer, date, date, bigint, text) to anon, authenticated, service_role;

-- Compatibility 8-argument wrapper with defaults that delegates to the canonical 9-argument function
create or replace function public.rankings_page_scoped(
  p_distance text,
  p_sex text default 'female',
  p_year integer default null,
  p_query text default '',
  p_page integer default 1,
  p_from date default null,
  p_until date default null,
  p_edition_id bigint default null
) returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.rankings_page_scoped(
    p_distance, p_sex, p_year, p_query, p_page, p_from, p_until, p_edition_id, 'all'
  );
$$;
revoke all on function public.rankings_page_scoped(text, text, integer, text, integer, date, date, bigint) from public;
grant execute on function public.rankings_page_scoped(text, text, integer, text, integer, date, date, bigint) to anon, authenticated, service_role;

-- 2. Result detail with strict-slower percentile and exact qualifying benchmark cutoffs
create or replace function public.rankings_result(p_id bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  with selected as (
    select
      p.id, p.athlete_name, p.sex, p.distance_slug, p.rank_time_ms, p.rank_clock,
      p.chip_time_ms, p.gun_time_ms, p.age_years, p.result_date, p.source_url,
      p.event_edition_id, p.updated_at, ed.name as event_name, ed.edition_year,
      s.attribution, s.reuse_notes, sr.normalized_bib as bib
    from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    join public.event_editions ed on ed.id = p.event_edition_id
    where p.id = p_id and p.eligible and not p.unpublished and s.display_allowed
      and ed.publication_state in ('published', 'frozen')
  ), field as materialized (
    select
      p.id, p.athlete_name, p.rank_time_ms,
      ((count(*) over () - count(*) over (order by p.rank_time_ms range between unbounded preceding and current row))::numeric / greatest(1, count(*) over ()) * 100.0) as percentile
    from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    join public.event_editions ed on ed.id = p.event_edition_id
    join selected r on r.event_edition_id = p.event_edition_id
      and r.distance_slug = p.distance_slug and r.sex = p.sex
    where p.eligible and not p.unpublished and s.display_allowed
      and ed.publication_state in ('published', 'frozen')
  ), stats as (
    select
      count(*) as total,
      count(*) filter (where f.rank_time_ms < r.rank_time_ms) + 1 as place,
      count(*) filter (where f.rank_time_ms > r.rank_time_ms) as slower,
      ((count(*) filter (where f.rank_time_ms > r.rank_time_ms))::numeric / greatest(1, count(*)) * 100.0) as percentile,
      percentile_cont(0.50) within group (order by f.rank_time_ms) as median_ms,
      max(f.rank_time_ms) filter (where f.percentile >= 99.0) as p99_ms,
      max(f.rank_time_ms) filter (where f.percentile >= 95.0) as p95_ms,
      max(f.rank_time_ms) filter (where f.percentile >= 90.0) as p90_ms,
      max(f.rank_time_ms) filter (where f.percentile >= 75.0) as p75_ms,
      min(f.rank_time_ms) as minimum_ms,
      greatest(1000, ceil((max(f.rank_time_ms) - min(f.rank_time_ms)) / 40.0)::bigint) as width_ms
    from field f cross join selected r
  ), bins as (
    select floor((f.rank_time_ms - s.minimum_ms) / s.width_ms)::integer as bucket, count(*) as count
    from field f cross join stats s group by 1
  ), neighbors as (
    (select f.id, f.athlete_name, f.rank_time_ms from field f cross join selected r
      where (f.rank_time_ms, f.id) < (r.rank_time_ms, r.id)
      order by f.rank_time_ms desc, f.id desc limit 3)
    union all
    (select f.id, f.athlete_name, f.rank_time_ms from field f cross join selected r
      where (f.rank_time_ms, f.id) > (r.rank_time_ms, r.id)
      order by f.rank_time_ms asc, f.id asc limit 3)
  )
  select jsonb_build_object(
    'result', to_jsonb(r),
    'total', s.total,
    'place', s.place,
    'slower', s.slower,
    'percentile', s.percentile,
    'medianMs', s.median_ms,
    'benchmarks', jsonb_build_object(
      'top1Ms', s.p99_ms,
      'top5Ms', s.p95_ms,
      'top10Ms', s.p90_ms,
      'top25Ms', s.p75_ms,
      'medianMs', s.median_ms
    ),
    'minimumMs', s.minimum_ms,
    'binWidthMs', s.width_ms,
    'bins', coalesce((select jsonb_agg(to_jsonb(b) order by b.bucket) from bins b), '[]'::jsonb),
    'neighbors', coalesce((select jsonb_agg(to_jsonb(n) order by n.rank_time_ms, n.id) from neighbors n), '[]'::jsonb)
  )
  from selected r cross join stats s;
$$;
revoke all on function public.rankings_result(bigint) from public;
grant execute on function public.rankings_result(bigint) to anon, authenticated, service_role;

-- 3. Athlete career history with per-race percentile and career best percentile.
create or replace function public.rankings_athlete_page(p_athlete_id bigint, p_page integer default 1)
returns jsonb language sql stable security definer set search_path = '' as $$
  with results as materialized (
    select
      p.id,
      p.athlete_name,
      p.distance_slug,
      p.rank_clock,
      p.rank_time_ms,
      p.result_date,
      ed.name as event_name,
      ed.edition_year,
      (select count(*) from public.performances f
       where f.event_edition_id = p.event_edition_id and f.distance_slug = p.distance_slug and f.sex = p.sex
         and f.eligible and not f.unpublished) as field_total,
      (select count(*) filter (where f.rank_time_ms < p.rank_time_ms) + 1 from public.performances f
       where f.event_edition_id = p.event_edition_id and f.distance_slug = p.distance_slug and f.sex = p.sex
         and f.eligible and not f.unpublished) as field_place,
      ((select count(*) filter (where f.rank_time_ms > p.rank_time_ms) from public.performances f
       where f.event_edition_id = p.event_edition_id and f.distance_slug = p.distance_slug and f.sex = p.sex
         and f.eligible and not f.unpublished)::numeric / greatest(1, (select count(*) from public.performances f
       where f.event_edition_id = p.event_edition_id and f.distance_slug = p.distance_slug and f.sex = p.sex
         and f.eligible and not f.unpublished)) * 100.0) as percentile
    from public.rankings_athlete_results l
    join public.performances p on p.id = l.performance_id and p.updated_at = l.performance_updated_at
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    join public.event_editions ed on ed.id = p.event_edition_id
    where l.athlete_id = p_athlete_id and p.eligible and not p.unpublished and s.display_allowed
      and ed.publication_state in ('published', 'frozen')
  ), totals as (
    select count(*) as total, greatest(1, least(greatest(1, coalesce(p_page, 1)), ceil(count(*) / 50.0)::integer)) as page from results
  ), rows as (
    select * from results order by result_date desc nulls last, edition_year desc, id desc limit 50 offset (select (page - 1)::bigint * 50 from totals)
  ), bests as (
    select distance_slug, rank_clock, min(rank_time_ms) as time_ms, max(percentile) as best_percentile, count(*) as total from results group by distance_slug, rank_clock
  ) select jsonb_build_object(
    'id', a.id,
    'name', a.display_name,
    'total', t.total,
    'page', t.page,
    'pageSize', 50,
    'rows', coalesce((select jsonb_agg(to_jsonb(r) order by r.result_date desc nulls last, r.edition_year desc, r.id desc) from rows r), '[]'::jsonb),
    'bests', coalesce((select jsonb_agg(to_jsonb(b) order by b.distance_slug, b.rank_clock) from bests b), '[]'::jsonb)
  )
  from public.rankings_athletes a cross join totals t where a.id = p_athlete_id and t.total > 0;
$$;
revoke all on function public.rankings_athlete_page(bigint, integer) from public;
grant execute on function public.rankings_athlete_page(bigint, integer) to anon, authenticated, service_role;
