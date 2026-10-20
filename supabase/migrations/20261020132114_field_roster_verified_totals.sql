-- Extend the read-only roster result; preserve membership authorization.
-- No CASCADE: unexpected dependencies must fail rather than disappear.
drop function public.week_field_roster(uuid);
create or replace function public.week_field_roster(p_field_id uuid)
returns table (
  user_id uuid,
  display_name text,
  open_elo numeric,
  distance_m numeric,
  moving_sec numeric,
  verified_elo numeric,
  verified_distance_m numeric,
  verified_moving_sec numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  field_rec public.week_fields;
begin
  if uid is null then
    raise exception 'authentication_required';
  end if;

  select * into field_rec from public.week_fields where id = p_field_id;
  if field_rec.id is null then
    raise exception 'field_not_found';
  end if;
  if not (uid = any(field_rec.member_ids)) then
    raise exception 'not_in_field';
  end if;
  if field_rec.crew_id is not null
     and not private.is_active_crew_member(field_rec.crew_id) then
    raise exception 'not_a_crew_member';
  end if;

  return query
  select
    p.id,
    coalesce(cm.display_name, p.display_name),
    coalesce(r.open_elo, 1000)::numeric,
    coalesce(sum(a.distance_m), 0)::numeric,
    coalesce(sum(a.moving_sec), 0)::numeric,
    coalesce(r.verified_elo, 1000)::numeric,
    coalesce(sum(a.distance_m) filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling', 'walking')), 0)::numeric,
    coalesce(sum(a.moving_sec) filter (where a.verified and a.provenance = 'recorded' and field_rec.sport in ('running', 'cycling', 'walking')), 0)::numeric
  from unnest(field_rec.member_ids) as m(id)
  join public.profiles p on p.id = m.id
  left join public.sport_ratings r
    on r.user_id = m.id and r.sport = field_rec.sport
  left join public.crew_members cm
    on cm.crew_id = field_rec.crew_id and cm.user_id = m.id
  left join lateral (
    select activity.distance_m, activity.moving_sec, activity.verified, activity.provenance
    from public.activities activity
    where activity.user_id = m.id
      and activity.disposition = 'counted'
      and activity.provenance <> 'demo'
      and coalesce(activity.source_label, activity.provider::text) <> 'history'
      and coalesce(activity.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
      and activity.sport = field_rec.sport
      and activity.started_at >= field_rec.wave_start
      and activity.started_at < field_rec.week_end
      and activity.started_at <= statement_timestamp()
  ) a on true
  where field_rec.crew_id is null or cm.status = 'active'
  group by p.id, cm.display_name, p.display_name, r.open_elo, r.verified_elo
  order by p.id;
end;
$$;

revoke all on function public.week_field_roster(uuid) from public, anon;
grant execute on function public.week_field_roster(uuid) to authenticated;

