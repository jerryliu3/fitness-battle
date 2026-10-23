-- One membership-scoped read for Home previews and the future Crew feed.
-- Only public activity summary fields cross the membership boundary.
create function public.crew_activity_reads(
  p_crew_id uuid default null,
  p_since timestamptz default null,
  p_before timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 50,
  p_latest_per_member boolean default false
)
returns table (
  activity_id uuid, user_id uuid, display_name text, avatar_url text,
  sport text, started_at timestamptz, distance_m numeric, moving_sec numeric,
  verified boolean, source text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_crew_id is not null and not private.is_active_crew_member(p_crew_id) then
    raise exception 'not_a_member';
  end if;
  return query
    with members as (
      select distinct peer.user_id
      from public.crew_members viewer
      join public.crew_members peer on peer.crew_id = viewer.crew_id
      where viewer.user_id = (select auth.uid()) and viewer.status = 'active'
        and peer.status = 'active'
        and (p_crew_id is null or viewer.crew_id = p_crew_id)
    )
    select a.id, m.user_id, p.display_name, p.avatar_url, a.sport, a.started_at,
      coalesce(a.distance_m, 0), coalesce(a.moving_sec, 0), a.verified,
      coalesce(a.source_label, a.provider::text)
    from members m
    join public.profiles p on p.id = m.user_id
    cross join lateral (
      select activity.* from public.activities activity
      where activity.user_id = m.user_id
        and activity.sport in ('running', 'cycling', 'walking', 'strength')
        and activity.started_at <= statement_timestamp()
        and (p_since is null or activity.started_at >= p_since)
        and (p_before is null or activity.started_at < p_before
          or (activity.started_at = p_before and p_before_id is not null and activity.id < p_before_id))
        and activity.disposition = 'counted' and activity.provenance <> 'demo'
        and coalesce(activity.source_label, activity.provider::text) <> 'history'
        and coalesce(activity.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
      order by activity.started_at desc, activity.id desc
      limit case when coalesce(p_latest_per_member, false) then 1 else greatest(1, least(coalesce(p_limit, 50), 100)) end
    ) a
    order by a.started_at desc, a.id desc
    limit greatest(1, least(coalesce(p_limit, 50), 100));
end;
$$;
revoke all on function public.crew_activity_reads(uuid,timestamptz,timestamptz,uuid,integer,boolean) from public, anon;
grant execute on function public.crew_activity_reads(uuid,timestamptz,timestamptz,uuid,integer,boolean) to authenticated;
