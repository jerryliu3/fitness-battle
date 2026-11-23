-- Additive performance optimizations for race replay previews and compact keyset streaming.

create index if not exists performances_public_replay_id_idx
  on public.performances (event_edition_id, distance_slug, id)
  where eligible and not unpublished;

create or replace function public.rankings_replay_course_previews()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'edition_id', c.event_edition_id,
        'distance_slug', c.distance_slug,
        'points', c.points
      )
    ),
    '[]'::jsonb
  )
  from public.rankings_replay_courses c
  join public.event_editions ed on ed.id = c.event_edition_id
  where c.display_allowed
    and ed.publication_state in ('published', 'frozen');
$$;

revoke all on function public.rankings_replay_course_previews() from public;
grant execute on function public.rankings_replay_course_previews() to anon, authenticated, service_role;

create or replace function public.rankings_replay_compact_page(
  p_edition_id bigint,
  p_distance text,
  p_sex text,
  p_clock text,
  p_ids bigint[] default null,
  p_after bigint default 0,
  p_limit integer default 5000
) returns jsonb language sql stable security definer set search_path = '' as $$
  with course as materialized (
    select c.*
    from public.rankings_replay_courses c
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
  ), lim as (
    select greatest(1, least(coalesce(p_limit, 5000), 10000)) as n
  ), raw_page as materialized (
    select
      p.id,
      p.athlete_name as name,
      sr.normalized_bib as bib,
      case
        when p_clock = 'chip' then (extract(epoch from coalesce(t.start_at, ed.starts_on::timestamptz)) * 1000)::bigint
        else null::bigint
      end as start_ms,
      case p_clock when 'chip' then p.chip_time_ms else p.gun_time_ms end as finish_ms,
      case
        when t.performance_id is not null then to_jsonb(cps.distances_m)
        else jsonb_build_array(fd.metres)
      end as dists,
      case
        when t.performance_id is not null then to_jsonb(t.elapsed_ms)
        else jsonb_build_array(case p_clock when 'chip' then p.chip_time_ms else p.gun_time_ms end)
      end as times
    from public.performances p
    join public.source_records sr on sr.id = p.source_record_id
    join public.sources s on s.id = sr.source_id
    join public.event_editions ed on ed.id = p.event_edition_id
    cross join field_distance_m fd
    cross join lim
    left join public.performance_split_times t
      on t.performance_id = p.id
      and t.performance_updated_at = p.updated_at
      and t.clock = p_clock
    left join public.race_checkpoint_sets cps
      on cps.id = t.checkpoint_set_id
      and cps.event_edition_id = p.event_edition_id
      and cps.distance_slug = p.distance_slug
    where exists (select 1 from course)
      and p.event_edition_id = p_edition_id
      and p.distance_slug = p_distance
      and (p_sex = 'all' or p.sex = p_sex)
      and p.eligible and not p.unpublished and s.display_allowed
      and ed.publication_state in ('published', 'frozen')
      and fd.metres is not null
      and (
        (p_clock = 'chip' and p.chip_time_ms is not null)
        or (p_clock = 'gun' and p.gun_time_ms is not null)
      )
      and p.id > greatest(coalesce(p_after, 0), 0)
      and (p_ids is null or (cardinality(p_ids) <= 100 and p.id = any(p_ids)))
    order by p.id
    limit (select n + 1 from lim)
  ), page_rows as materialized (
    select * from raw_page order by id limit (select n from lim)
  ), page_meta as (
    select
      count(*)::int as cnt,
      max(id) as max_id
    from page_rows
  ), has_more as (
    select exists(select 1 from raw_page where id > (select max_id from page_meta)) as more
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
      join public.source_records sr on sr.id = p.source_record_id
      join public.sources s on s.id = sr.source_id
      join public.event_editions ed on ed.id = p.event_edition_id
      where p.event_edition_id = p_edition_id
        and p.distance_slug = p_distance
        and (p_sex = 'all' or p.sex = p_sex)
        and p.eligible and not p.unpublished and s.display_allowed
        and ed.publication_state in ('published', 'frozen')
        and (
          (p_clock = 'chip' and p.chip_time_ms is not null)
          or (p_clock = 'gun' and p.gun_time_ms is not null)
        )
    ) else null end,
    'runners', coalesce(
      (
        select jsonb_agg(
          jsonb_build_array(r.id, r.name, r.bib, r.start_ms, r.finish_ms, r.dists, r.times)
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

revoke all on function public.rankings_replay_compact_page(bigint, text, text, text, bigint[], bigint, integer) from public;
grant execute on function public.rankings_replay_compact_page(bigint, text, text, text, bigint[], bigint, integer) to anon, authenticated, service_role;
