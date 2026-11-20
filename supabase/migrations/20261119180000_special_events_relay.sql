-- Special events PR 3: Crew Relay finalization (manual locked & random draw),
-- daily baton schedule RPCs, and crew-scoped baton lineup reader.

create or replace function private.assign_relay_legs(p_side_id uuid, p_edition public.special_event_editions)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  now_at timestamptz := clock_timestamp();
  today_et date := (now_at at time zone 'America/New_York')::date;
  start_day date := (p_edition.starts_at at time zone 'America/New_York')::date;
  end_day date := ((p_edition.ends_at - interval '1 second') at time zone 'America/New_York')::date;
  legs_per_day integer := least(2, greatest(1, coalesce((p_edition.config->'scoring'->>'legsPerDay')::integer, 1)));
  assignment_mode text := coalesce(p_edition.config->'scoring'->>'assignmentMode', 'manual');
  lock_policy text := coalesce(p_edition.config->'scoring'->>'lockPolicy', 'full_week');
  roster uuid[];
  roster_len integer;
  day_cursor date;
  slot_idx integer;
  picked uuid;
begin
  select coalesce(
    array_agg(e.user_id order by md5(p_edition.id::text || p_side_id::text || e.user_id::text)),
    '{}'::uuid[]
  )
  into roster
  from public.special_event_entries e
  where e.edition_id = p_edition.id and e.side_id = p_side_id and e.status = 'active';

  roster_len := coalesce(cardinality(roster), 0);
  if roster_len = 0 then return; end if;

  -- Drop draft legs for random mode or for anyone who did not end up on the frozen roster.
  if assignment_mode = 'random' then
    delete from public.special_event_relay_legs where side_id = p_side_id;
  else
    delete from public.special_event_relay_legs
    where side_id = p_side_id
      and (not (user_id = any(roster)) or leg_day < start_day or leg_day > end_day or slot_index > legs_per_day);
  end if;

  -- Fill every empty (leg_day, slot_index) with the least-assigned eligible teammate (balances around manual picks).
  day_cursor := start_day;
  while day_cursor <= end_day loop
    for slot_idx in 1..least(legs_per_day, roster_len) loop
      if exists (
        select 1 from public.special_event_relay_legs
        where side_id = p_side_id and leg_day = day_cursor and slot_index = slot_idx
      ) then
        continue;
      end if;

      select m.uid into picked
      from unnest(roster) as m(uid)
      where not exists (
        select 1 from public.special_event_relay_legs l
        where l.side_id = p_side_id and l.leg_day = day_cursor and l.user_id = m.uid
      )
      order by (
        select count(*) from public.special_event_relay_legs l
        where l.side_id = p_side_id and l.user_id = m.uid
      ) asc, md5(p_edition.id::text || day_cursor::text || slot_idx::text || m.uid::text)
      limit 1;

      if picked is not null then
        insert into public.special_event_relay_legs(side_id, leg_day, slot_index, user_id, locked_at)
        values (
          p_side_id, day_cursor, slot_idx, picked,
          case when lock_policy = 'full_week' or day_cursor <= today_et then now_at else null end
        )
        on conflict do nothing;
      end if;
    end loop;
    day_cursor := day_cursor + 1;
  end loop;

  update public.special_event_relay_legs
  set locked_at = coalesce(locked_at, now_at)
  where side_id = p_side_id and (lock_policy = 'full_week' or leg_day <= today_et);
end;
$$;
revoke all on function private.assign_relay_legs(uuid, public.special_event_editions) from public, anon, authenticated;

-- Extend finalize_special_event to support grouping.kind = 'crew' alongside 'solo'.
create or replace function private.finalize_special_event(p_edition_id uuid, p_force boolean default false)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  edition public.special_event_editions;
  now_at timestamptz := clock_timestamp();
  grouping_kind text;
  min_roster integer;
  max_roster integer;
  ent record;
  crew_rec record;
  new_side_id uuid;
  side_ids uuid[] := '{}'::uuid[];
  seated_entries uuid[];
  first_heat_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('special-event:' || p_edition_id::text, 71001));
  select * into edition from public.special_event_editions where id = p_edition_id;
  if edition.id is null or edition.finalized_at is not null then return false; end if;
  if not p_force and edition.starts_at > now_at then return false; end if;

  grouping_kind := coalesce(edition.config->'grouping'->>'kind', 'solo');

  if grouping_kind = 'solo' then
    for ent in
      select e.id as entry_id, e.entry_rating, coalesce(nullif(trim(p.display_name), ''), 'Athlete') as display_name
      from public.special_event_entries e
      join public.profiles p on p.id = e.user_id
      where e.edition_id = edition.id and e.status = 'registered'
      order by e.entry_rating desc, e.registered_at asc, e.user_id
    loop
      insert into public.special_event_sides(edition_id, side_kind, display_name, entry_rating, roster_locked_at)
      values (edition.id, 'solo', ent.display_name, ent.entry_rating, now_at)
      returning id into new_side_id;
      update public.special_event_entries set side_id = new_side_id, status = 'active' where id = ent.entry_id;
      side_ids := side_ids || new_side_id;
    end loop;

    perform private.seed_special_event_rounds(edition, side_ids);
    return true;
  end if;

  if grouping_kind = 'crew' then
    min_roster := greatest(2, coalesce((edition.config->'grouping'->>'minRoster')::integer, 2));
    max_roster := greatest(min_roster, coalesce((edition.config->'grouping'->>'maxRoster')::integer, 8));

    for crew_rec in
      select e.requested_crew_id as crew_id, c.name as crew_name,
        avg(e.entry_rating) as avg_rating,
        array_agg(e.id order by e.registered_at asc, e.user_id) as entry_ids
      from public.special_event_entries e
      join public.crews c on c.id = e.requested_crew_id
      join public.crew_members cm on cm.crew_id = e.requested_crew_id and cm.user_id = e.user_id and cm.status = 'active'
      where e.edition_id = edition.id and e.status = 'registered'
      group by e.requested_crew_id, c.name
      having count(*) >= min_roster
      order by avg(e.entry_rating) desc, min(e.registered_at) asc, e.requested_crew_id
    loop
      -- Reuse any pre-start draft side (which may already hold manual relay leg picks).
      select id into new_side_id from public.special_event_sides
      where edition_id = edition.id and crew_id = crew_rec.crew_id limit 1;

      if new_side_id is null then
        insert into public.special_event_sides(edition_id, side_kind, crew_id, display_name, entry_rating, roster_locked_at)
        values (edition.id, 'crew', crew_rec.crew_id, crew_rec.crew_name, coalesce(crew_rec.avg_rating, 0), now_at)
        returning id into new_side_id;
      else
        update public.special_event_sides
        set display_name = crew_rec.crew_name, entry_rating = coalesce(crew_rec.avg_rating, 0), roster_locked_at = now_at
        where id = new_side_id;
      end if;

      seated_entries := crew_rec.entry_ids[1 : least(cardinality(crew_rec.entry_ids), max_roster)];
      update public.special_event_entries set side_id = new_side_id, status = 'active' where id = any(seated_entries);

      if coalesce(edition.config->'scoring'->>'mode', 'total_volume') = 'relay_handoff' then
        perform private.assign_relay_legs(new_side_id, edition);
      end if;
      side_ids := side_ids || new_side_id;
    end loop;

    -- Clean up any unlocked draft sides for crews that did not meet minRoster.
    delete from public.special_event_sides where edition_id = edition.id and roster_locked_at is null;

    perform private.seed_special_event_rounds(edition, side_ids);

    -- Unseated crew registrants watch their crew's heat when seated, else Heat 1 (or completed if edition settled).
    select h.id into first_heat_id
    from public.special_event_heats h
    join public.special_event_rounds r on r.id = h.round_id
    where r.edition_id = edition.id and r.round_number = 1
    order by h.heat_index asc limit 1;

    update public.special_event_entries e
    set status = case when first_heat_id is not null then 'spectating' else 'completed' end,
        side_id = null,
        spectate_heat_id = case when first_heat_id is null then null else coalesce((
          select h.id from public.special_event_heats h
          join public.special_event_rounds r on r.id = h.round_id
          join public.special_event_sides s on s.id = any(h.side_ids)
          where r.edition_id = edition.id and r.round_number = 1 and s.crew_id = e.requested_crew_id
          limit 1
        ), first_heat_id) end
    where e.edition_id = edition.id and e.status = 'registered';

    return true;
  end if;

  return false;
end;
$$;
revoke all on function private.finalize_special_event(uuid, boolean) from public, anon, authenticated;

-- Save manual relay legs (pre-start draft or unlocked future days under pre_day lockPolicy).
create function public.set_special_event_relay_legs(p_edition_id uuid, p_crew_id uuid, p_legs jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  now_at timestamptz := clock_timestamp();
  today_et date := (now_at at time zone 'America/New_York')::date;
  edition public.special_event_editions;
  crew_name text;
  side_id uuid;
  start_day date;
  end_day date;
  legs_per_day integer;
  assignment_mode text;
  lock_policy text;
  max_legs integer;
  leg jsonb;
  l_day date;
  l_slot integer;
  l_user uuid;
  over_cap boolean;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if not exists (select 1 from public.crew_members where crew_id = p_crew_id and user_id = uid and status = 'active') then
    raise exception 'not_a_crew_member';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('special-event:' || p_edition_id::text, 71001));
  select * into edition from public.special_event_editions where id = p_edition_id and published = true;
  if edition.id is null then raise exception 'edition_not_found'; end if;
  if coalesce(edition.config->'scoring'->>'mode', 'total_volume') <> 'relay_handoff' then
    raise exception 'not_a_relay';
  end if;

  assignment_mode := coalesce(edition.config->'scoring'->>'assignmentMode', 'manual');
  if assignment_mode <> 'manual' then raise exception 'relay_random_locked'; end if;

  lock_policy := coalesce(edition.config->'scoring'->>'lockPolicy', 'full_week');
  if (edition.finalized_at is not null or now_at >= edition.starts_at) and lock_policy = 'full_week' then
    raise exception 'relay_lineup_locked';
  end if;

  legs_per_day := least(2, greatest(1, coalesce((edition.config->'scoring'->>'legsPerDay')::integer, 1)));
  max_legs := nullif(edition.config->'scoring'->>'maxLegsPerMember', '')::integer;
  start_day := (edition.starts_at at time zone 'America/New_York')::date;
  end_day := ((edition.ends_at - interval '1 second') at time zone 'America/New_York')::date;

  select name into crew_name from public.crews where id = p_crew_id;
  select id into side_id from public.special_event_sides where edition_id = edition.id and crew_id = p_crew_id limit 1;
  if side_id is null then
    if edition.finalized_at is not null then raise exception 'crew_not_in_edition'; end if;
    insert into public.special_event_sides(edition_id, side_kind, crew_id, display_name)
    values (edition.id, 'crew', p_crew_id, coalesce(crew_name, 'Crew'))
    returning id into side_id;
  end if;

  if jsonb_typeof(coalesce(p_legs, '[]'::jsonb)) <> 'array' then raise exception 'invalid_legs'; end if;

  delete from public.special_event_relay_legs
  where side_id = set_special_event_relay_legs.side_id
    and locked_at is null
    and (edition.finalized_at is null or leg_day > today_et);

  for leg in select value from jsonb_array_elements(coalesce(p_legs, '[]'::jsonb)) loop
    l_day := (leg->>'legDay')::date;
    l_slot := coalesce((leg->>'slotIndex')::integer, 1);
    l_user := (leg->>'userId')::uuid;

    if l_day < start_day or l_day > end_day or l_slot < 1 or l_slot > legs_per_day then
      raise exception 'invalid_leg_slot';
    end if;
    if (edition.finalized_at is not null or now_at >= edition.starts_at) and l_day <= today_et then
      raise exception 'relay_day_locked';
    end if;
    if edition.finalized_at is not null then
      if not exists (select 1 from public.special_event_entries where edition_id = edition.id and side_id = set_special_event_relay_legs.side_id and user_id = l_user and status = 'active') then
        raise exception 'member_not_on_roster';
      end if;
    elsif not exists (select 1 from public.crew_members where crew_id = p_crew_id and user_id = l_user and status = 'active') then
      raise exception 'member_not_on_roster';
    end if;

    insert into public.special_event_relay_legs(side_id, leg_day, slot_index, user_id, assigned_by)
    values (side_id, l_day, l_slot, l_user, uid)
    on conflict (side_id, leg_day, slot_index) do update
      set user_id = excluded.user_id, assigned_by = excluded.assigned_by
      where public.special_event_relay_legs.locked_at is null;
  end loop;

  if max_legs is not null then
    select exists (
      select 1 from public.special_event_relay_legs
      where side_id = set_special_event_relay_legs.side_id
      group by user_id having count(*) > max_legs
    ) into over_cap;
    if over_cap then raise exception 'relay_max_legs_exceeded'; end if;
  end if;

  return jsonb_build_object('sideId', side_id, 'saved', true);
end;
$$;
revoke all on function public.set_special_event_relay_legs(uuid, uuid, jsonb) from public, anon;
grant execute on function public.set_special_event_relay_legs(uuid, uuid, jsonb) to authenticated;

-- Read own crew's relay lineup (draft pre-start or locked/live with per-day leg volume).
create function public.special_event_relay_lineup(p_edition_id uuid, p_crew_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  now_at timestamptz := clock_timestamp();
  today_et date := (now_at at time zone 'America/New_York')::date;
  edition public.special_event_editions;
  side_id uuid;
  start_day date;
  end_day date;
  roster_json jsonb;
  legs_json jsonb;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if not exists (select 1 from public.crew_members where crew_id = p_crew_id and user_id = uid and status = 'active') then
    raise exception 'not_a_crew_member';
  end if;

  select * into edition from public.special_event_editions where id = p_edition_id and published = true;
  if edition.id is null then raise exception 'edition_not_found'; end if;
  if edition.starts_at <= now_at and edition.finalized_at is null then
    perform private.finalize_special_event(edition.id, false);
    select * into edition from public.special_event_editions where id = edition.id;
  end if;

  select id into side_id from public.special_event_sides where edition_id = edition.id and crew_id = p_crew_id limit 1;
  start_day := (edition.starts_at at time zone 'America/New_York')::date;
  end_day := ((edition.ends_at - interval '1 second') at time zone 'America/New_York')::date;

  -- Before lock, list opted-in crewmates (falling back to active crew members); after lock, frozen squad.
  select coalesce(jsonb_agg(jsonb_build_object('userId', r.user_id, 'displayName', r.display_name, 'optedIn', r.opted_in) order by r.opted_in desc, r.display_name), '[]'::jsonb)
  into roster_json
  from (
    select cm.user_id, coalesce(nullif(trim(cm.display_name), ''), p.display_name, 'Athlete') as display_name,
      exists (
        select 1 from public.special_event_entries e
        where e.edition_id = edition.id and e.user_id = cm.user_id and e.status <> 'cancelled'
          and (e.side_id = special_event_relay_lineup.side_id or (edition.finalized_at is null and e.requested_crew_id = p_crew_id))
      ) as opted_in
    from public.crew_members cm
    join public.profiles p on p.id = cm.user_id
    where cm.crew_id = p_crew_id and cm.status = 'active'
      and (edition.finalized_at is null or exists (
        select 1 from public.special_event_entries e
        where e.edition_id = edition.id and e.side_id = special_event_relay_lineup.side_id and e.user_id = cm.user_id and e.status in ('active', 'completed', 'eliminated')
      ))
  ) r;

  -- Never reveal random draw before start.
  if edition.finalized_at is null and coalesce(edition.config->'scoring'->>'assignmentMode', 'manual') = 'random' then
    legs_json := '[]'::jsonb;
  else
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'legDay', l.leg_day,
        'slotIndex', l.slot_index,
        'userId', l.user_id,
        'displayName', coalesce(nullif(trim(cm.display_name), ''), p.display_name, 'Athlete'),
        'isYou', l.user_id = uid,
        'isToday', l.leg_day = today_et,
        'locked', l.locked_at is not null,
        'score', case
          when edition.finalized_at is null then 0
          when edition.sport = 'walking' then coalesce((
            select max(coalesce(d.steps, 0))::numeric from public.daily_health_readings d
            where d.user_id = l.user_id and d.day = l.leg_day and d.day <= today_et
          ), 0)
          else coalesce((
            select sum(case
              when edition.sport in ('running', 'cycling') then case when a.verified and a.provenance = 'recorded' then coalesce(a.distance_m, 0)::numeric else 0::numeric end
              else coalesce(a.moving_sec, 0)::numeric end)
            from private.competition_activity_rows(edition.sport, edition.starts_at, edition.ends_at, l.user_id) a
            where a.user_id = l.user_id and a.disposition = 'counted'
              and a.provenance not in ('demo', 'manual') and coalesce(a.journal_only, false) = false
              and coalesce(a.source_label, a.provider::text) <> 'history'
              and coalesce(a.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
              and a.started_at >= edition.starts_at and a.started_at < edition.ends_at and a.started_at <= statement_timestamp()
              and (a.started_at at time zone 'America/New_York')::date = l.leg_day
          ), 0)
        end
      ) order by l.leg_day asc, l.slot_index asc
    ), '[]'::jsonb)
    into legs_json
    from public.special_event_relay_legs l
    join public.profiles p on p.id = l.user_id
    left join public.crew_members cm on cm.crew_id = p_crew_id and cm.user_id = l.user_id
    where l.side_id = special_event_relay_lineup.side_id;
  end if;

  return jsonb_build_object(
    'editionId', edition.id,
    'crewId', p_crew_id,
    'sideId', side_id,
    'startDay', start_day,
    'endDay', end_day,
    'todayDay', today_et,
    'legsPerDay', least(2, greatest(1, coalesce((edition.config->'scoring'->>'legsPerDay')::integer, 1))),
    'assignmentMode', coalesce(edition.config->'scoring'->>'assignmentMode', 'manual'),
    'lockPolicy', coalesce(edition.config->'scoring'->>'lockPolicy', 'full_week'),
    'maxLegsPerMember', nullif(edition.config->'scoring'->>'maxLegsPerMember', '')::integer,
    'finalized', edition.finalized_at is not null,
    'roster', roster_json,
    'legs', legs_json
  );
end;
$$;
revoke all on function public.special_event_relay_lineup(uuid, uuid) from public, anon;
grant execute on function public.special_event_relay_lineup(uuid, uuid) to authenticated;
