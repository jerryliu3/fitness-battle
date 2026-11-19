-- Keep row selection and field analytics independent. Cache counts at the
-- exact finish time so ties and arbitrary date bounds retain their meaning.
create extension if not exists pg_trgm with schema extensions;

create index performances_public_name_search_idx
  on public.performances using gin (lower(athlete_name) extensions.gin_trgm_ops)
  where eligible and not unpublished;
create index source_records_bib_search_idx
  on public.source_records (normalized_bib) where normalized_bib is not null;
create index performances_public_distance_time_idx
  on public.performances (distance_slug, rank_time_ms, id)
  where eligible and not unpublished;

create index performances_public_edition_time_idx
  on public.performances (event_edition_id, distance_slug, sex, rank_time_ms, id)
  where eligible and not unpublished;

create view private.rankings_public_finishes as
select p.id, p.event_edition_id, p.athlete_name, p.sex, p.distance_slug,
       p.age_years, p.chip_time_ms, p.gun_time_ms, p.rank_time_ms, p.rank_clock,
       p.result_date, p.source_url, p.updated_at, ed.name as event_name, ed.edition_year,
       s.attribution, s.reuse_notes, sr.normalized_bib as bib
from public.performances p
join public.source_records sr on sr.id = p.source_record_id
join public.sources s on s.id = sr.source_id
join public.event_editions ed on ed.id = p.event_edition_id
where p.eligible and not p.unpublished and s.display_allowed
  and ed.publication_state in ('published', 'frozen');

create view private.rankings_live_time_counts as
select distance_slug, sex, event_edition_id, edition_year, result_date, rank_time_ms,
       count(*) as finishes, count(*) filter (where rank_clock = 'chip') as chips,
       count(*) filter (where rank_clock = 'gun') as guns
from private.rankings_public_finishes
group by distance_slug, sex, event_edition_id, edition_year, result_date, rank_time_ms;

create table private.rankings_time_counts
as select * from private.rankings_live_time_counts with no data;

create index rankings_time_counts_scope_idx
  on private.rankings_time_counts (distance_slug, event_edition_id, sex, edition_year, result_date);

create table private.rankings_time_counts_dirty (writer xid8 primary key);

revoke all on private.rankings_public_finishes, private.rankings_live_time_counts,
  private.rankings_time_counts, private.rankings_time_counts_dirty from public, anon, authenticated;

create function private.invalidate_rankings_time_counts()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into private.rankings_time_counts_dirty values (pg_current_xact_id())
  on conflict do nothing;
  return null;
end;
$$;
revoke all on function private.invalidate_rankings_time_counts() from public, anon, authenticated;

create trigger rankings_invalidate_performances
after insert or update or delete or truncate on public.performances
for each statement execute function private.invalidate_rankings_time_counts();
create trigger rankings_invalidate_sources
after insert or update or delete or truncate on public.sources
for each statement execute function private.invalidate_rankings_time_counts();
create trigger rankings_invalidate_editions
after insert or update or delete or truncate on public.event_editions
for each statement execute function private.invalidate_rankings_time_counts();
create trigger rankings_invalidate_source_records
after insert or update or delete or truncate on public.source_records
for each statement execute function private.invalidate_rankings_time_counts();

-- A rebuild never blocks readers. If a writer committed during the rebuild,
-- the new buckets remain marked stale and reads continue using live counts.
create function private.refresh_rankings_time_counts()
returns void language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('rankings_time_counts', 0));
  -- Consume only invalidations visible before taking the new counts. Any
  -- concurrent writer whose changes might be absent leaves its own marker.
  delete from private.rankings_time_counts_dirty;
  delete from private.rankings_time_counts;
  insert into private.rankings_time_counts select * from private.rankings_live_time_counts;
  analyze private.rankings_time_counts;
end;
$$;
revoke all on function private.refresh_rankings_time_counts() from public, anon, authenticated, service_role;

select private.refresh_rankings_time_counts();

create function private.rankings_cohort_counts(
  p_distance text, p_sex text, p_year integer, p_from date, p_until date, p_edition_id bigint
) returns setof private.rankings_time_counts
language sql stable as $$
  with cache as (
    select not exists (select 1 from private.rankings_time_counts_dirty) as ready
  )
  select c.* from private.rankings_time_counts c
  where (select ready from cache)
    and c.distance_slug = p_distance and (p_sex = 'all' or c.sex = p_sex)
    and (p_edition_id is null or c.event_edition_id = p_edition_id)
    and (p_year is null or c.edition_year = p_year)
    and (p_from is null or c.result_date >= p_from)
    and (p_until is null or c.result_date < p_until)
  union all
  select c.* from private.rankings_live_time_counts c
  where not (select ready from cache)
    and c.distance_slug = p_distance and (p_sex = 'all' or c.sex = p_sex)
    and (p_edition_id is null or c.event_edition_id = p_edition_id)
    and (p_year is null or c.edition_year = p_year)
    and (p_from is null or c.result_date >= p_from)
    and (p_until is null or c.result_date < p_until)
$$;
revoke all on function private.rankings_cohort_counts(text, text, integer, date, date, bigint)
  from public, anon, authenticated;

create or replace function public.rankings_page_scoped(
  p_distance text, p_sex text, p_year integer, p_query text, p_page integer,
  p_from date, p_until date, p_edition_id bigint, p_percentile text
) returns jsonb
language sql stable security definer set search_path = '' as $$
  with settings as (
    select btrim(coalesce(p_query, '')) as term,
      coalesce(p_percentile, 'all') as tier
  ), grains as materialized (
    select * from private.rankings_cohort_counts(p_distance, p_sex, p_year, p_from, p_until, p_edition_id)
  ), by_time as (
    select rank_time_ms, sum(finishes)::bigint as finishes from grains group by rank_time_ms
  ), ranked as materialized (
    select rank_time_ms, finishes,
      sum(finishes) over ()::bigint as total,
      sum(finishes) over (order by rank_time_ms)::bigint as through_time
    from by_time
  ), times as materialized (
    select *, (total - through_time)::numeric / total * 100.0 as percentile
    from ranked
  ), field as (
    select count(distinct event_edition_id) as edition_count,
      coalesce(sum(chips), 0) as chip_count, coalesce(sum(guns), 0) as official_count
    from grains
  ), stats as (
    select coalesce(max(total), 0) as total,
      min(rank_time_ms) as fastest_ms, max(rank_time_ms) as slowest_ms,
      (min(rank_time_ms) filter (where through_time >= (total + 1) / 2)::numeric
        + min(rank_time_ms) filter (where through_time >= (total + 2) / 2)) / 2 as median_ms,
      max(rank_time_ms) filter (where percentile >= 99) as p99_ms,
      max(rank_time_ms) filter (where percentile >= 95) as p95_ms,
      max(rank_time_ms) filter (where percentile >= 90) as p90_ms,
      max(rank_time_ms) filter (where percentile >= 75) as p75_ms,
      max(rank_time_ms) filter (where percentile >= 50) as p50_ms
    from times
  ), summary as materialized (
    select stats.*, field.*, floor(fastest_ms / 1000.0) * 1000 as minimum_ms,
      greatest(1000, ceil((slowest_ms - floor(fastest_ms / 1000.0) * 1000) / 40000.0) * 1000) as width_ms,
      case (select tier from settings)
        when 'all' then slowest_ms when 'top1' then p99_ms when 'top5' then p95_ms
        when 'top10' then p90_ms when 'top25' then p75_ms when 'top50' then p50_ms
      end as cutoff
    from stats cross join field
  ), bins as (
    select floor((t.rank_time_ms - s.minimum_ms) / s.width_ms)::integer as bucket,
      sum(t.finishes) as count
    from by_time t cross join summary s group by 1
  ), search_ids as (
    select p.id from public.performances p
    where (select term <> '' from settings)
      and p.eligible and not p.unpublished and p.distance_slug = p_distance
      and lower(p.athlete_name) like (select '%' || replace(replace(replace(
        lower(left(term, 100)), chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%'
        from settings)
    union
    select p.id from public.source_records sr join public.performances p on p.source_record_id = sr.id
    where (select term <> '' from settings)
      and sr.normalized_bib = (select upper(term) from settings)
      and p.eligible and not p.unpublished and p.distance_slug = p_distance
  ), searched as materialized (
    select p.id, p.rank_time_ms
    from search_ids i join private.rankings_public_finishes p using (id)
    where p.rank_time_ms <= (select cutoff from summary)
      and (p_sex = 'all' or p.sex = p_sex)
      and (p_edition_id is null or p.event_edition_id = p_edition_id)
      and (p_year is null or p.edition_year = p_year)
      and (p_from is null or p.result_date >= p_from)
      and (p_until is null or p.result_date < p_until)
  ), match_count as (
    select case when (select term = '' from settings) then
      (select coalesce(sum(finishes), 0)::bigint from by_time where rank_time_ms <= (select cutoff from summary))
    else (select count(*) from searched) end as total
  ), totals as (
    select total, greatest(1, least(greatest(1, coalesce(p_page, 1)),
      ceil(total / 50.0)::integer)) as page from match_count
  ), page_ids as materialized (
    select id, rank_time_ms from (
      (select p.id, p.rank_time_ms from private.rankings_public_finishes p
       where (select term = '' from settings)
         and p.rank_time_ms <= (select cutoff from summary)
         and p.distance_slug = p_distance and (p_sex = 'all' or p.sex = p_sex)
         and (p_edition_id is null or p.event_edition_id = p_edition_id)
         and (p_year is null or p.edition_year = p_year)
         and (p_from is null or p.result_date >= p_from)
         and (p_until is null or p.result_date < p_until)
       order by p.rank_time_ms, p.id
       limit (select page::bigint * 50 from totals))
      union all select id, rank_time_ms from searched
    ) m order by rank_time_ms, id limit 50 offset (select (page - 1)::bigint * 50 from totals)
  ), rows as (
    select p.id, p.athlete_name, p.sex, p.distance_slug, p.rank_time_ms, p.rank_clock,
      p.age_years, p.result_date, p.event_name, p.edition_year, p.attribution, p.source_url, p.bib,
      t.through_time - t.finishes + 1 as place, t.percentile, t.total as cohort_total
    from page_ids i join private.rankings_public_finishes p using (id)
    join times t on t.rank_time_ms = i.rank_time_ms
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(r) order by r.rank_time_ms, r.id) from rows r), '[]'::jsonb),
    'total', t.total, 'cohortTotal', s.total, 'page', t.page, 'pageSize', 50,
    'windowFrom', p_from, 'windowUntil', p_until,
    'analytics', case when s.total > 0 then jsonb_build_object(
      'total', s.total, 'editionCount', s.edition_count, 'fastestMs', s.fastest_ms,
      'slowestMs', s.slowest_ms, 'medianMs', s.median_ms, 'minimumMs', s.minimum_ms,
      'binWidthMs', s.width_ms, 'chipCount', s.chip_count, 'officialCount', s.official_count,
      'benchmarks', jsonb_build_object('top1Ms', s.p99_ms, 'top5Ms', s.p95_ms,
        'top10Ms', s.p90_ms, 'top25Ms', s.p75_ms, 'medianMs', s.median_ms),
      'bins', coalesce((select jsonb_agg(to_jsonb(b) order by b.bucket) from bins b), '[]'::jsonb)
    ) else null end
  )
  from totals t cross join summary s;
$$;

create or replace function public.refresh_rankings_distance_stats()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.refresh_rankings_time_counts();
  truncate public.rankings_distance_stats;
  insert into public.rankings_distance_stats (distance_slug, result_count, refreshed_at)
  select distance_slug, count(*), now()
  from private.rankings_public_finishes
  group by distance_slug;
end;
$$;

create or replace function public.rankings_athlete_page(p_athlete_id bigint, p_page integer default 1)
returns jsonb language sql stable security definer set search_path = '' as $$
  with selected as materialized (
    select p.id, p.athlete_name, p.distance_slug, p.rank_clock, p.rank_time_ms,
      p.result_date, p.event_name, p.edition_year, p.event_edition_id, p.sex
    from public.rankings_athlete_results l
    join private.rankings_public_finishes p on p.id = l.performance_id and p.updated_at = l.performance_updated_at
    where l.athlete_id = p_athlete_id
  ), fields as (
    select distinct event_edition_id, distance_slug, sex from selected
  ), by_time as (
    select f.event_edition_id, f.distance_slug, f.sex, c.rank_time_ms, sum(c.finishes)::bigint as finishes
    from fields f
    cross join lateral private.rankings_cohort_counts(f.distance_slug, f.sex, null, null, null, f.event_edition_id) c
    group by f.event_edition_id, f.distance_slug, f.sex, c.rank_time_ms
  ), ranked as (
    select *, sum(finishes) over field::bigint as field_total,
      sum(finishes) over (field order by rank_time_ms)::bigint as through_time
    from by_time
    window field as (partition by event_edition_id, distance_slug, sex)
  ), results as materialized (
    select p.id, p.athlete_name, p.distance_slug, p.rank_clock, p.rank_time_ms,
      p.result_date, p.event_name, p.edition_year, r.field_total,
      r.through_time - r.finishes + 1 as field_place,
      (r.field_total - r.through_time)::numeric / r.field_total * 100.0 as percentile
    from selected p join ranked r using (event_edition_id, distance_slug, sex, rank_time_ms)
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

create or replace function public.rankings_result(p_id bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  with selected as (
    select
      p.id, p.athlete_name, p.sex, p.distance_slug, p.rank_time_ms, p.rank_clock,
      p.chip_time_ms, p.gun_time_ms, p.age_years, p.result_date, p.source_url,
      p.event_edition_id, p.updated_at, p.event_name, p.edition_year,
      p.attribution, p.reuse_notes, p.bib
    from private.rankings_public_finishes p where p.id = p_id
  ), by_time as (
    select c.rank_time_ms, sum(c.finishes)::bigint as finishes
    from selected r
    cross join lateral private.rankings_cohort_counts(r.distance_slug, r.sex, null, null, null, r.event_edition_id) c
    group by c.rank_time_ms
  ), ranked as (
    select *, sum(finishes) over ()::bigint as total,
      sum(finishes) over (order by rank_time_ms)::bigint as through_time
    from by_time
  ), field as materialized (
    select *, (total - through_time)::numeric / total * 100.0 as percentile
    from ranked
  ), stats as (
    select max(f.total) as total,
      max(f.through_time - f.finishes + 1) filter (where f.rank_time_ms = r.rank_time_ms) as place,
      max(f.total - f.through_time) filter (where f.rank_time_ms = r.rank_time_ms) as slower,
      max(f.percentile) filter (where f.rank_time_ms = r.rank_time_ms) as percentile,
      (min(f.rank_time_ms) filter (where f.through_time >= (f.total + 1) / 2)::numeric
        + min(f.rank_time_ms) filter (where f.through_time >= (f.total + 2) / 2)) / 2 as median_ms,
      max(f.rank_time_ms) filter (where f.percentile >= 99) as p99_ms,
      max(f.rank_time_ms) filter (where f.percentile >= 95) as p95_ms,
      max(f.rank_time_ms) filter (where f.percentile >= 90) as p90_ms,
      max(f.rank_time_ms) filter (where f.percentile >= 75) as p75_ms,
      min(f.rank_time_ms) as minimum_ms,
      greatest(1000, ceil((max(f.rank_time_ms) - min(f.rank_time_ms)) / 40.0)::bigint) as width_ms
    from field f cross join selected r
  ), bins as (
    select floor((f.rank_time_ms - s.minimum_ms) / s.width_ms)::integer as bucket,
      sum(f.finishes) as count
    from field f cross join stats s group by 1
  ), neighbors as (
    select n.* from selected r cross join lateral (
      (select p.id, p.athlete_name, p.rank_time_ms
       from private.rankings_public_finishes p
       where p.event_edition_id = r.event_edition_id and p.distance_slug = r.distance_slug and p.sex = r.sex
         and (p.rank_time_ms, p.id) < (r.rank_time_ms, r.id)
       order by p.rank_time_ms desc, p.id desc limit 3)
      union all
      (select p.id, p.athlete_name, p.rank_time_ms
       from private.rankings_public_finishes p
       where p.event_edition_id = r.event_edition_id and p.distance_slug = r.distance_slug and p.sex = r.sex
         and (p.rank_time_ms, p.id) > (r.rank_time_ms, r.id)
       order by p.rank_time_ms, p.id limit 3)
    ) n
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
