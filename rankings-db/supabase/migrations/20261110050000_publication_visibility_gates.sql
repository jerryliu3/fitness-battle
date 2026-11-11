-- Migration: Publication visibility gates across public queries, privacy suppression, and evidence-backed performance restoration.
-- Slices B & C from docs/race-results-architecture.md.
-- Additive only: preserves existing records, views, and functions.

-- 1. Explicit privacy suppression flag and correction removal flag on performances
alter table public.performances
  add column if not exists privacy_suppressed boolean not null default false,
  add column if not exists correction_removed boolean not null default false;

-- Backfill: preserve any existing manual/privacy suppressions conservatively
update public.performances
set privacy_suppressed = true
where unpublished = true;

-- 2. Evidence-backed restoration in private.upsert_performance without overriding independent privacy suppression
create or replace function private.upsert_performance(
  p_source_record_id bigint,
  p_athlete_name text,
  p_sex text,
  p_distance_slug text,
  p_age_years integer,
  p_chip_time_ms bigint,
  p_gun_time_ms bigint,
  p_finish_status text,
  p_result_date date,
  p_source_url text
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category_key text;
  v_edition_id bigint;
  v_rank_time bigint;
  v_rank_clock text;
  v_inserted boolean;
begin
  if p_age_years is not null and p_age_years < 18 then
    raise exception 'youth results are not stored';
  end if;

  select sr.category_key, sr.event_edition_id
  into v_category_key, v_edition_id
  from public.source_records sr
  where sr.id = p_source_record_id;

  if not found then
    raise exception 'source record % not found', p_source_record_id;
  end if;

  if v_category_key <> p_distance_slug || ':' || p_sex then
    raise exception 'performance category does not match source record';
  end if;

  if p_chip_time_ms is not null then
    v_rank_time := p_chip_time_ms;
    v_rank_clock := 'chip';
  elsif p_gun_time_ms is not null then
    v_rank_time := p_gun_time_ms;
    v_rank_clock := 'gun';
  else
    v_rank_time := null;
    v_rank_clock := null;
  end if;

  insert into public.performances (
    source_record_id,
    event_edition_id,
    athlete_name,
    sex,
    distance_slug,
    age_years,
    chip_time_ms,
    gun_time_ms,
    rank_time_ms,
    rank_clock,
    finish_status,
    result_date,
    source_url
  ) values (
    p_source_record_id,
    v_edition_id,
    btrim(p_athlete_name),
    p_sex,
    p_distance_slug,
    p_age_years,
    p_chip_time_ms,
    p_gun_time_ms,
    v_rank_time,
    v_rank_clock,
    p_finish_status,
    p_result_date,
    coalesce(p_source_url, '')
  )
  on conflict (source_record_id)
  do update set
    athlete_name = excluded.athlete_name,
    sex = excluded.sex,
    distance_slug = excluded.distance_slug,
    age_years = excluded.age_years,
    chip_time_ms = excluded.chip_time_ms,
    gun_time_ms = excluded.gun_time_ms,
    rank_time_ms = excluded.rank_time_ms,
    rank_clock = excluded.rank_clock,
    finish_status = excluded.finish_status,
    result_date = excluded.result_date,
    source_url = excluded.source_url,
    -- Conservative preservation: privacy-suppressed records remain unpublished.
    -- Records removed by a previous correction (correction_removed = true) are restored upon re-import with new evidence.
    unpublished = case
      when public.performances.privacy_suppressed then true
      when public.performances.correction_removed then false
      else public.performances.unpublished
    end,
    correction_removed = false,
    updated_at = now()
  returning (xmax = 0) into v_inserted;

  if v_inserted then
    return 'inserted';
  end if;
  return 'updated';
end;
$$;

revoke all on function private.upsert_performance(bigint, text, text, text, integer, bigint, bigint, text, date, text) from public;
grant execute on function private.upsert_performance(bigint, text, text, text, integer, bigint, bigint, text, date, text) to service_role;

-- 3. Enforce publication gate across all public read RPCs.
-- Draft and staged editions must remain hidden from public reads.

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
      sr.normalized_bib as bib
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
      'bins', coalesce((select jsonb_agg(to_jsonb(b) order by b.bucket) from bins b), '[]'::jsonb)
    ) else null end from stats s),
    'page', t.page,
    'pageSize', 50
  )
  from totals t;
$$;
revoke all on function public.rankings_page_scoped(text, text, integer, text, integer, date, date, bigint) from public;
grant execute on function public.rankings_page_scoped(text, text, integer, text, integer, date, date, bigint) to anon, authenticated, service_role;

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
    select p.id, p.athlete_name, p.rank_time_ms
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
      round(((count(*) filter (where f.rank_time_ms > r.rank_time_ms))::numeric / greatest(1, count(*)) * 100.0), 1) as percentile,
      percentile_cont(0.50) within group (order by f.rank_time_ms) as median_ms,
      min(f.rank_time_ms) as minimum_ms,
      greatest(1000, ceil((max(f.rank_time_ms) - min(f.rank_time_ms)) / 40.0)::bigint) as width_ms
    from field f cross join selected r
  ), bins as (
    select floor((f.rank_time_ms - s.minimum_ms) / s.width_ms)::integer as bucket, count(*) as count
    from field f cross join stats s group by 1
  ), neighbors as (
    (select f.* from field f cross join selected r
      where (f.rank_time_ms, f.id) < (r.rank_time_ms, r.id)
      order by f.rank_time_ms desc, f.id desc limit 3)
    union all
    (select f.* from field f cross join selected r
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
    'minimumMs', s.minimum_ms,
    'binWidthMs', s.width_ms,
    'bins', coalesce((select jsonb_agg(to_jsonb(b) order by b.bucket) from bins b), '[]'::jsonb),
    'neighbors', coalesce((select jsonb_agg(to_jsonb(n) order by n.rank_time_ms, n.id) from neighbors n), '[]'::jsonb)
  )
  from selected r cross join stats s;
$$;
revoke all on function public.rankings_result(bigint) from public;
grant execute on function public.rankings_result(bigint) to anon, authenticated, service_role;

create or replace function public.rankings_saved(p_ids bigint[])
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.rank_time_ms, r.id), '[]'::jsonb)
  from (
    select
      p.id, p.athlete_name, p.sex, p.distance_slug, p.rank_time_ms, p.rank_clock,
      p.chip_time_ms, p.gun_time_ms, p.age_years, p.result_date, p.source_url,
      p.event_edition_id, p.updated_at, ed.name as event_name, ed.edition_year,
      s.attribution, s.reuse_notes, sr.normalized_bib as bib
    from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    join public.event_editions ed on ed.id = p.event_edition_id
    where p.id = any(p_ids[1:100]) and p.eligible and not p.unpublished and s.display_allowed
      and ed.publication_state in ('published', 'frozen')
  ) r;
$$;
revoke all on function public.rankings_saved(bigint[]) from public;
grant execute on function public.rankings_saved(bigint[]) to anon, authenticated, service_role;

create or replace function public.rankings_coverage(p_distance text default null, p_edition_id bigint default null, p_sex text default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(c) order by c.edition_year desc,c.event_name,c.sex),'[]'::jsonb)
  from (
    select ed.id as edition_id,ed.name as event_name,ed.edition_year,p.distance_slug,p.sex,
      count(*) as published_count,count(*) filter(where p.result_date is null) as undated_count,
      r.expected_eligible_count,r.reviewed_at,r.evidence_url,
      coalesce(count(*)=r.expected_eligible_count
        and bool_and(sr.last_ingestion_run_id is not distinct from r.ingestion_run_id)
        and max(p.updated_at)<=r.reviewed_at and ir.status='succeeded',false) as complete
    from public.performances p
    join public.source_records sr on sr.id=p.source_record_id
    join public.sources s on s.id=sr.source_id
    join public.event_editions ed on ed.id=p.event_edition_id
    left join public.rankings_coverage_reviews r on r.event_edition_id=p.event_edition_id
      and r.distance_slug=p.distance_slug and r.sex=p.sex
    left join public.ingestion_runs ir on ir.id=r.ingestion_run_id and ir.source_id=sr.source_id
    where p.eligible and not p.unpublished and s.display_allowed
      and ed.publication_state in ('published', 'frozen')
      and (p_distance is null or p.distance_slug=p_distance)
      and (p_edition_id is null or p.event_edition_id=p_edition_id)
      and (p_sex is null or p.sex=p_sex)
    group by ed.id,ed.name,ed.edition_year,p.distance_slug,p.sex,
      r.expected_eligible_count,r.reviewed_at,r.evidence_url,r.ingestion_run_id,ir.status
  ) c;
$$;
revoke all on function public.rankings_coverage(text,bigint,text) from public;
grant execute on function public.rankings_coverage(text,bigint,text) to anon,authenticated,service_role;

drop function if exists public.rankings_edition_history(text, text);

create or replace function public.rankings_edition_history(p_edition_id bigint, p_distance text, p_sex text default 'female')
returns jsonb language sql stable security definer set search_path = '' as $$
  with selected as (
    select ed.event_id from public.event_editions ed
    where ed.id = p_edition_id
      and ed.publication_state in ('published', 'frozen')
      and exists (
        select 1 from public.performances p
        join public.source_records sr on sr.id = p.source_record_id
        join public.sources s on s.id = sr.source_id
        where p.event_edition_id = ed.id and p.distance_slug = p_distance
          and (p_sex = 'all' or p.sex = p_sex)
          and p.eligible and not p.unpublished and s.display_allowed
      )
  ), editions as (
    select
      ed.id as edition_id,
      ed.name as event_name,
      ed.edition_year,
      count(*) as total,
      min(p.rank_time_ms) as fastest_ms,
      percentile_cont(0.5) within group (order by p.rank_time_ms) as median_ms,
      count(*) filter (where p.rank_clock = 'chip') as chip_count,
      count(*) filter (where p.rank_clock = 'gun') as official_count
    from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    join public.event_editions ed on ed.id = p.event_edition_id
    join selected on selected.event_id = ed.event_id
    where p.distance_slug = p_distance
      and (p_sex = 'all' or p.sex = p_sex)
      and p.eligible and not p.unpublished and s.display_allowed
      and ed.publication_state in ('published', 'frozen')
    group by ed.id, ed.name, ed.edition_year
  ) select coalesce(jsonb_agg(to_jsonb(e) order by e.edition_year), '[]'::jsonb) from editions e;
$$;
revoke all on function public.rankings_edition_history(bigint, text, text) from public;
grant execute on function public.rankings_edition_history(bigint, text, text) to anon, authenticated, service_role;

create or replace function public.rankings_replay_page(
  p_edition_id bigint,
  p_distance text,
  p_sex text,
  p_clock text,
  p_ids bigint[] default null,
  p_after bigint default 0
) returns jsonb language sql stable security definer set search_path = '' as $$
  with course as materialized (
    select c.* from public.rankings_replay_courses c
    join public.event_editions ed on ed.id = c.event_edition_id
    where c.event_edition_id = p_edition_id
      and c.distance_slug = p_distance
      and c.display_allowed
      and ed.publication_state in ('published', 'frozen')
  ), candidates as materialized (
    select p.id from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    join public.event_editions ed on ed.id = p.event_edition_id
    join public.performance_split_times t on t.performance_id = p.id
      and t.performance_updated_at = p.updated_at and t.clock = p_clock
    join public.race_checkpoint_sets c on c.id = t.checkpoint_set_id and c.event_edition_id = p.event_edition_id and c.distance_slug = p.distance_slug
    where p.event_edition_id = p_edition_id and p.distance_slug = p_distance and (p_sex = 'all' or p.sex = p_sex)
      and p.eligible and not p.unpublished and s.display_allowed
      and ed.publication_state in ('published', 'frozen')
  ), page_ids as (
    select id from candidates where id > greatest(coalesce(p_after, 0), 0) and (p_ids is null or (cardinality(p_ids) <= 100 and id = any(p_ids))) order by id limit 1000
  ), runners as (
    select p.id, p.athlete_name as name, t.start_at as "startAt", jsonb_build_object('clock', t.clock,
      'sourceUrl', t.source_url, 'finishMs', case t.clock when 'chip' then p.chip_time_ms else p.gun_time_ms end,
      'checkpoints', (select jsonb_agg(jsonb_build_object('distanceM', c.distances_m[i], 'elapsedMs', t.elapsed_ms[i]) order by i)
        from generate_subscripts(c.distances_m, 1) as checkpoints(i))) as splits
    from page_ids ids join public.performances p on p.id = ids.id
    join public.performance_split_times t on t.performance_id = p.id join public.race_checkpoint_sets c on c.id = t.checkpoint_set_id
  ) select jsonb_build_object('version', md5(c.points::text || extract(epoch from c.reviewed_at)::text), 'course', case when coalesce(p_after, 0) = 0 then
    jsonb_build_object('points', c.points, 'sourceUrl', c.source_url, 'attribution', c.attribution) else null end,
    'totalAvailable', (select count(*) from candidates),
    'runners', coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from runners r), '[]'::jsonb),
    'next', case when exists(select 1 from candidates where id > (select max(id) from page_ids)
      and (p_ids is null or (cardinality(p_ids) <= 100 and id = any(p_ids)))) then (select max(id) from page_ids) else null end)
  from course c where exists(select 1 from candidates);
$$;
revoke all on function public.rankings_replay_page(bigint, text, text, text, bigint[], bigint) from public;
grant execute on function public.rankings_replay_page(bigint, text, text, text, bigint[], bigint) to anon, authenticated, service_role;

create or replace function public.rankings_athlete_page(p_athlete_id bigint, p_page integer default 1)
returns jsonb language sql stable security definer set search_path = '' as $$
  with results as materialized (
    select
      p.id, p.athlete_name, p.distance_slug, p.rank_clock, p.rank_time_ms, p.result_date,
      ed.name as event_name, ed.edition_year,
      (select count(*) from public.performances f
       join public.event_editions fed on fed.id = f.event_edition_id
       where f.event_edition_id = p.event_edition_id and f.distance_slug = p.distance_slug and f.sex = p.sex
         and f.eligible and not f.unpublished and fed.publication_state in ('published', 'frozen')) as field_total,
      (select count(*) filter (where f.rank_time_ms < p.rank_time_ms) + 1 from public.performances f
       join public.event_editions fed on fed.id = f.event_edition_id
       where f.event_edition_id = p.event_edition_id and f.distance_slug = p.distance_slug and f.sex = p.sex
         and f.eligible and not f.unpublished and fed.publication_state in ('published', 'frozen')) as field_place
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
    select distance_slug, rank_clock, min(rank_time_ms) as time_ms, count(*) as total from results group by distance_slug, rank_clock
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

drop function if exists public.refresh_rankings_distance_stats(text);
create or replace function public.refresh_rankings_distance_stats()
returns void language plpgsql security definer set search_path = '' as $$
begin
  truncate public.rankings_distance_stats;
  insert into public.rankings_distance_stats (distance_slug, result_count, refreshed_at)
  select p.distance_slug, count(*)::bigint, now()
  from public.performances p
  join public.source_records sr on sr.id = p.source_record_id
  join public.sources s on s.id = sr.source_id
  join public.event_editions ed on ed.id = p.event_edition_id
  where p.eligible and not p.unpublished and s.display_allowed
    and ed.publication_state in ('published', 'frozen')
  group by p.distance_slug;
end;
$$;
revoke all on function public.refresh_rankings_distance_stats() from public;
grant execute on function public.refresh_rankings_distance_stats() to service_role;

drop function if exists public.rankings_top(text, text, integer);
create or replace function public.rankings_top(
  p_distance text,
  p_sex text,
  p_year integer default null,
  p_limit integer default 100
)
returns table (
  rank bigint,
  id bigint,
  athlete_name text,
  rank_time_ms bigint,
  rank_clock text,
  event_name text,
  edition_year integer,
  result_date date
)
language sql stable security definer set search_path = '' as $$
  select
    row_number() over (order by p.rank_time_ms asc, p.id asc) as rank,
    p.id,
    p.athlete_name,
    p.rank_time_ms,
    p.rank_clock,
    ed.name as event_name,
    ed.edition_year,
    p.result_date
  from public.performances p
  join public.source_records sr on sr.id = p.source_record_id
  join public.sources s on s.id = sr.source_id
  join public.event_editions ed on ed.id = p.event_edition_id
  where p.distance_slug = p_distance
    and p.sex = p_sex
    and p.eligible
    and not p.unpublished
    and s.display_allowed
    and ed.publication_state in ('published', 'frozen')
    and (p_year is null or ed.edition_year = p_year)
  order by p.rank_time_ms asc, p.id asc
  limit greatest(1, least(p_limit, 500));
$$;
revoke all on function public.rankings_top(text, text, integer, integer) from public;
grant execute on function public.rankings_top(text, text, integer, integer) to anon, authenticated, service_role;

create or replace function public.rankings_page_window(
  p_distance text,
  p_sex text,
  p_from date,
  p_until date,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  rank bigint,
  id bigint,
  athlete_name text,
  rank_time_ms bigint,
  rank_clock text,
  event_name text,
  edition_year integer,
  result_date date
)
language sql stable security definer set search_path = '' as $$
  select
    row_number() over (order by p.rank_time_ms asc, p.id asc) as rank,
    p.id,
    p.athlete_name,
    p.rank_time_ms,
    p.rank_clock,
    ed.name as event_name,
    ed.edition_year,
    p.result_date
  from public.performances p
  join public.source_records sr on sr.id = p.source_record_id
  join public.sources s on s.id = sr.source_id
  join public.event_editions ed on ed.id = p.event_edition_id
  where p.distance_slug = p_distance
    and p.sex = p_sex
    and p.eligible
    and not p.unpublished
    and s.display_allowed
    and ed.publication_state in ('published', 'frozen')
    and p.result_date >= p_from
    and p.result_date < p_until
  order by p.rank_time_ms asc, p.id asc
  limit greatest(1, least(p_limit, 100))
  offset greatest(0, p_offset);
$$;
revoke all on function public.rankings_page_window(text, text, date, date, integer, integer) from public;
grant execute on function public.rankings_page_window(text, text, date, date, integer, integer) to anon, authenticated, service_role;

create or replace function private.leaderboard_rows()
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
language sql stable security definer set search_path = '' as $$
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
    and ed.publication_state in ('published', 'frozen');
$$;
revoke all on function private.leaderboard_rows() from public;
grant execute on function private.leaderboard_rows() to service_role;
