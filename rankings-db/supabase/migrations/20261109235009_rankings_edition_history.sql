create function public.rankings_edition_history(p_edition_id bigint,p_distance text,p_sex text default 'female')
returns jsonb language sql stable security definer set search_path='' as $$
  with selected as (
    select ed.event_id from public.event_editions ed where ed.id=p_edition_id
      and exists(select 1 from public.performances p join public.source_records sr on sr.id=p.source_record_id
        join public.sources s on s.id=sr.source_id where p.event_edition_id=ed.id and p.distance_slug=p_distance
          and p.sex=p_sex and p.eligible and not p.unpublished and s.display_allowed)
  ), editions as (
    select ed.id as edition_id,ed.name as event_name,ed.edition_year,count(*) as total,
      min(p.rank_time_ms) as fastest_ms,percentile_cont(0.5) within group(order by p.rank_time_ms) as median_ms,
      count(*) filter(where p.rank_clock='chip') as chip_count,count(*) filter(where p.rank_clock='gun') as official_count
    from public.performances p join public.source_records sr on sr.id=p.source_record_id
    join public.sources s on s.id=sr.source_id join public.event_editions ed on ed.id=p.event_edition_id
    join selected on selected.event_id=ed.event_id
    where p.distance_slug=p_distance and p.sex=p_sex and p.eligible and not p.unpublished and s.display_allowed
    group by ed.id,ed.name,ed.edition_year
  ) select coalesce(jsonb_agg(to_jsonb(e) order by e.edition_year),'[]'::jsonb) from editions e;
$$;
revoke all on function public.rankings_edition_history(bigint,text,text) from public;
grant execute on function public.rankings_edition_history(bigint,text,text) to anon,authenticated,service_role;
