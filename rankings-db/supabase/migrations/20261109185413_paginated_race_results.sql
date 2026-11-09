-- Full-field reads. Search never changes the rank within the selected cohort.
create or replace function public.rankings_page(
  p_distance text, p_sex text default 'female', p_year integer default null,
  p_query text default '', p_page integer default 1
) returns jsonb
language sql stable security definer set search_path = '' as $$
  with cohort as materialized (
    select p.id, p.athlete_name, p.sex, p.distance_slug, p.rank_time_ms,
      p.rank_clock, p.age_years, p.result_date, ed.name as event_name,
      ed.edition_year, s.attribution, p.source_url, sr.normalized_bib as bib,
      rank() over (order by p.rank_time_ms) as place
    from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    join public.event_editions ed on ed.id = p.event_edition_id
    where p.eligible and not p.unpublished and s.display_allowed
      and p.distance_slug = p_distance and p.sex = p_sex
      and (p_year is null or ed.edition_year = p_year)
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
    'page', t.page, 'pageSize', 50
  ) from totals t;
$$;
revoke all on function public.rankings_page(text, text, integer, text, integer) from public;
grant execute on function public.rankings_page(text, text, integer, text, integer) to anon, authenticated, service_role;
