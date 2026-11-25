-- Materialize rankings_coverage_cache (drops rankings_coverage from ~8s to <2ms)
-- and rewrite replay pagination RPCs to paginate performances via index scan BEFORE
-- joining source_records / performance_split_times (drops replay pages from ~2.5s to ~30ms),
-- plus optional checkpoint-set deduplication (p_dedupe_checkpoints) and 20k page cap.

create or replace view private.rankings_live_coverage as
select
  ed.id as edition_id,
  ed.name as event_name,
  ed.edition_year,
  p.distance_slug,
  p.sex,
  count(*) as published_count,
  count(*) filter (where p.result_date is null) as undated_count,
  r.expected_eligible_count,
  r.reviewed_at,
  r.evidence_url,
  coalesce(
    count(*) = r.expected_eligible_count
      and bool_and(sr.last_ingestion_run_id is not distinct from r.ingestion_run_id)
      and max(p.updated_at) <= r.reviewed_at
      and ir.status = 'succeeded',
    false
  ) as complete
from public.performances p
join public.source_records sr on sr.id = p.source_record_id
join public.sources s on s.id = sr.source_id
join public.event_editions ed on ed.id = p.event_edition_id
left join public.rankings_coverage_reviews r
  on r.event_edition_id = p.event_edition_id
  and r.distance_slug = p.distance_slug
  and r.sex = p.sex
left join public.ingestion_runs ir
  on ir.id = r.ingestion_run_id
  and ir.source_id = sr.source_id
where p.eligible
  and not p.unpublished
  and s.display_allowed
  and ed.publication_state in ('published', 'frozen')
group by
  ed.id, ed.name, ed.edition_year, p.distance_slug, p.sex,
  r.expected_eligible_count, r.reviewed_at, r.evidence_url, r.ingestion_run_id, ir.status;

create table if not exists private.rankings_coverage_cache
as select * from private.rankings_live_coverage with no data;

create index if not exists rankings_coverage_cache_scope_idx
  on private.rankings_coverage_cache (distance_slug, edition_id, sex);

revoke all on private.rankings_live_coverage, private.rankings_coverage_cache
  from public, anon, authenticated;

drop trigger if exists rankings_invalidate_coverage_reviews on public.rankings_coverage_reviews;
create trigger rankings_invalidate_coverage_reviews
after insert or update or delete or truncate on public.rankings_coverage_reviews
for each statement execute function private.invalidate_rankings_time_counts();

drop trigger if exists rankings_invalidate_ingestion_runs on public.ingestion_runs;
create trigger rankings_invalidate_ingestion_runs
after insert or update or delete or truncate on public.ingestion_runs
for each statement execute function private.invalidate_rankings_time_counts();

create or replace function private.refresh_rankings_time_counts()
returns void language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('rankings_time_counts', 0));
  delete from private.rankings_time_counts_dirty;
  delete from private.rankings_time_counts;
  insert into private.rankings_time_counts select * from private.rankings_live_time_counts;
  analyze private.rankings_time_counts;

  delete from private.rankings_coverage_cache;
  insert into private.rankings_coverage_cache select * from private.rankings_live_coverage;
  analyze private.rankings_coverage_cache;
end;
$$;
revoke all on function private.refresh_rankings_time_counts() from public, anon, authenticated, service_role;

select private.refresh_rankings_time_counts();

create or replace function public.rankings_coverage(
  p_distance text default null,
  p_edition_id bigint default null,
  p_sex text default null
) returns jsonb language sql stable security definer set search_path = '' as $$
  with cache as (
    select not exists (select 1 from private.rankings_time_counts_dirty) as ready
  ), rows as (
    select c.* from private.rankings_coverage_cache c
    where (select ready from cache)
      and (p_distance is null or c.distance_slug = p_distance)
      and (p_edition_id is null or c.edition_id = p_edition_id)
      and (p_sex is null or c.sex = p_sex)
    union all
    select c.* from private.rankings_live_coverage c
    where not (select ready from cache)
      and (p_distance is null or c.distance_slug = p_distance)
      and (p_edition_id is null or c.edition_id = p_edition_id)
      and (p_sex is null or c.sex = p_sex)
  )
  select coalesce(
    jsonb_agg(to_jsonb(r) order by r.edition_year desc, r.event_name, r.sex),
    '[]'::jsonb
  )
  from rows r;
$$;
revoke all on function public.rankings_coverage(text, bigint, text) from public;
grant execute on function public.rankings_coverage(text, bigint, text) to anon, authenticated, service_role;

-- Fast replay page: check source display_allowed once in course CTE and paginate
-- performances via index scan BEFORE joining source_records or performance_split_times.
create or replace function public.rankings_replay_page(
  p_edition_id bigint,
  p_distance text,
  p_sex text,
  p_clock text,
  p_ids bigint[] default null,
  p_after bigint default 0,
  p_include_wheelchair boolean default false
) returns jsonb language sql stable security definer set search_path = '' as $$
  with course as materialized (
    select c.*
    from public.rankings_replay_courses c
    join public.event_editions ed on ed.id = c.event_edition_id
    join public.events e on e.id = ed.event_id
    join public.sources s on s.id = e.source_id
    where c.event_edition_id = p_edition_id
      and c.distance_slug = p_distance
      and c.display_allowed
      and s.display_allowed
      and ed.publication_state in ('published', 'frozen')
  ), field_distance_m as (
    select case p_distance
      when '5k' then 5000::numeric
      when '10k' then 10000::numeric
      when 'half_marathon' then 21097.5::numeric
      when 'marathon' then 42195::numeric
      else null::numeric
    end as metres
  ), raw_ids as materialized (
    select
      p.id,
      p.source_record_id,
      p.event_edition_id,
      p.distance_slug,
      p.athlete_name,
      p.source_url,
      p.start_at,
      p.chip_time_ms,
      p.gun_time_ms,
      p.updated_at
    from public.performances p
    cross join field_distance_m fd
    where exists (select 1 from course)
      and p.event_edition_id = p_edition_id
      and p.distance_slug = p_distance
      and (p_sex = 'all' or p.sex = p_sex)
      and (p_include_wheelchair or p.competition_class = 'open')
      and p.eligible and not p.unpublished
      and fd.metres is not null
      and (
        (p_clock = 'chip' and p.chip_time_ms is not null)
        or (p_clock = 'gun' and p.gun_time_ms is not null)
      )
      and p.id > greatest(coalesce(p_after, 0), 0)
      and (p_ids is null or (cardinality(p_ids) <= 100 and p.id = any(p_ids)))
    order by p.id
    limit 1001
  ), page_ids as materialized (
    select * from raw_ids order by id limit 1000
  ), page_meta as (
    select max(id) as max_id from page_ids
  ), has_more as (
    select exists(select 1 from raw_ids where id > (select max_id from page_meta)) as more
  ), runners as (
    select
      p.id,
      p.athlete_name as name,
      coalesce(t.start_at, p.start_at) as "startAt",
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
    from page_ids p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s2 on s2.id = sr.source_id and s2.display_allowed
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
    'totalAvailable', (
      select count(*)::int
      from public.performances p
      cross join field_distance_m fd
      where p.event_edition_id = p_edition_id
        and p.distance_slug = p_distance
        and (p_sex = 'all' or p.sex = p_sex)
        and (p_include_wheelchair or p.competition_class = 'open')
        and p.eligible and not p.unpublished
        and fd.metres is not null
        and (
          (p_clock = 'chip' and p.chip_time_ms is not null)
          or (p_clock = 'gun' and p.gun_time_ms is not null)
        )
    ),
    'runners', coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from runners r), '[]'::jsonb),
    'next', case when (select more from has_more) then (select max_id from page_meta) else null end
  )
  from course c;
$$;

drop function if exists public.rankings_replay_compact_page(bigint, text, text, text, bigint[], bigint, integer, boolean);

create or replace function public.rankings_replay_compact_page(
  p_edition_id bigint,
  p_distance text,
  p_sex text,
  p_clock text,
  p_ids bigint[] default null,
  p_after bigint default 0,
  p_limit integer default 5000,
  p_include_wheelchair boolean default false,
  p_dedupe_checkpoints boolean default false
) returns jsonb language sql stable security definer set search_path = '' as $$
  with course as materialized (
    select c.*
    from public.rankings_replay_courses c
    join public.event_editions ed on ed.id = c.event_edition_id
    join public.events e on e.id = ed.event_id
    join public.sources s on s.id = e.source_id
    where c.event_edition_id = p_edition_id
      and c.distance_slug = p_distance
      and c.display_allowed
      and s.display_allowed
      and ed.publication_state in ('published', 'frozen')
  ), field_distance_m as (
    select case p_distance
      when '5k' then 5000::numeric
      when '10k' then 10000::numeric
      when 'half_marathon' then 21097.5::numeric
      when 'marathon' then 42195::numeric
      else null::numeric
    end as metres
  ), lim as (
    select greatest(1, least(coalesce(p_limit, 5000), 20000)) as n
  ), raw_ids as materialized (
    select
      p.id,
      p.source_record_id,
      p.event_edition_id,
      p.distance_slug,
      p.athlete_name,
      p.start_at,
      p.chip_time_ms,
      p.gun_time_ms,
      p.updated_at
    from public.performances p
    cross join field_distance_m fd
    cross join lim
    where exists (select 1 from course)
      and p.event_edition_id = p_edition_id
      and p.distance_slug = p_distance
      and (p_sex = 'all' or p.sex = p_sex)
      and (p_include_wheelchair or p.competition_class = 'open')
      and p.eligible and not p.unpublished
      and fd.metres is not null
      and (
        (p_clock = 'chip' and p.chip_time_ms is not null)
        or (p_clock = 'gun' and p.gun_time_ms is not null)
      )
      and p.id > greatest(coalesce(p_after, 0), 0)
      and (p_ids is null or (cardinality(p_ids) <= 100 and p.id = any(p_ids)))
    order by p.id
    limit (select n + 1 from lim)
  ), page_ids as materialized (
    select * from raw_ids order by id limit (select n from lim)
  ), page_meta as (
    select max(id) as max_id from page_ids
  ), has_more as (
    select exists(select 1 from raw_ids where id > (select max_id from page_meta)) as more
  ), page_rows as materialized (
    select
      p.id,
      p.athlete_name as name,
      sr.normalized_bib as bib,
      case
        when p_clock = 'chip' and coalesce(t.start_at, p.start_at) is not null
          then (extract(epoch from coalesce(t.start_at, p.start_at)) * 1000)::bigint
        else null::bigint
      end as start_ms,
      case p_clock when 'chip' then p.chip_time_ms else p.gun_time_ms end as finish_ms,
      t.checkpoint_set_id,
      cps.distances_m,
      case
        when t.performance_id is not null then to_jsonb(t.elapsed_ms)
        else jsonb_build_array(case p_clock when 'chip' then p.chip_time_ms else p.gun_time_ms end)
      end as times,
      fd.metres
    from page_ids p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s2 on s2.id = sr.source_id and s2.display_allowed
    cross join field_distance_m fd
    left join public.performance_split_times t
      on t.performance_id = p.id
      and t.performance_updated_at = p.updated_at
      and t.clock = p_clock
    left join public.race_checkpoint_sets cps
      on cps.id = t.checkpoint_set_id
      and cps.event_edition_id = p.event_edition_id
      and cps.distance_slug = p.distance_slug
  ), cp_sets as (
    select coalesce(
      jsonb_object_agg(s.checkpoint_set_id::text, to_jsonb(s.distances_m)),
      '{}'::jsonb
    ) as sets_map
    from (
      select distinct checkpoint_set_id, distances_m
      from page_rows
      where checkpoint_set_id is not null and distances_m is not null
    ) s
  )
  select jsonb_build_object(
    'version', md5(c.points::text || extract(epoch from c.reviewed_at)::text),
    'clock', p_clock,
    'course', case when coalesce(p_after, 0) = 0 then
      jsonb_build_object('points', c.points, 'sourceUrl', c.source_url, 'attribution', c.attribution)
      else null end,
    'totalAvailable', case when coalesce(p_after, 0) = 0 then (
      select count(*)::int
      from public.performances p
      where p.event_edition_id = p_edition_id
        and p.distance_slug = p_distance
        and (p_sex = 'all' or p.sex = p_sex)
        and (p_include_wheelchair or p.competition_class = 'open')
        and p.eligible and not p.unpublished
        and (
          (p_clock = 'chip' and p.chip_time_ms is not null)
          or (p_clock = 'gun' and p.gun_time_ms is not null)
        )
    ) else null end,
    'checkpointSets', case when p_dedupe_checkpoints then (select sets_map from cp_sets) else null end,
    'runners', coalesce(
      (
        select jsonb_agg(
          jsonb_build_array(
            r.id,
            r.name,
            r.bib,
            r.start_ms,
            r.finish_ms,
            case
              when p_dedupe_checkpoints then
                case when r.checkpoint_set_id is not null then to_jsonb(r.checkpoint_set_id::text) else null::jsonb end
              else
                case when r.distances_m is not null then to_jsonb(r.distances_m) else jsonb_build_array(r.metres) end
            end,
            r.times
          )
          order by r.id
        )
        from page_rows r
      ),
      '[]'::jsonb
    ),
    'next', case when (select more from has_more) then (select max_id from page_meta) else null end
  )
  from course c;
$$;

revoke all on function public.rankings_replay_compact_page(bigint, text, text, text, bigint[], bigint, integer, boolean, boolean) from public;
grant execute on function public.rankings_replay_compact_page(bigint, text, text, text, bigint[], bigint, integer, boolean, boolean) to anon, authenticated, service_role;
