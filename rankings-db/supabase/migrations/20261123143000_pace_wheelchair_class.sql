-- Wheelchair / open competition classes (NYRR age-grade metadata at ingest).

alter table public.performances
  add column if not exists competition_class text not null default 'open'
    check (competition_class in ('open', 'wheelchair'));

create index if not exists performances_competition_class_idx
  on public.performances (competition_class)
  where eligible and not unpublished;

drop function if exists private.upsert_performance(bigint, text, text, text, integer, bigint, bigint, text, date, text);

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
  p_source_url text,
  p_competition_class text default 'open'
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
  v_class text := coalesce(nullif(btrim(p_competition_class), ''), 'open');
begin
  if v_class not in ('open', 'wheelchair') then
    raise exception 'invalid competition class %', v_class;
  end if;
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
    source_url,
    competition_class
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
    coalesce(p_source_url, ''),
    v_class
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
    competition_class = excluded.competition_class,
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

revoke all on function private.upsert_performance(bigint, text, text, text, integer, bigint, bigint, text, date, text, text) from public;
grant execute on function private.upsert_performance(bigint, text, text, text, integer, bigint, bigint, text, date, text, text) to service_role;

create or replace view private.rankings_public_finishes as
select p.id, p.event_edition_id, p.athlete_name, p.sex, p.distance_slug,
       p.age_years, p.chip_time_ms, p.gun_time_ms, p.rank_time_ms, p.rank_clock,
       p.result_date, p.source_url, p.updated_at, p.competition_class,
       ed.name as event_name, ed.edition_year,
       s.attribution, s.reuse_notes, sr.normalized_bib as bib
from public.performances p
join public.source_records sr on sr.id = p.source_record_id
join public.sources s on s.id = sr.source_id
join public.event_editions ed on ed.id = p.event_edition_id
where p.eligible and not p.unpublished and s.display_allowed
  and ed.publication_state in ('published', 'frozen');

create or replace view private.rankings_live_time_counts as
select distance_slug, sex, competition_class, event_edition_id, edition_year, result_date, rank_time_ms,
       count(*) as finishes, count(*) filter (where rank_clock = 'chip') as chips,
       count(*) filter (where rank_clock = 'gun') as guns
from private.rankings_public_finishes
group by distance_slug, sex, competition_class, event_edition_id, edition_year, result_date, rank_time_ms;

alter table private.rankings_time_counts
  add column if not exists competition_class text not null default 'open';

drop index if exists private.rankings_time_counts_scope_idx;
create index rankings_time_counts_scope_idx
  on private.rankings_time_counts (distance_slug, event_edition_id, sex, competition_class, edition_year, result_date);

select private.refresh_rankings_time_counts();

drop function if exists private.rankings_cohort_counts(text, text, integer, date, date, bigint);

create or replace function private.rankings_cohort_counts(
  p_distance text, p_sex text, p_year integer, p_from date, p_until date, p_edition_id bigint,
  p_include_wheelchair boolean default false
) returns setof private.rankings_time_counts
language sql stable
set search_path = ''
as $$
  with cache as (
    select not exists (select 1 from private.rankings_time_counts_dirty) as ready
  )
  select c.* from private.rankings_time_counts c
  where (select ready from cache)
    and c.distance_slug = p_distance and (p_sex = 'all' or c.sex = p_sex)
    and (p_include_wheelchair or c.competition_class = 'open')
    and (p_edition_id is null or c.event_edition_id = p_edition_id)
    and (p_year is null or c.edition_year = p_year)
    and (p_from is null or c.result_date >= p_from)
    and (p_until is null or c.result_date < p_until)
  union all
  select c.* from private.rankings_live_time_counts c
  where not (select ready from cache)
    and c.distance_slug = p_distance and (p_sex = 'all' or c.sex = p_sex)
    and (p_include_wheelchair or c.competition_class = 'open')
    and (p_edition_id is null or c.event_edition_id = p_edition_id)
    and (p_year is null or c.edition_year = p_year)
    and (p_from is null or c.result_date >= p_from)
    and (p_until is null or c.result_date < p_until)
$$;

revoke all on function private.rankings_cohort_counts(text, text, integer, date, date, bigint, boolean)
  from public, anon, authenticated;

create or replace function public.rankings_page_scoped(
  p_distance text, p_sex text, p_year integer, p_query text, p_page integer,
  p_from date, p_until date, p_edition_id bigint, p_percentile text,
  p_include_wheelchair boolean default false
) returns jsonb
language plpgsql stable security definer
set search_path = ''
set plan_cache_mode = 'force_custom_plan'
as $$
declare
  term text := btrim(coalesce(p_query, ''));
  tier text := coalesce(p_percentile, 'all');
  name_pattern text := '%' || replace(replace(replace(lower(left(term, 100)),
    chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%';
begin
  return (
    with grains as materialized (
      select * from private.rankings_cohort_counts(p_distance, p_sex, p_year, p_from, p_until, p_edition_id, p_include_wheelchair)
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
        case tier
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
      join public.source_records sr on sr.id = p.source_record_id
      join public.sources s on s.id = sr.source_id
      join public.event_editions ed on ed.id = p.event_edition_id
      where term <> ''
        and p.eligible and not p.unpublished and p.distance_slug = p_distance
        and s.display_allowed and ed.publication_state in ('published', 'frozen')
        and (p_include_wheelchair or p.competition_class = 'open')
        and lower(p.athlete_name) like name_pattern
      union
      select p.id from public.source_records sr join public.performances p on p.source_record_id = sr.id
      join public.sources s on s.id = sr.source_id
      join public.event_editions ed on ed.id = p.event_edition_id
      where term <> ''
        and sr.normalized_bib = upper(term)
        and p.eligible and not p.unpublished and p.distance_slug = p_distance
        and s.display_allowed and ed.publication_state in ('published', 'frozen')
        and (p_include_wheelchair or p.competition_class = 'open')
    ), searched as materialized (
      select p.id, p.rank_time_ms
      from search_ids i join private.rankings_public_finishes p using (id)
      where p.rank_time_ms <= (select cutoff from summary)
        and (p_sex = 'all' or p.sex = p_sex)
        and (p_include_wheelchair or p.competition_class = 'open')
        and (p_edition_id is null or p.event_edition_id = p_edition_id)
        and (p_year is null or p.edition_year = p_year)
        and (p_from is null or p.result_date >= p_from)
        and (p_until is null or p.result_date < p_until)
    ), match_count as (
      select case when term = '' then
        (select coalesce(sum(finishes), 0)::bigint from by_time where rank_time_ms <= (select cutoff from summary))
      else (select count(*) from searched) end as total
    ), totals as (
      select total, greatest(1, least(greatest(1, coalesce(p_page, 1)),
        ceil(total / 50.0)::integer)) as page from match_count
    ), page_start as materialized (
      select t.rank_time_ms, (m.page - 1)::bigint * 50 - (t.through_time - t.finishes) as skip_ties
      from times t cross join totals m
      where term = '' and m.total > 0
        and t.through_time > (m.page - 1)::bigint * 50
      order by t.rank_time_ms limit 1
    ), page_ids as materialized (
      (select p.id, p.rank_time_ms from private.rankings_public_finishes p
       where p.rank_time_ms between (select rank_time_ms from page_start) and (select cutoff from summary)
         and p.distance_slug = p_distance and (p_sex = 'all' or p.sex = p_sex)
         and (p_include_wheelchair or p.competition_class = 'open')
         and (p_edition_id is null or p.event_edition_id = p_edition_id)
         and (p_year is null or p.edition_year = p_year)
         and (p_from is null or p.result_date >= p_from)
         and (p_until is null or p.result_date < p_until)
       order by p.rank_time_ms, p.id limit 50 offset (select skip_ties from page_start))
      union all
      (select id, rank_time_ms from searched order by rank_time_ms, id
       limit 50 offset (select (page - 1)::bigint * 50 from totals))
    ), rows as (
      select p.id, p.athlete_name, p.sex, p.distance_slug, p.rank_time_ms, p.rank_clock,
        p.age_years, p.result_date, p.event_name, p.edition_year, p.attribution, p.source_url, p.bib,
        p.competition_class,
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
    from totals t cross join summary s
  );
end;
$$;

revoke all on function public.rankings_page_scoped(text, text, integer, text, integer, date, date, bigint, text, boolean) from public;
grant execute on function public.rankings_page_scoped(text, text, integer, text, integer, date, date, bigint, text, boolean)
  to anon, authenticated, service_role;

-- Per-result cohort: wheelchair percentiles use the wheelchair field, not open.
create or replace function public.rankings_result(p_id bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  with selected as (
    select
      p.id, p.athlete_name, p.sex, p.distance_slug, p.rank_time_ms, p.rank_clock,
      p.chip_time_ms, p.gun_time_ms, p.age_years, p.result_date, p.source_url,
      p.event_edition_id, p.updated_at, p.event_name, p.edition_year,
      p.attribution, p.reuse_notes, p.bib, p.competition_class
    from private.rankings_public_finishes p where p.id = p_id
  ), by_time as (
    select c.rank_time_ms, sum(c.finishes)::bigint as finishes
    from selected r
    cross join lateral private.rankings_cohort_counts(
      r.distance_slug, r.sex, null, null, null, r.event_edition_id,
      r.competition_class = 'wheelchair'
    ) c
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
         and p.competition_class = r.competition_class
         and (p.rank_time_ms, p.id) < (r.rank_time_ms, r.id)
       order by p.rank_time_ms desc, p.id desc limit 3)
      union all
      (select p.id, p.athlete_name, p.rank_time_ms
       from private.rankings_public_finishes p
       where p.event_edition_id = r.event_edition_id and p.distance_slug = r.distance_slug and p.sex = r.sex
         and p.competition_class = r.competition_class
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

-- Replay field: open division only (wheelchair via dedicated leaderboard toggle).
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
  ), field_distance_m as (
    select case p_distance
      when '5k' then 5000::numeric
      when '10k' then 10000::numeric
      when 'half_marathon' then 21097.5::numeric
      when 'marathon' then 42195::numeric
      else null::numeric
    end as metres
  ), candidates as materialized (
    select p.id
    from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    join public.event_editions ed on ed.id = p.event_edition_id
    cross join field_distance_m fd
    where p.event_edition_id = p_edition_id
      and p.distance_slug = p_distance
      and (p_sex = 'all' or p.sex = p_sex)
      and p.competition_class = 'open'
      and p.eligible and not p.unpublished and s.display_allowed
      and ed.publication_state in ('published', 'frozen')
      and fd.metres is not null
      and (
        (p_clock = 'chip' and p.chip_time_ms is not null)
        or (p_clock = 'gun' and p.gun_time_ms is not null)
      )
  ), page_ids as (
    select id from candidates
    where id > greatest(coalesce(p_after, 0), 0)
      and (p_ids is null or (cardinality(p_ids) <= 100 and id = any(p_ids)))
    order by id
    limit 1000
  ), runners as (
    select
      p.id,
      p.athlete_name as name,
      coalesce(t.start_at, ed.starts_on::timestamptz) as "startAt",
      jsonb_build_object(
        'clock', p_clock,
        'sourceUrl', coalesce(t.source_url, p.source_url),
        'finishMs', case p_clock when 'chip' then p.chip_time_ms else p.gun_time_ms end,
        'checkpoints', case
          when t.performance_id is not null then (
            select jsonb_agg(jsonb_build_object('distanceM', cps.distances_m[i], 'elapsedMs', t.elapsed_ms[i]) order by i)
            from generate_subscripts(cps.distances_m, 1) as checkpoints(i)
          )
          else jsonb_build_array(
            jsonb_build_object('distanceM', fd.metres, 'elapsedMs', case p_clock when 'chip' then p.chip_time_ms else p.gun_time_ms end)
          )
        end
      ) as splits
    from page_ids ids
    join public.performances p on p.id = ids.id
    join public.source_records sr on sr.id = p.source_record_id
    join public.event_editions ed on ed.id = p.event_edition_id
    cross join field_distance_m fd
    left join public.performance_split_times t
      on t.performance_id = p.id
      and t.performance_updated_at = p.updated_at
      and t.clock = p_clock
    left join public.race_checkpoint_sets cps
      on cps.id = t.checkpoint_set_id
      and cps.event_edition_id = p.event_edition_id
      and cps.distance_slug = p.distance_slug
  )
  select jsonb_build_object(
    'version', md5(c.points::text || extract(epoch from c.reviewed_at)::text),
    'course', case when coalesce(p_after, 0) = 0 then
      jsonb_build_object('points', c.points, 'sourceUrl', c.source_url, 'attribution', c.attribution)
      else null end,
    'totalAvailable', (select count(*)::int from candidates),
    'runners', coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from runners r), '[]'::jsonb),
    'next', case
      when exists(
        select 1 from candidates
        where id > (select max(id) from page_ids)
          and (p_ids is null or (cardinality(p_ids) <= 100 and id = any(p_ids)))
      ) then (select max(id) from page_ids)
      else null
    end
  )
  from course c;
$$;