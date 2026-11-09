-- Result context is scoped to this edition and recorded source category.
create or replace function public.rankings_result(p_id bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  with selected as (
    select p.*, ed.name as event_name, ed.edition_year, s.attribution,
      sr.normalized_bib as bib
    from public.performances p
    join public.source_records sr on sr.id=p.source_record_id
    join public.sources s on s.id=sr.source_id
    join public.event_editions ed on ed.id=p.event_edition_id
    where p.id=p_id and p.eligible and not p.unpublished and s.display_allowed
  ), field as materialized (
    select p.id,p.athlete_name,p.rank_time_ms
    from public.performances p
    join public.source_records sr on sr.id=p.source_record_id
    join public.sources s on s.id=sr.source_id
    join selected r on r.event_edition_id=p.event_edition_id
      and r.distance_slug=p.distance_slug and r.sex=p.sex
    where p.eligible and not p.unpublished and s.display_allowed
  ), stats as (
    select count(*) as total, count(*) filter(where f.rank_time_ms < r.rank_time_ms) + 1 as place,
      count(*) filter(where f.rank_time_ms > r.rank_time_ms) as slower,
      percentile_cont(0.5) within group(order by f.rank_time_ms) as median_ms,
      min(f.rank_time_ms) as minimum_ms,
      greatest(1000,ceil((max(f.rank_time_ms)-min(f.rank_time_ms))/40.0)::bigint) as width_ms
    from field f cross join selected r
  ), bins as (
    select floor((f.rank_time_ms-s.minimum_ms)/s.width_ms)::integer as bucket, count(*) as count
    from field f cross join stats s group by 1
  ), neighbors as (
    (select f.* from field f cross join selected r
      where (f.rank_time_ms,f.id) < (r.rank_time_ms,r.id)
      order by f.rank_time_ms desc,f.id desc limit 3)
    union all
    (select f.* from field f cross join selected r
      where (f.rank_time_ms,f.id) > (r.rank_time_ms,r.id)
      order by f.rank_time_ms,f.id limit 3)
  )
  select jsonb_build_object('result',to_jsonb(r),'total',s.total,'place',s.place,
    'slower',s.slower,'medianMs',s.median_ms,'minimumMs',s.minimum_ms,'binWidthMs',s.width_ms,
    'bins',coalesce((select jsonb_agg(to_jsonb(b) order by b.bucket) from bins b),'[]'::jsonb),
    'neighbors',coalesce((select jsonb_agg(to_jsonb(n) order by n.rank_time_ms,n.id) from neighbors n),'[]'::jsonb))
  from selected r cross join stats s;
$$;
revoke all on function public.rankings_result(bigint) from public;
grant execute on function public.rankings_result(bigint) to anon,authenticated,service_role;
