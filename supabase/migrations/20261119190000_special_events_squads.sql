-- Special events PR 4: Profile-grouped equal-size squads (country_code, random,
-- extensible group_attr), adaptive squad sizing, spectator leftover seating,
-- and own-squad contributor breakdown in special_event_standings.

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
  group_attr text;
  target_squad integer;
  min_squad integer;
  leftover_policy text;
  min_heat integer;
  chosen_sz integer := 0;
  try_sz integer;
  full_squads integer;
  ent record;
  crew_rec record;
  grp record;
  new_side_id uuid;
  side_ids uuid[] := '{}'::uuid[];
  seated_entries uuid[];
  first_heat_id uuid;
  squad_num integer;
  squad_cnt integer;
  avg_elo numeric;
  base_label text;
  wild_entries uuid[];
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

    delete from public.special_event_sides where edition_id = edition.id and roster_locked_at is null;
    perform private.seed_special_event_rounds(edition, side_ids);

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

  if grouping_kind = 'profile_attr' then
    group_attr := coalesce(edition.config->'grouping'->>'attr', 'country_code');
    target_squad := greatest(2, coalesce((edition.config->'grouping'->>'targetSquadSize')::integer, 3));
    min_squad := greatest(2, least(target_squad, coalesce((edition.config->'grouping'->>'minSquadSize')::integer, 2)));
    leftover_policy := coalesce(edition.config->'grouping'->>'leftoverPolicy', 'spectate');
    min_heat := greatest(2, coalesce(
      (edition.config->'match'->>'minHeatSize')::integer,
      (edition.config->'match'->>'minBracketSize')::integer,
      2
    ));

    -- Pick the largest equal squad size (target -> min) that yields at least min_heat full squads.
    for try_sz in reverse target_squad..min_squad loop
      if leftover_policy = 'wildcard' then
        select floor(count(*)::numeric / try_sz)::integer into full_squads
        from public.special_event_entries e
        where e.edition_id = edition.id and e.status = 'registered';
      else
        select coalesce(sum(floor(cnt::numeric / try_sz)::integer), 0)
        into full_squads
        from (
          select coalesce(nullif(e.group_snapshot->>group_attr, ''), 'random') as gval, count(*) as cnt
          from public.special_event_entries e
          where e.edition_id = edition.id and e.status = 'registered'
          group by 1
        ) buckets;
      end if;

      if full_squads >= min_heat then
        chosen_sz := try_sz;
        exit;
      end if;
    end loop;

    if chosen_sz >= 2 then
      for grp in
        select coalesce(nullif(e.group_snapshot->>group_attr, ''), 'random') as gval,
          array_agg(e.id order by e.entry_rating desc, e.registered_at asc, e.user_id) as entry_ids
        from public.special_event_entries e
        where e.edition_id = edition.id and e.status = 'registered'
        group by 1
        order by 1
      loop
        squad_cnt := floor(cardinality(grp.entry_ids)::numeric / chosen_sz)::integer;
        base_label := case when group_attr = 'random' then 'Squad' else grp.gval end;
        for squad_num in 1..squad_cnt loop
          seated_entries := grp.entry_ids[((squad_num - 1) * chosen_sz + 1) : (squad_num * chosen_sz)];
          select coalesce(avg(entry_rating), 0) into avg_elo from public.special_event_entries where id = any(seated_entries);

          insert into public.special_event_sides(edition_id, side_kind, group_attr, group_value, display_name, entry_rating, roster_locked_at)
          values (
            edition.id, 'profile_group', group_attr, grp.gval,
            case when squad_cnt > 1 or group_attr = 'random' then base_label || ' #' || squad_num::text else base_label end,
            avg_elo, now_at
          )
          returning id into new_side_id;

          update public.special_event_entries set side_id = new_side_id, status = 'active' where id = any(seated_entries);
          if coalesce(edition.config->'scoring'->>'mode', 'total_volume') = 'relay_handoff' then
            perform private.assign_relay_legs(new_side_id, edition);
          end if;
        end loop;
      end loop;

      -- Optional wildcard pooling for leftover athletes when leftoverPolicy = 'wildcard'.
      if leftover_policy = 'wildcard' then
        select coalesce(array_agg(id order by entry_rating desc, registered_at asc, user_id), '{}'::uuid[])
        into wild_entries
        from public.special_event_entries
        where edition_id = edition.id and status = 'registered';

        squad_cnt := floor(coalesce(cardinality(wild_entries), 0)::numeric / chosen_sz)::integer;
        for squad_num in 1..squad_cnt loop
          seated_entries := wild_entries[((squad_num - 1) * chosen_sz + 1) : (squad_num * chosen_sz)];
          select coalesce(avg(entry_rating), 0) into avg_elo from public.special_event_entries where id = any(seated_entries);
          insert into public.special_event_sides(edition_id, side_kind, group_attr, group_value, display_name, entry_rating, roster_locked_at)
          values (edition.id, 'profile_group', 'wildcard', 'wildcard', 'Wildcard #' || squad_num::text, avg_elo, now_at)
          returning id into new_side_id;
          update public.special_event_entries set side_id = new_side_id, status = 'active' where id = any(seated_entries);
          if coalesce(edition.config->'scoring'->>'mode', 'total_volume') = 'relay_handoff' then
            perform private.assign_relay_legs(new_side_id, edition);
          end if;
        end loop;
      end if;

      -- Order all created squads by average entry_rating so rating-matched heats stay balanced.
      select coalesce(array_agg(id order by entry_rating desc, created_at asc, id), '{}'::uuid[])
      into side_ids
      from public.special_event_sides
      where edition_id = edition.id and roster_locked_at is not null;
    end if;

    perform private.seed_special_event_rounds(edition, side_ids);

    select h.id into first_heat_id
    from public.special_event_heats h
    join public.special_event_rounds r on r.id = h.round_id
    where r.edition_id = edition.id and r.round_number = 1
    order by h.heat_index asc limit 1;

    -- Unseated leftovers watch a heat featuring their group (falling back to Heat 1).
    update public.special_event_entries e
    set status = case when first_heat_id is not null then 'spectating' else 'completed' end,
        side_id = null,
        spectate_heat_id = case when first_heat_id is null then null else coalesce((
          select h.id from public.special_event_heats h
          join public.special_event_rounds r on r.id = h.round_id
          join public.special_event_sides s on s.id = any(h.side_ids)
          where r.edition_id = edition.id and r.round_number = 1
            and s.group_value = coalesce(nullif(e.group_snapshot->>group_attr, ''), 'random')
          limit 1
        ), first_heat_id) end
    where e.edition_id = edition.id and e.status = 'registered';

    return true;
  end if;

  return false;
end;
$$;
revoke all on function private.finalize_special_event(uuid, boolean) from public, anon, authenticated;

-- Single-source member volume helper (optional relay side filter) reused by own-squad breakdown.
create or replace function private.special_event_member_volume(
  p_sport text, p_user_id uuid, p_start timestamptz, p_end timestamptz, p_relay_side_id uuid default null
) returns numeric language sql security definer set search_path = '' as $$
  select case
    when p_sport = 'walking' then coalesce((
      select sum(day_steps)::numeric from (
        select d.day, max(coalesce(d.steps, 0))::numeric as day_steps
        from public.daily_health_readings d
        where d.user_id = p_user_id
          and d.day >= (timezone('America/New_York', p_start))::date
          and d.day < (timezone('America/New_York', p_end))::date
          and d.day <= (timezone('America/New_York', statement_timestamp()))::date
          and (p_relay_side_id is null or exists (
            select 1 from public.special_event_relay_legs l
            where l.side_id = p_relay_side_id and l.user_id = p_user_id and l.leg_day = d.day
          ))
        group by d.day
      ) w
    ), 0)
    else coalesce((
      select sum(case
        when p_sport in ('running', 'cycling') then case when a.verified and a.provenance = 'recorded' then coalesce(a.distance_m, 0)::numeric else 0::numeric end
        else coalesce(a.moving_sec, 0)::numeric end)
      from private.competition_activity_rows(p_sport, p_start, p_end, p_user_id) a
      where a.user_id = p_user_id and a.disposition = 'counted'
        and a.provenance not in ('demo', 'manual') and coalesce(a.journal_only, false) = false
        and coalesce(a.source_label, a.provider::text) <> 'history'
        and coalesce(a.compete_key, '') !~ '^(strava-stub-|garmin-stub-|whoop-stub-|oura-stub-|mock-)'
        and a.started_at >= p_start and a.started_at < p_end and a.started_at <= statement_timestamp()
        and (p_relay_side_id is null or exists (
          select 1 from public.special_event_relay_legs l
          where l.side_id = p_relay_side_id and l.user_id = p_user_id and l.leg_day = (a.started_at at time zone 'America/New_York')::date
        ))
    ), 0)
  end;
$$;
revoke all on function private.special_event_member_volume(text, uuid, timestamptz, timestamptz, uuid) from public, anon, authenticated;

-- Extend special_event_standings with side groupAttr/groupValue and own-squad contributor breakdown.
create or replace function public.special_event_standings(p_edition_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  edition public.special_event_editions;
  my_entry public.special_event_entries;
  my_side public.special_event_sides;
  my_div text;
  is_crew_viewer boolean;
  rounds_json jsonb;
  my_squad_json jsonb := '[]'::jsonb;
  current_round integer;
  cur_round_rec public.special_event_rounds;
  score_start timestamptz;
  is_relay boolean;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select * into edition from public.special_event_editions where id = p_edition_id and published = true;
  if edition.id is null then raise exception 'edition_not_found'; end if;

  select * into my_entry from public.special_event_entries
  where edition_id = edition.id and user_id = uid and status <> 'cancelled';

  select exists (
    select 1 from public.crew_members cm
    where cm.user_id = uid and cm.status = 'active' and (
      exists (select 1 from public.special_event_sides s where s.edition_id = edition.id and s.crew_id = cm.crew_id)
      or exists (select 1 from public.special_event_entries e where e.edition_id = edition.id and e.requested_crew_id = cm.crew_id and e.status <> 'cancelled')
    )
  ) into is_crew_viewer;

  if my_entry.id is null and not is_crew_viewer then raise exception 'not_registered'; end if;
  if edition.starts_at > clock_timestamp() and edition.finalized_at is null then raise exception 'edition_not_started'; end if;

  perform private.settle_special_event_rounds(edition.id, false);
  select * into edition from public.special_event_editions where id = edition.id;
  select * into my_entry from public.special_event_entries where edition_id = edition.id and user_id = uid and status <> 'cancelled';
  if my_entry.side_id is not null then
    select * into my_side from public.special_event_sides where id = my_entry.side_id;
  end if;

  select h.division_key into my_div
  from public.special_event_heats h
  join public.special_event_rounds r on r.id = h.round_id
  where r.edition_id = edition.id
    and ((my_entry.side_id is not null and my_entry.side_id = any(h.side_ids))
      or (my_entry.spectate_heat_id is not null and h.id = my_entry.spectate_heat_id))
  order by r.round_number asc limit 1;

  select * into cur_round_rec
  from public.special_event_rounds
  where edition_id = edition.id and finalized_at is not null
  order by round_number desc limit 1;
  current_round := coalesce(cur_round_rec.round_number, 1);

  -- Own-squad individual contributor breakdown (never exposes opponent squad members).
  if my_side.id is not null and my_side.side_kind <> 'solo' and cur_round_rec.id is not null then
    score_start := case when cur_round_rec.score_mode = 'cumulative' then edition.starts_at else cur_round_rec.starts_at end;
    is_relay := coalesce(edition.config->'scoring'->>'mode', 'total_volume') = 'relay_handoff';

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'userId', m.user_id,
        'displayName', m.display_name,
        'isYou', m.user_id = uid,
        'score', m.score
      ) order by m.score desc, m.display_name asc
    ), '[]'::jsonb)
    into my_squad_json
    from (
      select
        e.user_id,
        coalesce(nullif(trim(p.display_name), ''), 'Athlete') as display_name,
        private.special_event_member_volume(
          edition.sport, e.user_id, score_start, cur_round_rec.ends_at,
          case when is_relay then my_side.id else null end
        ) as score
      from public.special_event_entries e
      join public.profiles p on p.id = e.user_id
      where e.edition_id = edition.id and e.side_id = my_side.id and e.status in ('active', 'eliminated', 'completed')
    ) m;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'roundNumber', r.round_number, 'startsAt', r.starts_at, 'endsAt', r.ends_at,
      'advanceCount', r.advance_count, 'scoreMode', r.score_mode,
      'finalizedAt', r.finalized_at, 'settledAt', r.settled_at,
      'heats', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', h.id, 'divisionKey', h.division_key, 'heatIndex', h.heat_index,
            'isMine', (my_entry.side_id is not null and my_entry.side_id = any(h.side_ids))
              or (my_entry.spectate_heat_id is not null and h.id = my_entry.spectate_heat_id),
            'advanceCount', case
              when edition.config->'match'->>'kind' = 'survivor_heat' then
                greatest(1, cardinality(h.side_ids) - greatest(1, coalesce((edition.config->'match'->>'eliminatePerRound')::integer, 1)))
              else 1 end,
            'sides', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'sideId', sc.side_id, 'displayName', sc.display_name,
                  'groupAttr', sd.group_attr, 'groupValue', sd.group_value,
                  'userId', case when sc.side_kind = 'solo' then (
                    select ent.user_id from public.special_event_entries ent
                    where ent.edition_id = edition.id and ent.side_id = sc.side_id limit 1
                  ) else null end,
                  'isYou', sc.side_id = my_entry.side_id,
                  'score', sc.score, 'place', sc.rn, 'advancing', sc.side_id = any(h.advancing_side_ids)
                ) order by sc.rn
              )
              from (select hs.*, row_number() over () as rn from private.special_event_heat_scores(h.id) hs) sc
              join public.special_event_sides sd on sd.id = sc.side_id
            ), '[]'::jsonb)
          ) order by h.heat_index
        )
        from public.special_event_heats h
        where h.round_id = r.id and (my_div is null or h.division_key = my_div)
      ), '[]'::jsonb)
    ) order by r.round_number asc
  ), '[]'::jsonb) into rounds_json
  from public.special_event_rounds r
  where r.edition_id = edition.id and r.finalized_at is not null;

  return jsonb_build_object(
    'editionId', edition.id, 'sport', edition.sport,
    'finalizedAt', edition.finalized_at, 'settledAt', edition.settled_at,
    'currentRound', current_round, 'mySideId', my_entry.side_id,
    'myStatus', my_entry.status, 'mySquad', my_squad_json, 'rounds', rounds_json
  );
end; $$;
revoke all on function public.special_event_standings(uuid) from public, anon;
grant execute on function public.special_event_standings(uuid) to authenticated;
