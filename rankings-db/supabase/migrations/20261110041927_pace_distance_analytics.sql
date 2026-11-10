-- Full-field reads. Search never changes the rank within the selected cohort.
create or replace function public.rankings_page_scoped(
  p_distance text, p_sex text default 'female', p_year integer default null,
  p_query text default '', p_page integer default 1, p_from date default null, p_until date default null,
  p_edition_id bigint default null
) returns jsonb
language sql stable security definer set search_path = '' as $$
  with cohort as materialized (
    select p.event_edition_id,p.id, p.athlete_name, p.sex, p.distance_slug, p.rank_time_ms,
      p.rank_clock, p.age_years, p.result_date, ed.name as event_name,
      ed.edition_year, s.attribution, p.source_url, sr.normalized_bib as bib,
      rank() over (order by p.rank_time_ms) as place
    from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    join public.event_editions ed on ed.id = p.event_edition_id
    where p.eligible and not p.unpublished and s.display_allowed
      and p.distance_slug = p_distance and (p_sex='all' or p.sex=p_sex)
      and (p_edition_id is null or p.event_edition_id = p_edition_id)
      and (p_year is null or ed.edition_year = p_year)
      and (p_from is null or p.result_date >= p_from)
      and (p_until is null or p.result_date < p_until)
  ), stats as (
    select count(*) as total,count(distinct event_edition_id) as edition_count, min(rank_time_ms) as fastest_ms,
      max(rank_time_ms) as slowest_ms,
      percentile_cont(0.5) within group (order by rank_time_ms) as median_ms,
      floor(min(rank_time_ms)/1000.0)*1000 as minimum_ms,
      greatest(1000,ceil((max(rank_time_ms)-floor(min(rank_time_ms)/1000.0)*1000)/40000.0)*1000) as width_ms,
      count(*) filter (where rank_clock='chip') as chip_count,
      count(*) filter (where rank_clock='gun') as official_count
    from cohort
  ), bins as (
    select floor((c.rank_time_ms-s.minimum_ms)/s.width_ms)::integer as bucket, count(*) as count
    from cohort c cross join stats s where s.total>0 group by 1
  ), matches as materialized (
    select * from cohort
    where btrim(coalesce(p_query, '')) = ''
      or position(lower(left(btrim(p_query), 100)) in lower(athlete_name)) > 0
      or bib = upper(btrim(p_query))
  ), totals as (
    select count(*) as total, greatest(1, least(greatest(1, coalesce(p_page, 1)),
      ceil(count(*) / 50.0)::integer)) as page from matches
  ), rows as (
    select * from matches order by rank_time_ms, id
    limit 50 offset (select (page - 1)::bigint * 50 from totals)
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(r) order by r.rank_time_ms, r.id) from rows r), '[]'::jsonb),
    'total', t.total, 'cohortTotal', (select count(*) from cohort),
    'analytics', (select case when s.total>0 then jsonb_build_object(
      'total',s.total,'editionCount',s.edition_count,'fastestMs',s.fastest_ms,'slowestMs',s.slowest_ms,'medianMs',s.median_ms,
      'minimumMs',s.minimum_ms,'binWidthMs',s.width_ms,'chipCount',s.chip_count,'officialCount',s.official_count,
      'bins',coalesce((select jsonb_agg(to_jsonb(b) order by b.bucket) from bins b),'[]'::jsonb)
    ) else null end from stats s),
    'page', t.page, 'pageSize', 50, 'windowFrom', p_from, 'windowUntil', p_until
  ) from totals t;
$$;
revoke all on function public.rankings_page_scoped(text, text, integer, text, integer, date, date, bigint) from public;
grant execute on function public.rankings_page_scoped(text, text, integer, text, integer, date, date, bigint) to anon, authenticated, service_role;


