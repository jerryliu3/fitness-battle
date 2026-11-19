-- Special events PR 2: Tournament finalization (adaptive solo survivor heats &
-- 1v1 knockout brackets), daily/weekly round settlement, standings RPC,
-- reveal acknowledgement, and admin QA advance trigger.

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
  match_kind text;
  cadence_unit text;
  score_mode text;
  round_count integer;
  target_size integer;
  min_size integer;
  elim_per_round integer;
  side_ids uuid[];
  total_sides integer;
  heat_count integer;
  max_heat_size integer;
  effective_rounds integer;
  r_num integer;
  r_start timestamptz;
  r_end timestamptz;
  r1_id uuid;
  r_id uuid;
  i integer;
  j integer;
  chunk uuid[];
  bracket_slots integer;
  half_slots integer;
  s_a uuid;
  s_b uuid;
  adv uuid[];
  base_mon timestamptz;
  wk_mon timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended('special-event:' || p_edition_id::text, 71001));
  select * into edition from public.special_event_editions where id = p_edition_id;
  if edition.id is null or edition.finalized_at is not null then return false; end if;
  if not p_force and edition.starts_at > now_at then return false; end if;

  grouping_kind := coalesce(edition.config->'grouping'->>'kind', 'solo');
  if grouping_kind <> 'solo' then return false; end if;

  match_kind := coalesce(edition.config->'match'->>'kind', 'single_round');
  cadence_unit := coalesce(edition.config->'cadence'->>'unit', 'single_week');
  score_mode := coalesce(edition.config->'cadence'->>'scoreMode', 'round_window');
  round_count := greatest(1, coalesce((edition.config->'cadence'->>'roundCount')::integer, 1));

  -- Create frozen 1-athlete sides for all registered real athletes (no bot/house fillers).
  declare
    ent record;
    new_side_id uuid;
  begin
    for ent in
      select e.id as entry_id, e.entry_rating,
        coalesce(nullif(trim(p.display_name), ''), 'Athlete') as display_name
      from public.special_event_entries e
      join public.profiles p on p.id = e.user_id
      where e.edition_id = edition.id and e.status = 'registered'
      order by e.entry_rating desc, e.registered_at asc, e.user_id
    loop
      insert into public.special_event_sides(edition_id, side_kind, display_name, entry_rating, roster_locked_at)
      values (edition.id, 'solo', ent.display_name, ent.entry_rating, now_at)
      returning id into new_side_id;
      update public.special_event_entries set side_id = new_side_id, status = 'active' where id = ent.entry_id;
    end loop;
  end;

  select coalesce(array_agg(s.id order by e.entry_rating desc, e.registered_at asc, e.user_id), '{}'::uuid[])
  into side_ids
  from public.special_event_sides s
  join public.special_event_entries e on e.side_id = s.id and e.edition_id = edition.id
  where s.edition_id = edition.id and e.status = 'active';

  total_sides := coalesce(cardinality(side_ids), 0);

  if match_kind = 'knockout_1v1' then
    min_size := greatest(2, coalesce((edition.config->'match'->>'minBracketSize')::integer, 2));
    target_size := greatest(min_size, coalesce((edition.config->'match'->>'maxBracketSize')::integer, 16));
  else
    min_size := greatest(2, coalesce((edition.config->'match'->>'minHeatSize')::integer, 2));
    target_size := greatest(min_size, coalesce((edition.config->'match'->>'targetHeatSize')::integer, 8));
  end if;
  elim_per_round := greatest(1, coalesce((edition.config->'match'->>'eliminatePerRound')::integer, 1));

  -- Low-liquidity guard: if fewer real athletes than min_size, settle cleanly without bots.
  if total_sides < min_size then
    update public.special_event_entries
    set status = 'completed', final_place = case when total_sides = 1 then 1 else null end
    where edition_id = edition.id and status = 'active';
    update public.special_event_editions set finalized_at = now_at, settled_at = now_at where id = edition.id;
    return true;
  end if;

  -- Determine effective round count adapted to actual real registrations.
  if match_kind = 'knockout_1v1' then
    bracket_slots := 2;
    while bracket_slots < least(total_sides, target_size) loop
      bracket_slots := bracket_slots * 2;
    end loop;
    effective_rounds := least(round_count, round(log(2, bracket_slots))::integer);
    max_heat_size := 2;
  elsif match_kind = 'survivor_heat' then
    heat_count := ceil(total_sides::numeric / target_size)::integer;
    max_heat_size := ceil(total_sides::numeric / heat_count)::integer;
    effective_rounds := least(round_count, greatest(1, ceil((max_heat_size - 1)::numeric / elim_per_round)::integer));
  else
    heat_count := ceil(total_sides::numeric / target_size)::integer;
    max_heat_size := ceil(total_sides::numeric / heat_count)::integer;
    effective_rounds := 1;
  end if;

  -- Schedule rounds with Eastern-aligned bounds.
  r_start := edition.starts_at;
  base_mon := date_trunc('week', edition.starts_at at time zone 'America/New_York') at time zone 'America/New_York';
  for r_num in 1..effective_rounds loop
    if cadence_unit = 'daily' then
      r_end := least(edition.ends_at, (((r_start at time zone 'America/New_York')::date + 1)::timestamp at time zone 'America/New_York'));
      if r_end <= r_start then exit; end if;
    elsif cadence_unit = 'weekly' then
      wk_mon := ((base_mon at time zone 'America/New_York') + ((r_num - 1) * interval '7 days')) at time zone 'America/New_York';
      r_start := case when r_num = 1 then edition.starts_at else ((wk_mon at time zone 'America/New_York') + interval '6 hours') at time zone 'America/New_York' end;
      r_end := least(edition.ends_at, ((wk_mon at time zone 'America/New_York') + interval '7 days') at time zone 'America/New_York');
      if r_end <= r_start then exit; end if;
    else
      r_start := edition.starts_at;
      r_end := edition.ends_at;
    end if;

    insert into public.special_event_rounds(edition_id, round_number, starts_at, ends_at, heat_size, advance_count, score_mode, finalized_at)
    values (
      edition.id, r_num, r_start, r_end,
      least(16, greatest(2, max_heat_size)),
      case when match_kind = 'knockout_1v1' then 1
        when match_kind = 'survivor_heat' then greatest(1, max_heat_size - elim_per_round)
        else 1 end,
      score_mode,
      case when r_num = 1 then now_at else null end
    ) returning id into r_id;

    if r_num = 1 then r1_id := r_id; end if;
    if cadence_unit = 'daily' then r_start := r_end; end if;
  end loop;

  -- Seed Round 1 heats.
  if match_kind = 'knockout_1v1' then
    -- Seat top bracket_slots (up to target_size); overflow becomes spectator on Heat 1.
    half_slots := bracket_slots / 2;
    for i in 1..half_slots loop
      s_a := side_ids[i];
      s_b := case when (bracket_slots + 1 - i) <= least(total_sides, bracket_slots) then side_ids[bracket_slots + 1 - i] else null end;
      chunk := case when s_b is null then array[s_a] else array[s_a, s_b] end;
      adv := case when s_b is null then array[s_a] else '{}'::uuid[] end;
      insert into public.special_event_heats(round_id, division_key, heat_index, bracket_slot, side_ids, advancing_side_ids)
      values (r1_id, 'div_1', i, i, chunk, adv);
    end loop;
    if total_sides > bracket_slots then
      update public.special_event_entries
      set status = 'spectating', side_id = null,
          spectate_heat_id = (select id from public.special_event_heats where round_id = r1_id order by heat_index limit 1)
      where edition_id = edition.id and side_id = any(side_ids[bracket_slots + 1 : total_sides]);
    end if;
  else
    -- Balanced rating-tiered heats for survivor_heat and single_round.
    i := 1;
    for j in 1..heat_count loop
      declare
        rem integer := total_sides - i + 1;
        take integer := ceil(rem::numeric / (heat_count - j + 1))::integer;
      begin
        chunk := side_ids[i : i + take - 1];
        insert into public.special_event_heats(round_id, division_key, heat_index, side_ids)
        values (r1_id, 'div_' || j::text, j, chunk);
        i := i + take;
      end;
    end loop;
  end if;

  update public.special_event_editions set finalized_at = now_at where id = edition.id;
  return true;
end;
$$;
revoke all on function private.finalize_special_event(uuid, boolean) from public, anon, authenticated;

create or replace function private.settle_special_event_rounds(p_edition_id uuid, p_force_next boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  edition public.special_event_editions;
  now_at timestamptz := clock_timestamp();
  match_kind text;
  elim_per_round integer;
  r public.special_event_rounds;
  next_r public.special_event_rounds;
  h public.special_event_heats;
  div text;
  keep_count integer;
  ranked_ids uuid[];
  ranked_scores numeric[];
  adv_ids uuid[];
  n integer;
  k integer;
  is_final_round boolean;
  div_winners uuid[];
  w_count integer;
  p_heats uuid[];
  idx integer;
  all_done boolean;
  winner_code text;
begin
  perform pg_advisory_xact_lock(hashtextextended('special-event:' || p_edition_id::text, 71001));
  select * into edition from public.special_event_editions where id = p_edition_id;
  if edition.id is null or edition.settled_at is not null then return; end if;

  if edition.finalized_at is null then
    if edition.starts_at > now_at then return; end if;
    perform private.finalize_special_event(p_edition_id, false);
    select * into edition from public.special_event_editions where id = p_edition_id;
    if edition.finalized_at is null or edition.settled_at is not null then return; end if;
  end if;

  match_kind := coalesce(edition.config->'match'->>'kind', 'single_round');
  elim_per_round := greatest(1, coalesce((edition.config->'match'->>'eliminatePerRound')::integer, 1));
  winner_code := case when match_kind = 'survivor_heat' then 'survivor_winner' else 'champion' end;

  for r in
    select * from public.special_event_rounds
    where edition_id = edition.id and finalized_at is not null and settled_at is null
      and (ends_at <= now_at or p_force_next)
    order by round_number asc
  loop
    select * into next_r from public.special_event_rounds
    where edition_id = edition.id and round_number = r.round_number + 1;

    is_final_round := next_r.id is null;

    for h in select * from public.special_event_heats where round_id = r.id order by division_key, heat_index loop
      if cardinality(h.side_ids) <= 1 then
        adv_ids := h.side_ids;
        update public.special_event_heats set advancing_side_ids = adv_ids where id = h.id;
        continue;
      end if;

      select array_agg(s.side_id), array_agg(s.score)
      into ranked_ids, ranked_scores
      from private.special_event_heat_scores(h.id) s;

      n := coalesce(cardinality(ranked_ids), 0);
      if n = 0 then continue; end if;

      keep_count := case
        when is_final_round or match_kind = 'single_round' or match_kind = 'knockout_1v1' then 1
        when match_kind = 'survivor_heat' then greatest(1, n - elim_per_round)
        else 1
      end;

      adv_ids := ranked_ids[1 : least(keep_count, n)];
      update public.special_event_heats set advancing_side_ids = adv_ids where id = h.id;

      -- Record eliminated / placed sides beyond keep_count.
      if n > keep_count then
        for k in (keep_count + 1)..n loop
          update public.special_event_sides
          set final_place = k, final_score = ranked_scores[k]
          where id = ranked_ids[k];

          update public.special_event_entries
          set status = case when is_final_round or match_kind = 'single_round' then 'completed' else 'eliminated' end,
              eliminated_round = case when is_final_round or match_kind = 'single_round' then null else r.round_number end,
              final_place = k,
              final_score = ranked_scores[k]
          where edition_id = edition.id and side_id = ranked_ids[k];

          if is_final_round or match_kind = 'single_round' then
            if k = 2 then
              insert into public.special_event_receipts(edition_id, user_id, side_id, code, metadata)
              select edition.id, e.user_id, ranked_ids[k], 'finalist',
                jsonb_build_object('place', 2, 'score', ranked_scores[k], 'title', edition.title)
              from public.special_event_entries e where e.edition_id = edition.id and e.side_id = ranked_ids[k]
              on conflict (edition_id, user_id, code) do nothing;
            elsif k = 3 and n >= 3 then
              insert into public.special_event_receipts(edition_id, user_id, side_id, code, metadata)
              select edition.id, e.user_id, ranked_ids[k], 'podium',
                jsonb_build_object('place', 3, 'score', ranked_scores[k], 'title', edition.title)
              from public.special_event_entries e where e.edition_id = edition.id and e.side_id = ranked_ids[k]
              on conflict (edition_id, user_id, code) do nothing;
            end if;
          end if;
        end loop;
      end if;

      -- Crown winner when heat resolves to 1 survivor (final round or survivor heat down to 1).
      if is_final_round or (cardinality(adv_ids) = 1 and match_kind <> 'knockout_1v1') then
        update public.special_event_sides set final_place = 1, final_score = ranked_scores[1] where id = adv_ids[1];
        update public.special_event_entries
        set status = 'completed', final_place = 1, final_score = ranked_scores[1]
        where edition_id = edition.id and side_id = adv_ids[1];
        insert into public.special_event_receipts(edition_id, user_id, side_id, code, metadata)
        select edition.id, e.user_id, adv_ids[1], winner_code,
          jsonb_build_object('place', 1, 'score', ranked_scores[1], 'title', edition.title)
        from public.special_event_entries e where e.edition_id = edition.id and e.side_id = adv_ids[1]
        on conflict (edition_id, user_id, code) do nothing;
      end if;
    end loop;

    update public.special_event_rounds set settled_at = now_at where id = r.id;

    -- Build next round heats if another round exists and multiple sides advance.
    all_done := true;
    if next_r.id is not null then
      for div in select distinct division_key from public.special_event_heats where round_id = r.id order by division_key loop
        if match_kind = 'knockout_1v1' then
          select array_agg(h2.advancing_side_ids[1] order by h2.heat_index),
                 array_agg(h2.id order by h2.heat_index)
          into div_winners, p_heats
          from public.special_event_heats h2
          where h2.round_id = r.id and h2.division_key = div and cardinality(h2.advancing_side_ids) >= 1;

          w_count := coalesce(cardinality(div_winners), 0);
          if w_count <= 1 then
            if w_count = 1 then
              update public.special_event_sides set final_place = 1 where id = div_winners[1];
              update public.special_event_entries set status = 'completed', final_place = 1
              where edition_id = edition.id and side_id = div_winners[1];
              insert into public.special_event_receipts(edition_id, user_id, side_id, code, metadata)
              select edition.id, e.user_id, div_winners[1], winner_code, jsonb_build_object('place', 1, 'title', edition.title)
              from public.special_event_entries e where e.edition_id = edition.id and e.side_id = div_winners[1]
              on conflict (edition_id, user_id, code) do nothing;
            end if;
            continue;
          end if;

          all_done := false;
          -- Pair outer winners (1 vs W, 2 vs W-1) to keep top seeds on opposite bracket halves.
          for idx in 1..(w_count / 2) loop
            insert into public.special_event_heats(round_id, division_key, heat_index, bracket_slot, side_ids, parent_heat_ids)
            values (
              next_r.id, div, idx, idx,
              array[div_winners[idx], div_winners[w_count + 1 - idx]],
              array[p_heats[idx], p_heats[w_count + 1 - idx]]
            );
          end loop;
        else
          -- Survivor heat: carry advancing sides forward in the same division heat.
          for h in select * from public.special_event_heats where round_id = r.id and division_key = div order by heat_index loop
            if cardinality(h.advancing_side_ids) > 1 then
              all_done := false;
              insert into public.special_event_heats(round_id, division_key, heat_index, side_ids, parent_heat_ids)
              values (next_r.id, h.division_key, h.heat_index, h.advancing_side_ids, array[h.id]);
            end if;
          end loop;
        end if;
      end loop;

      if not all_done then
        update public.special_event_rounds set finalized_at = now_at where id = next_r.id;
      end if;
    end if;

    if all_done or is_final_round then
      update public.special_event_editions set settled_at = now_at where id = edition.id;
      exit;
    end if;

    if p_force_next then exit; end if;
  end loop;
end;
$$;
revoke all on function private.settle_special_event_rounds(uuid, boolean) from public, anon, authenticated;

-- Lazily finalize/settle started editions on list_special_events() so Compete cards stay fresh.
create or replace function public.list_special_events()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  now_at timestamptz := clock_timestamp();
  due_id uuid;
  result jsonb;
begin
  if uid is null then raise exception 'authentication_required'; end if;

  for due_id in
    select e.id from public.special_event_editions e
    where e.published = true and e.settled_at is null and e.starts_at <= now_at
      and exists (select 1 from public.special_event_entries ent where ent.edition_id = e.id and ent.user_id = uid and ent.status <> 'cancelled')
  loop
    perform private.settle_special_event_rounds(due_id, false);
  end loop;

  select coalesce(jsonb_agg(item order by sort_group, starts_at asc, id), '[]'::jsonb) into result
  from (
    select
      case when e.starts_at <= now_at and e.ends_at > now_at then 0
        when e.registration_opens_at <= now_at and e.registration_closes_at > now_at then 1
        when e.registration_opens_at > now_at then 2 else 3 end as sort_group,
      e.starts_at, e.id,
      jsonb_build_object(
        'id', e.id, 'slug', e.slug, 'seriesKey', e.series_key, 'sport', e.sport,
        'title', e.title, 'subtitle', e.subtitle, 'rulesVersion', e.rules_version, 'config', e.config,
        'registrationOpensAt', e.registration_opens_at, 'registrationClosesAt', e.registration_closes_at,
        'startsAt', e.starts_at, 'endsAt', e.ends_at, 'finalizedAt', e.finalized_at, 'settledAt', e.settled_at,
        'entrantCount', (select count(*)::integer from public.special_event_entries ent where ent.edition_id = e.id and ent.status <> 'cancelled'),
        'entry', (
          select case when ent.id is null or ent.status = 'cancelled' then null else jsonb_build_object(
            'id', ent.id, 'status', ent.status, 'sideId', ent.side_id, 'sideName', s.display_name,
            'spectateHeatId', ent.spectate_heat_id, 'requestedCrewId', ent.requested_crew_id,
            'groupSnapshot', ent.group_snapshot, 'entryRating', ent.entry_rating, 'registeredAt', ent.registered_at,
            'eliminatedRound', ent.eliminated_round, 'finalPlace', ent.final_place, 'finalScore', ent.final_score,
            'acknowledgedAt', ent.acknowledged_at
          ) end
          from public.special_event_entries ent
          left join public.special_event_sides s on s.id = ent.side_id
          where ent.edition_id = e.id and ent.user_id = uid
        ),
        'receipts', coalesce((
          select jsonb_agg(jsonb_build_object('code', r.code, 'metadata', r.metadata, 'earnedAt', r.earned_at) order by r.earned_at desc)
          from public.special_event_receipts r where r.edition_id = e.id and r.user_id = uid
        ), '[]'::jsonb)
      ) as item
    from public.special_event_editions e
    where e.published = true and (
      e.ends_at > now_at - interval '14 days'
      or exists (select 1 from public.special_event_entries mine where mine.edition_id = e.id and mine.user_id = uid and mine.status <> 'cancelled')
    )
  ) rows;
  return result;
end; $$;
revoke all on function public.list_special_events() from public, anon;
grant execute on function public.list_special_events() to authenticated;

-- Authorized live/settled standings + bracket view for seated athletes, spectators, and participating crewmates.
create function public.special_event_standings(p_edition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  edition public.special_event_editions;
  my_entry public.special_event_entries;
  my_div text;
  is_crew_viewer boolean;
  rounds_json jsonb;
  current_round integer;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  select * into edition from public.special_event_editions where id = p_edition_id and published = true;
  if edition.id is null then raise exception 'edition_not_found'; end if;

  select * into my_entry from public.special_event_entries
  where edition_id = edition.id and user_id = uid and status <> 'cancelled';

  select exists (
    select 1 from public.special_event_sides s
    join public.crew_members cm on cm.crew_id = s.crew_id and cm.user_id = uid and cm.status = 'active'
    where s.edition_id = edition.id
  ) into is_crew_viewer;

  if my_entry.id is null and not is_crew_viewer then
    raise exception 'not_registered';
  end if;

  if edition.starts_at > clock_timestamp() and edition.finalized_at is null then
    raise exception 'edition_not_started';
  end if;

  perform private.settle_special_event_rounds(edition.id, false);
  select * into edition from public.special_event_editions where id = edition.id;
  select * into my_entry from public.special_event_entries where edition_id = edition.id and user_id = uid and status <> 'cancelled';

  select h.division_key into my_div
  from public.special_event_heats h
  join public.special_event_rounds r on r.id = h.round_id
  where r.edition_id = edition.id
    and ((my_entry.side_id is not null and my_entry.side_id = any(h.side_ids))
      or (my_entry.spectate_heat_id is not null and h.id = my_entry.spectate_heat_id))
  order by r.round_number asc limit 1;

  select coalesce(max(round_number), 1) into current_round
  from public.special_event_rounds
  where edition_id = edition.id and finalized_at is not null;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'roundNumber', r.round_number,
      'startsAt', r.starts_at,
      'endsAt', r.ends_at,
      'advanceCount', r.advance_count,
      'scoreMode', r.score_mode,
      'finalizedAt', r.finalized_at,
      'settledAt', r.settled_at,
      'heats', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', h.id,
            'divisionKey', h.division_key,
            'heatIndex', h.heat_index,
            'isMine', (my_entry.side_id is not null and my_entry.side_id = any(h.side_ids))
              or (my_entry.spectate_heat_id is not null and h.id = my_entry.spectate_heat_id),
            'advanceCount', case
              when edition.config->'match'->>'kind' = 'knockout_1v1' then 1
              when edition.config->'match'->>'kind' = 'survivor_heat' then
                greatest(1, cardinality(h.side_ids) - greatest(1, coalesce((edition.config->'match'->>'eliminatePerRound')::integer, 1)))
              else 1 end,
            'sides', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'sideId', sc.side_id,
                  'displayName', sc.display_name,
                  'userId', case when sc.side_kind = 'solo' then (
                    select ent.user_id from public.special_event_entries ent
                    where ent.edition_id = edition.id and ent.side_id = sc.side_id limit 1
                  ) else null end,
                  'isYou', sc.side_id = my_entry.side_id,
                  'score', sc.score,
                  'place', sc.rn,
                  'advancing', sc.side_id = any(h.advancing_side_ids)
                ) order by sc.rn
              )
              from (
                select hs.*, row_number() over () as rn
                from private.special_event_heat_scores(h.id) hs
              ) sc
            ), '[]'::jsonb)
          ) order by h.heat_index
        )
        from public.special_event_heats h
        where h.round_id = r.id and (my_div is null or h.division_key = my_div)
      ), '[]'::jsonb)
    ) order by r.round_number asc
  ), '[]'::jsonb)
  into rounds_json
  from public.special_event_rounds r
  where r.edition_id = edition.id and r.finalized_at is not null;

  return jsonb_build_object(
    'editionId', edition.id,
    'sport', edition.sport,
    'finalizedAt', edition.finalized_at,
    'settledAt', edition.settled_at,
    'currentRound', current_round,
    'mySideId', my_entry.side_id,
    'myStatus', my_entry.status,
    'rounds', rounds_json
  );
end;
$$;
revoke all on function public.special_event_standings(uuid) from public, anon;
grant execute on function public.special_event_standings(uuid) to authenticated;

create function public.acknowledge_special_event(p_edition_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'authentication_required'; end if;
  update public.special_event_entries
  set acknowledged_at = coalesce(acknowledged_at, clock_timestamp())
  where edition_id = p_edition_id and user_id = uid and status <> 'cancelled';
  return found;
end; $$;
revoke all on function public.acknowledge_special_event(uuid) from public, anon;
grant execute on function public.acknowledge_special_event(uuid) to authenticated;

-- Admin QA trigger to finalize or settle the active round immediately during testing.
create function public.admin_advance_special_event(p_actor_id uuid, p_edition_id uuid, p_action text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare ed public.special_event_editions;
begin
  if p_actor_id is null then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_action = 'finalize' then
    perform private.finalize_special_event(p_edition_id, true);
  elsif p_action = 'settle_round' then
    perform private.settle_special_event_rounds(p_edition_id, true);
  else
    raise exception 'invalid_action';
  end if;
  select * into ed from public.special_event_editions where id = p_edition_id;
  return jsonb_build_object('id', ed.id, 'finalizedAt', ed.finalized_at, 'settledAt', ed.settled_at);
end; $$;
revoke all on function public.admin_advance_special_event(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_advance_special_event(uuid, uuid, text) to service_role;
