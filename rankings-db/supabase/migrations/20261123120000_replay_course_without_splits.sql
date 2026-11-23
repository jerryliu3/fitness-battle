-- Course map preview without checkpoint splits; flat-pacing replay for finishers lacking split rows.
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