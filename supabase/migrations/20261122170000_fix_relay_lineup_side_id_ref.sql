-- Fix PL/pgSQL variable qualification in special_event_relay_lineup (side_id -> v_side_id)
create or replace function public.special_event_relay_lineup(p_edition_id uuid, p_crew_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  now_at timestamptz := clock_timestamp();
  today_et date := (now_at at time zone 'America/New_York')::date;
  edition public.special_event_editions;
  v_side_id uuid; start_day date; end_day date;
  roster_json jsonb; legs_json jsonb;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if not exists (select 1 from public.crew_members where crew_id = p_crew_id and user_id = uid and status = 'active') then
    raise exception 'not_a_crew_member';
  end if;

  select * into edition from public.special_event_editions
  where id = p_edition_id and published = true and (not demo_only or private.is_demo_athlete(uid));
  if edition.id is null then raise exception 'edition_not_found'; end if;
  if edition.starts_at <= now_at and edition.finalized_at is null then
    perform private.finalize_special_event(edition.id, false);
    select * into edition from public.special_event_editions where id = edition.id;
  end if;

  select id into v_side_id from public.special_event_sides where edition_id = edition.id and crew_id = p_crew_id limit 1;
  start_day := (edition.starts_at at time zone 'America/New_York')::date;
  end_day := ((edition.ends_at - interval '1 second') at time zone 'America/New_York')::date;

  select coalesce(jsonb_agg(jsonb_build_object('userId', r.user_id, 'displayName', r.display_name, 'optedIn', r.opted_in) order by r.opted_in desc, r.display_name), '[]'::jsonb)
  into roster_json
  from (
    select cm.user_id, coalesce(nullif(trim(cm.display_name), ''), p.display_name, 'Athlete') as display_name,
      exists (
        select 1 from public.special_event_entries e
        where e.edition_id = edition.id and e.user_id = cm.user_id and e.status <> 'cancelled'
          and (e.side_id = v_side_id or (edition.finalized_at is null and e.requested_crew_id = p_crew_id))
      ) as opted_in
    from public.crew_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.crew_id = p_crew_id and cm.status = 'active'
      and (edition.finalized_at is null or exists (
        select 1 from public.special_event_entries e
        where e.edition_id = edition.id and e.side_id = v_side_id and e.user_id = cm.user_id and e.status in ('active', 'completed', 'eliminated')
      ))
  ) r;

  if edition.finalized_at is null and coalesce(edition.config->'scoring'->>'assignmentMode', 'manual') = 'random' then
    legs_json := '[]'::jsonb;
  else
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'legDay', l.leg_day, 'slotIndex', l.slot_index, 'userId', l.user_id,
        'displayName', coalesce(nullif(trim(cm.display_name), ''), p.display_name, 'Athlete'),
        'isYou', l.user_id = uid, 'isToday', l.leg_day = today_et, 'locked', l.locked_at is not null,
        'score', case when edition.finalized_at is null then 0 else private.special_event_member_volume(
          edition.sport, l.user_id,
          greatest(edition.starts_at, (l.leg_day::timestamp at time zone 'America/New_York')),
          least(edition.ends_at, ((l.leg_day + 1)::timestamp at time zone 'America/New_York')),
          null
        ) end
      ) order by l.leg_day asc, l.slot_index asc
    ), '[]'::jsonb)
    into legs_json
    from public.special_event_relay_legs l
    join public.profiles p on p.id = l.user_id
    left join public.crew_members cm on cm.crew_id = p_crew_id and cm.user_id = l.user_id
    where l.side_id = v_side_id;
  end if;

  return jsonb_build_object(
    'editionId', edition.id, 'crewId', p_crew_id, 'sideId', v_side_id,
    'startDay', start_day, 'endDay', end_day, 'todayDay', today_et,
    'legsPerDay', least(2, greatest(1, coalesce((edition.config->'scoring'->>'legsPerDay')::integer, 1))),
    'assignmentMode', coalesce(edition.config->'scoring'->>'assignmentMode', 'manual'),
    'lockPolicy', coalesce(edition.config->'scoring'->>'lockPolicy', 'full_week'),
    'maxLegsPerMember', nullif(edition.config->'scoring'->>'maxLegsPerMember', '')::integer,
    'finalized', edition.finalized_at is not null,
    'roster', roster_json, 'legs', legs_json
  );
end; $$;
revoke all on function public.special_event_relay_lineup(uuid, uuid) from public, anon;
grant execute on function public.special_event_relay_lineup(uuid, uuid) to authenticated;
