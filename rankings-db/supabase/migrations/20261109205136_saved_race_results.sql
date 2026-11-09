-- Fetch bookmark labels with current eligibility; no full-field ranking work.
create or replace function public.rankings_saved(p_ids bigint[])
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(r) order by r.id), '[]'::jsonb) from (
    select p.id,p.athlete_name,p.distance_slug,p.rank_time_ms,p.rank_clock,
      ed.name as event_name,ed.edition_year
    from public.performances p
    join public.source_records sr on sr.id=p.source_record_id
    join public.sources s on s.id=sr.source_id
    join public.event_editions ed on ed.id=p.event_edition_id
    where p.id=any(p_ids[1:100]) and p.eligible and not p.unpublished and s.display_allowed
  ) r;
$$;
revoke all on function public.rankings_saved(bigint[]) from public;
grant execute on function public.rankings_saved(bigint[]) to anon,authenticated,service_role;
