-- Special events PR 5 addendum:
-- 1. Close-boundary exclusive lock in settle_special_event_rounds (matches capture_competition_fact).
-- 2. Data-layer demo_only isolation so seeded demo events never appear to real production users.
-- 3. Deduplicate relay leg volume query via private.special_event_member_volume.
-- 4. Idempotent demo account participation seed across live & pre-registering special events.

alter table public.special_event_editions
  add column if not exists demo_only boolean not null default false;

create or replace function private.is_demo_athlete(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    where u.id = p_user_id
      and lower(coalesce(u.email, '')) in (
        'test@test.com',
        'alice@example.com',
        'bob@example.com',
        'carla@example.com',
        'dana@example.com',
        'elena@example.com',
        'marcus@example.com',
        'priya@example.com'
      )
  );
$$;
revoke all on function private.is_demo_athlete(uuid) from public, anon, authenticated;

drop policy if exists special_event_editions_read_published on public.special_event_editions;
create policy special_event_editions_read_published on public.special_event_editions
  for select to authenticated
  using (published = true and (not demo_only or private.is_demo_athlete((select auth.uid()))));

-- Add exclusive competition-close advisory lock per due round to eliminate midnight close races.
create or replace function private.settle_special_event_rounds(p_edition_id uuid, p_force_next boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  edition public.special_event_editions;
  now_at timestamptz := clock_timestamp();
  match_kind text;
  elim_per_round integer;
  winner_code text;
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

  loop
    select * into r from public.special_event_rounds
    where edition_id = edition.id and finalized_at is not null and settled_at is null
      and (ends_at <= now_at or p_force_next)
    order by round_number asc limit 1;
    exit when r.id is null;

    if not p_force_next then
      perform pg_advisory_xact_lock(hashtextextended('competition-close:' || extract(epoch from r.ends_at)::text, 29001));
    end if;

    select * into next_r from public.special_event_rounds
    where edition_id = edition.id and round_number = r.round_number + 1;
    is_final_round := next_r.id is null;

    for h in select * from public.special_event_heats where round_id = r.id order by division_key, heat_index loop
      if cardinality(h.side_ids) <= 1 then
        update public.special_event_heats set advancing_side_ids = h.side_ids where id = h.id;
        continue;
      end if;

      select array_agg(s.side_id), array_agg(s.score) into ranked_ids, ranked_scores
      from private.special_event_heat_scores(h.id) s;
      n := coalesce(cardinality(ranked_ids), 0);
      if n = 0 then continue; end if;

      keep_count := case
        when is_final_round or match_kind in ('single_round', 'knockout_1v1') then 1
        else greatest(1, n - elim_per_round)
      end;
      adv_ids := ranked_ids[1 : least(keep_count, n)];
      update public.special_event_heats set advancing_side_ids = adv_ids where id = h.id;

      for k in (keep_count + 1)..n loop
        update public.special_event_sides set final_place = k, final_score = ranked_scores[k] where id = ranked_ids[k];
        update public.special_event_entries
        set status = case when is_final_round or match_kind = 'single_round' then 'completed' else 'eliminated' end,
            eliminated_round = case when is_final_round or match_kind = 'single_round' then null else r.round_number end,
            final_place = k, final_score = ranked_scores[k]
        where edition_id = edition.id and side_id = ranked_ids[k];

        if (is_final_round or match_kind = 'single_round') and k in (2, 3) then
          insert into public.special_event_receipts(edition_id, user_id, side_id, code, metadata)
          select edition.id, e.user_id, ranked_ids[k], case when k = 2 then 'finalist' else 'podium' end,
            jsonb_build_object('place', k, 'score', ranked_scores[k], 'title', edition.title)
          from public.special_event_entries e where e.edition_id = edition.id and e.side_id = ranked_ids[k]
          on conflict (edition_id, user_id, code) do nothing;
        end if;
      end loop;

      if is_final_round or (cardinality(adv_ids) = 1 and match_kind <> 'knockout_1v1') then
        update public.special_event_sides set final_place = 1, final_score = ranked_scores[1] where id = adv_ids[1];
        update public.special_event_entries set status = 'completed', final_place = 1, final_score = ranked_scores[1]
        where edition_id = edition.id and side_id = adv_ids[1];
        insert into public.special_event_receipts(edition_id, user_id, side_id, code, metadata)
        select edition.id, e.user_id, adv_ids[1], winner_code,
          jsonb_build_object('place', 1, 'score', ranked_scores[1], 'title', edition.title)
        from public.special_event_entries e where e.edition_id = edition.id and e.side_id = adv_ids[1]
        on conflict (edition_id, user_id, code) do nothing;
      end if;
    end loop;

    update public.special_event_rounds set settled_at = now_at where id = r.id;

    all_done := true;
    if next_r.id is not null then
      for div in select distinct division_key from public.special_event_heats where round_id = r.id order by division_key loop
        if match_kind = 'knockout_1v1' then
          select array_agg(h2.advancing_side_ids[1] order by h2.heat_index), array_agg(h2.id order by h2.heat_index)
          into div_winners, p_heats
          from public.special_event_heats h2
          where h2.round_id = r.id and h2.division_key = div and cardinality(h2.advancing_side_ids) >= 1;
          w_count := coalesce(cardinality(div_winners), 0);
          if w_count > 1 then
            all_done := false;
            for idx in 1..(w_count / 2) loop
              insert into public.special_event_heats(round_id, division_key, heat_index, bracket_slot, side_ids, parent_heat_ids)
              values (next_r.id, div, idx, idx, array[div_winners[idx], div_winners[w_count + 1 - idx]], array[p_heats[idx], p_heats[w_count + 1 - idx]]);
            end loop;
          end if;
        else
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
end; $$;
revoke all on function private.settle_special_event_rounds(uuid, boolean) from public, anon, authenticated;

-- Enforce demo_only isolation across all athlete-facing special-event RPCs.
create or replace function public.list_special_events()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  now_at timestamptz := clock_timestamp();
  allow_demo boolean;
  due_id uuid;
  result jsonb;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  allow_demo := private.is_demo_athlete(uid);

  perform private.materialize_special_event_templates(now_at);

  for due_id in
    select e.id from public.special_event_editions e
    where e.published = true and (not e.demo_only or allow_demo) and e.settled_at is null and e.starts_at <= now_at
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
    where e.published = true and (not e.demo_only or allow_demo) and (
      e.ends_at > now_at - interval '14 days'
      or exists (select 1 from public.special_event_entries mine where mine.edition_id = e.id and mine.user_id = uid and mine.status <> 'cancelled')
    )
  ) rows;
  return result;
end; $$;
revoke all on function public.list_special_events() from public, anon;
grant execute on function public.list_special_events() to authenticated;

create or replace function public.register_special_event(
  p_edition_id uuid, p_crew_id uuid default null, p_group_value text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  now_at timestamptz := clock_timestamp();
  edition public.special_event_editions;
  grouping_kind text; group_attr text; resolved_group text; resolved_crew uuid;
  rating numeric; prof public.profiles; saved public.special_event_entries;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('special-event:' || p_edition_id::text, 71001));

  select * into edition from public.special_event_editions
  where id = p_edition_id and published = true and (not demo_only or private.is_demo_athlete(uid));
  if edition.id is null then raise exception 'edition_not_found'; end if;
  if now_at < edition.registration_opens_at then raise exception 'registration_not_open'; end if;
  if now_at >= edition.registration_closes_at or now_at >= edition.starts_at or edition.finalized_at is not null then
    raise exception 'registration_closed';
  end if;

  select * into prof from public.profiles where id = uid;
  if prof.id is null then raise exception 'profile_required'; end if;
  select case when edition.sport in ('running', 'cycling') then coalesce(r.verified_elo, 0) else coalesce(r.open_elo, 0) end
  into rating from public.sport_ratings r where r.user_id = uid and r.sport = edition.sport;
  rating := coalesce(rating, 0);

  grouping_kind := coalesce(edition.config->'grouping'->>'kind', 'solo');
  if grouping_kind = 'crew' then
    if p_crew_id is null then raise exception 'crew_required'; end if;
    if not exists (select 1 from public.crew_members cm where cm.crew_id = p_crew_id and cm.user_id = uid and cm.status = 'active') then
      raise exception 'not_a_crew_member';
    end if;
    resolved_crew := p_crew_id;
  elsif grouping_kind = 'profile_attr' then
    group_attr := edition.config->'grouping'->>'attr';
    if group_attr = 'country_code' then
      resolved_group := upper(nullif(trim(coalesce(p_group_value, prof.country_code, '')), ''));
      if resolved_group is null or resolved_group !~ '^[A-Z]{2}$' then raise exception 'country_required'; end if;
    elsif group_attr = 'city_slug' then
      resolved_group := lower(nullif(trim(coalesce(p_group_value, prof.city_slug, '')), ''));
      if resolved_group is null or resolved_group !~ '^[a-z]{2}:[a-z0-9-]{2,60}$' then raise exception 'city_required'; end if;
      if prof.city_slug is distinct from resolved_group then
        update public.profiles set city_slug = resolved_group where id = uid;
      end if;
    elsif group_attr = 'gender' then
      resolved_group := lower(nullif(trim(coalesce(p_group_value, prof.gender, '')), ''));
      if resolved_group is null or resolved_group not in ('male', 'female', 'other') then raise exception 'profile_attribute_required'; end if;
    elsif group_attr = 'rank_tier' then
      resolved_group := 'tier_' || greatest(0, floor(rating / 1250))::integer::text;
    elsif group_attr = 'random' then
      resolved_group := 'random';
    else
      resolved_group := nullif(trim(coalesce(p_group_value, '')), '');
      if resolved_group is null then raise exception 'profile_attribute_required'; end if;
    end if;
  end if;

  insert into public.special_event_entries(edition_id, user_id, requested_crew_id, group_snapshot, entry_rating, registered_at, cancelled_at, status)
  values (
    edition.id, uid, resolved_crew,
    case when group_attr is not null then jsonb_build_object(group_attr, resolved_group) else '{}'::jsonb end,
    rating, now_at, null, 'registered'
  )
  on conflict (edition_id, user_id) do update set
    requested_crew_id = excluded.requested_crew_id,
    group_snapshot = excluded.group_snapshot,
    entry_rating = excluded.entry_rating,
    registered_at = case when public.special_event_entries.status = 'cancelled' then excluded.registered_at else public.special_event_entries.registered_at end,
    cancelled_at = null,
    status = 'registered'
  returning * into saved;

  return jsonb_build_object(
    'id', saved.id, 'editionId', saved.edition_id, 'status', saved.status,
    'requestedCrewId', saved.requested_crew_id, 'groupSnapshot', saved.group_snapshot,
    'entryRating', saved.entry_rating, 'registeredAt', saved.registered_at
  );
end; $$;
revoke all on function public.register_special_event(uuid, uuid, text) from public, anon;
grant execute on function public.register_special_event(uuid, uuid, text) to authenticated;

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
  select * into edition from public.special_event_editions
  where id = p_edition_id and published = true and (not demo_only or private.is_demo_athlete(uid));
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

  if my_side.id is not null and my_side.side_kind <> 'solo' and cur_round_rec.id is not null then
    score_start := case when cur_round_rec.score_mode = 'cumulative' then edition.starts_at else cur_round_rec.starts_at end;
    is_relay := coalesce(edition.config->'scoring'->>'mode', 'total_volume') = 'relay_handoff';

    select coalesce(jsonb_agg(
      jsonb_build_object('userId', m.user_id, 'displayName', m.display_name, 'isYou', m.user_id = uid, 'score', m.score)
      order by m.score desc, m.display_name asc
    ), '[]'::jsonb)
    into my_squad_json
    from (
      select e.user_id, coalesce(nullif(trim(p.display_name), ''), 'Athlete') as display_name,
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

create or replace function public.set_special_event_relay_legs(p_edition_id uuid, p_crew_id uuid, p_legs jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  now_at timestamptz := clock_timestamp();
  today_et date := (now_at at time zone 'America/New_York')::date;
  edition public.special_event_editions;
  crew_name text; side_id uuid; start_day date; end_day date;
  legs_per_day integer; assignment_mode text; lock_policy text; max_legs integer;
  leg jsonb; l_day date; l_slot integer; l_user uuid; over_cap boolean;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if not exists (select 1 from public.crew_members where crew_id = p_crew_id and user_id = uid and status = 'active') then
    raise exception 'not_a_crew_member';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('special-event:' || p_edition_id::text, 71001));
  select * into edition from public.special_event_editions
  where id = p_edition_id and published = true and (not demo_only or private.is_demo_athlete(uid));
  if edition.id is null then raise exception 'edition_not_found'; end if;
  if coalesce(edition.config->'scoring'->>'mode', 'total_volume') <> 'relay_handoff' then raise exception 'not_a_relay'; end if;

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
    values (edition.id, 'crew', p_crew_id, coalesce(crew_name, 'Crew')) returning id into side_id;
  end if;

  if jsonb_typeof(coalesce(p_legs, '[]'::jsonb)) <> 'array' then raise exception 'invalid_legs'; end if;

  delete from public.special_event_relay_legs
  where side_id = set_special_event_relay_legs.side_id
    and locked_at is null and (edition.finalized_at is null or leg_day > today_et);

  for leg in select value from jsonb_array_elements(coalesce(p_legs, '[]'::jsonb)) loop
    l_day := (leg->>'legDay')::date;
    l_slot := coalesce((leg->>'slotIndex')::integer, 1);
    l_user := (leg->>'userId')::uuid;

    if l_day < start_day or l_day > end_day or l_slot < 1 or l_slot > legs_per_day then raise exception 'invalid_leg_slot'; end if;
    if (edition.finalized_at is not null or now_at >= edition.starts_at) and l_day <= today_et then raise exception 'relay_day_locked'; end if;
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
      select 1 from public.special_event_relay_legs where side_id = set_special_event_relay_legs.side_id
      group by user_id having count(*) > max_legs
    ) into over_cap;
    if over_cap then raise exception 'relay_max_legs_exceeded'; end if;
  end if;

  return jsonb_build_object('sideId', side_id, 'saved', true);
end; $$;
revoke all on function public.set_special_event_relay_legs(uuid, uuid, jsonb) from public, anon;
grant execute on function public.set_special_event_relay_legs(uuid, uuid, jsonb) to authenticated;

-- Reuses private.special_event_member_volume (removes duplicated scoring SQL) + enforces demo_only isolation.
create or replace function public.special_event_relay_lineup(p_edition_id uuid, p_crew_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  now_at timestamptz := clock_timestamp();
  today_et date := (now_at at time zone 'America/New_York')::date;
  edition public.special_event_editions;
  side_id uuid; start_day date; end_day date;
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

  select id into side_id from public.special_event_sides where edition_id = edition.id and crew_id = p_crew_id limit 1;
  start_day := (edition.starts_at at time zone 'America/New_York')::date;
  end_day := ((edition.ends_at - interval '1 second') at time zone 'America/New_York')::date;

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
    where l.side_id = special_event_relay_lineup.side_id;
  end if;

  return jsonb_build_object(
    'editionId', edition.id, 'crewId', p_crew_id, 'sideId', side_id,
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

-- ============================================================================
-- Seed demo-only Special Events participation for all 8 demo accounts
-- (test@test.com, alice, bob, carla, dana, elena, marcus, priya).
-- Isolated behind demo_only = true so real production users see zero change.
-- ============================================================================
do $$
declare
  v_test_uid   uuid;
  v_alice_uid  uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  v_bob_uid    uuid := '22222222-2222-4222-8222-222222222222'::uuid;
  v_carla_uid  uuid := '33333333-3333-4333-8333-333333333333'::uuid;
  v_dana_uid   uuid := '44444444-4444-4444-8444-444444444444'::uuid;
  v_elena_uid  uuid := '55555555-5555-4555-8555-555555555555'::uuid;
  v_marcus_uid uuid := '66666666-6666-4666-8666-666666666666'::uuid;
  v_priya_uid  uuid := '77777777-7777-4777-8777-777777777777'::uuid;
  v_crew_a     uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid;
  v_crew_c     uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid;
  v_cat_run    uuid;
  v_now        timestamptz := clock_timestamp();
  v_today_et   date := (v_now at time zone 'America/New_York')::date;
  v_cal_mon    date := date_trunc('week', v_now at time zone 'America/New_York')::date;
  v_active_mon date;
  v_live_open  timestamptz;
  v_live_start timestamptz;
  v_live_end   timestamptz;
  v_next_open  timestamptz;
  v_next_start timestamptz;
  v_next_end1  timestamptz;
  v_next_end3  timestamptz;
  v_all        uuid[];
  v_u          uuid;
  v_i          integer;
  v_d          date;
  v_ed_id      uuid;
  v_dist       numeric;
begin
  if not exists (select 1 from public.profiles where id = v_alice_uid) then
    return;
  end if;

  select id into v_test_uid from auth.users where email = 'test@test.com' limit 1;
  if v_test_uid is not null and not exists (select 1 from public.profiles where id = v_test_uid) then
    v_test_uid := null;
  end if;

  -- Anchor live events to the currently running Eastern week (handles Mon 00:00-06:00 ET cleanly).
  v_active_mon := case
    when v_now < ((v_cal_mon::timestamp + interval '6 hours') at time zone 'America/New_York') then v_cal_mon - 7
    else v_cal_mon
  end;
  v_live_open  := ((v_active_mon - 7)::timestamp at time zone 'America/New_York');
  v_live_start := ((v_active_mon::timestamp + interval '6 hours') at time zone 'America/New_York');
  v_live_end   := ((v_active_mon + 7)::timestamp at time zone 'America/New_York');

  v_next_open  := (v_active_mon::timestamp at time zone 'America/New_York');
  v_next_start := (((v_active_mon + 7)::timestamp + interval '6 hours') at time zone 'America/New_York');
  v_next_end1  := ((v_active_mon + 14)::timestamp at time zone 'America/New_York');
  v_next_end3  := ((v_active_mon + 28)::timestamp at time zone 'America/New_York');

  -- Non-destructively populate canonical country_code & city_slug on demo profiles.
  update public.profiles p
  set country_code = coalesce(p.country_code, m.cc),
      city_slug = coalesce(p.city_slug, m.cs)
  from (values
    (v_test_uid,   'US', 'us:new-york'),
    (v_alice_uid,  'US', 'us:new-york'),
    (v_bob_uid,    'US', 'us:new-york'),
    (v_carla_uid,  'US', 'us:new-york'),
    (v_elena_uid,  'US', 'us:new-york'),
    (v_marcus_uid, 'GB', 'gb:london'),
    (v_priya_uid,  'GB', 'gb:london'),
    (v_dana_uid,   'US', 'us:san-francisco')
  ) as m(uid, cc, cs)
  where p.id = m.uid;

  select array_agg(u) into v_all
  from unnest(array[v_test_uid, v_alice_uid, v_bob_uid, v_carla_uid, v_dana_uid, v_elena_uid, v_marcus_uid, v_priya_uid]) as u
  where u is not null and exists (select 1 from public.profiles where id = u);

  -- Second non-overlapping demo running crew for head-to-head Crew Relay against Weekday miles.
  insert into public.crews(id, name, invite_code, sport, format, target_sessions, journey_km, created_by)
  values (v_crew_c, 'Harbor Track Club', 'HARBOR', 'running', 'volume', 4, 65, v_marcus_uid)
  on conflict (id) do nothing;

  insert into public.crew_members(crew_id, user_id, display_name, status)
  select v_crew_c, p.id, p.display_name, 'active'
  from public.profiles p
  where p.id in (v_marcus_uid, v_priya_uid, v_dana_uid)
  on conflict (crew_id, user_id) do nothing;

  -- Ensure current-week verified runs exist for all demo accounts so live rounds & relays show real volume.
  select id into v_cat_run from public.categories where slug = 'running' limit 1;
  if v_cat_run is not null then
    v_i := 0;
    foreach v_u in array v_all loop
      v_i := v_i + 1;
      v_d := v_active_mon;
      while v_d <= least(v_today_et, v_active_mon + 6) loop
        v_dist := 4200 + ((v_i * 730 + extract(dow from v_d)::integer * 410) % 5800);
        insert into public.activities(
          user_id, provider, external_id, category_id, started_at, metric_value,
          raw_name, moving_sec, sport, distance_m, avg_hr, verified, provenance, disposition, compete_key, source_label
        ) values (
          v_u, 'strava', 'se-demo-run-' || to_char(v_d, 'YYYYMMDD'), v_cat_run,
          greatest(v_live_start + interval '1 minute', least(v_now - interval '1 minute', ((v_d::timestamp + interval '7 hours 15 minutes') at time zone 'America/New_York'))),
          v_dist, 'Morning aerobic run', round(v_dist * 0.34)::integer, 'running', v_dist, 146,
          true, 'recorded', 'counted', 'se-demo-run-' || v_i::text || '-' || to_char(v_d, 'YYYYMMDD'), 'Strava'
        )
        on conflict (user_id, provider, external_id) do nothing;
        v_d := v_d + 1;
      end loop;
    end loop;
  end if;

  -- 1. Active Live: Daily Survivor (Running, 8-athlete heat, daily midnight ET cuts).
  if not exists (select 1 from public.special_event_editions where slug = 'demo-daily-survivor') then
    insert into public.special_event_editions(
      slug, series_key, sport, title, subtitle, config,
      registration_opens_at, registration_closes_at, starts_at, ends_at, published, demo_only, created_by
    ) values (
      'demo-daily-survivor', 'running-daily-survivor', 'running',
      'Daily Survivor', '1 eliminated every night · Scores reset daily',
      '{"version":1,"grouping":{"kind":"solo"},"match":{"kind":"survivor_heat","targetHeatSize":8,"minHeatSize":3,"eliminatePerRound":1},"cadence":{"unit":"daily","roundCount":7,"scoreMode":"round_window"},"scoring":{"mode":"total_volume"},"divisionMode":"rating_tiers"}'::jsonb,
      v_live_open, v_live_start, v_live_start, v_live_end, true, true, v_alice_uid
    ) returning id into v_ed_id;

    insert into public.special_event_entries(edition_id, user_id, entry_rating, registered_at, status)
    select v_ed_id, u, coalesce((select r.verified_elo from public.sport_ratings r where r.user_id = u and r.sport = 'running'), 1050),
      v_live_open + interval '1 day', 'registered'
    from unnest(v_all) as u;

    perform private.finalize_special_event(v_ed_id, true);
    perform private.settle_special_event_rounds(v_ed_id, false);
  end if;

  -- 2. Active Live: Crew Relay (Running, Weekday miles vs Harbor Track Club, locked daily baton).
  if not exists (select 1 from public.special_event_editions where slug = 'demo-crew-relay')
     and exists (select 1 from public.crews where id = v_crew_a) then
    insert into public.special_event_editions(
      slug, series_key, sport, title, subtitle, config,
      registration_opens_at, registration_closes_at, starts_at, ends_at, published, demo_only, created_by
    ) values (
      'demo-crew-relay', 'running-crew-relay', 'running',
      'Crew Relay', '1 teammate counts per day · Full-week baton lock',
      '{"version":1,"grouping":{"kind":"crew","minRoster":2,"maxRoster":8},"match":{"kind":"single_round","targetHeatSize":8,"minHeatSize":2},"cadence":{"unit":"single_week","roundCount":1,"scoreMode":"round_window"},"scoring":{"mode":"relay_handoff","legsPerDay":1,"assignmentMode":"manual","lockPolicy":"full_week","maxLegsPerMember":4},"divisionMode":"none"}'::jsonb,
      v_live_open, v_live_start, v_live_start, v_live_end, true, true, v_alice_uid
    ) returning id into v_ed_id;

    insert into public.special_event_entries(edition_id, user_id, requested_crew_id, entry_rating, registered_at, status)
    select v_ed_id, cm.user_id, cm.crew_id,
      coalesce((select r.verified_elo from public.sport_ratings r where r.user_id = cm.user_id and r.sport = 'running'), 1050),
      v_live_open + interval '1 day', 'registered'
    from public.crew_members cm
    where cm.crew_id in (v_crew_a, v_crew_c) and cm.user_id = any(v_all) and cm.status = 'active'
    on conflict (edition_id, user_id) do nothing;

    perform private.finalize_special_event(v_ed_id, true);
  end if;

  -- 3. Active Live: Metro 2v2 (Running, canonical city_slug squads + spectator seating).
  if not exists (select 1 from public.special_event_editions where slug = 'demo-metro-2v2') then
    insert into public.special_event_editions(
      slug, series_key, sport, title, subtitle, config,
      registration_opens_at, registration_closes_at, starts_at, ends_at, published, demo_only, created_by
    ) values (
      'demo-metro-2v2', 'running-city-squads', 'running',
      'Metro 2v2', 'Pool scores with a teammate from your city',
      '{"version":1,"grouping":{"kind":"profile_attr","attr":"city_slug","targetSquadSize":2,"minSquadSize":2,"leftoverPolicy":"spectate"},"match":{"kind":"single_round","targetHeatSize":4,"minHeatSize":2},"cadence":{"unit":"single_week","roundCount":1,"scoreMode":"round_window"},"scoring":{"mode":"total_volume"},"divisionMode":"rating_tiers"}'::jsonb,
      v_live_open, v_live_start, v_live_start, v_live_end, true, true, v_alice_uid
    ) returning id into v_ed_id;

    insert into public.special_event_entries(edition_id, user_id, group_snapshot, entry_rating, registered_at, status)
    select v_ed_id, p.id, jsonb_build_object('city_slug', coalesce(p.city_slug, 'us:new-york')),
      coalesce((select r.verified_elo from public.sport_ratings r where r.user_id = p.id and r.sport = 'running'), 1050),
      v_live_open + interval '1 day', 'registered'
    from public.profiles p where p.id = any(v_all);

    perform private.finalize_special_event(v_ed_id, true);
  end if;

  -- 4. Open Pre-Registration: Knockout Cup (Cycling, 3-week 1v1 bracket starting next Mon 6 AM ET).
  if not exists (select 1 from public.special_event_editions where slug = 'demo-knockout-cup') then
    insert into public.special_event_editions(
      slug, series_key, sport, title, subtitle, config,
      registration_opens_at, registration_closes_at, starts_at, ends_at, published, demo_only, created_by
    ) values (
      'demo-knockout-cup', 'cycling-weekly-knockout', 'cycling',
      'Knockout Cup', '3-week 1v1 elimination bracket',
      '{"version":1,"grouping":{"kind":"solo"},"match":{"kind":"knockout_1v1","maxBracketSize":16,"minBracketSize":2},"cadence":{"unit":"weekly","roundCount":3,"scoreMode":"round_window"},"scoring":{"mode":"total_volume"},"divisionMode":"rating_tiers"}'::jsonb,
      v_next_open, v_next_start, v_next_start, v_next_end3, true, true, v_alice_uid
    ) returning id into v_ed_id;

    insert into public.special_event_entries(edition_id, user_id, entry_rating, registered_at, status)
    select v_ed_id, u, coalesce((select r.verified_elo from public.sport_ratings r where r.user_id = u and r.sport = 'cycling'), 1050),
      v_now - interval '2 hours', 'registered'
    from unnest(array[v_alice_uid, v_bob_uid, v_marcus_uid, v_priya_uid]) as u
    where u = any(v_all);
  end if;

  -- 5. Open Pre-Registration: Nations 3v3 (Running, Country squads starting next Mon 6 AM ET).
  if not exists (select 1 from public.special_event_editions where slug = 'demo-nations-3v3') then
    insert into public.special_event_editions(
      slug, series_key, sport, title, subtitle, config,
      registration_opens_at, registration_closes_at, starts_at, ends_at, published, demo_only, created_by
    ) values (
      'demo-nations-3v3', 'running-country-squads', 'running',
      'Nations 3v3', 'Pool scores with 2 teammates from your country',
      '{"version":1,"grouping":{"kind":"profile_attr","attr":"country_code","targetSquadSize":3,"minSquadSize":2,"leftoverPolicy":"spectate"},"match":{"kind":"single_round","targetHeatSize":4,"minHeatSize":2},"cadence":{"unit":"single_week","roundCount":1,"scoreMode":"round_window"},"scoring":{"mode":"total_volume"},"divisionMode":"rating_tiers"}'::jsonb,
      v_next_open, v_next_start, v_next_start, v_next_end1, true, true, v_alice_uid
    ) returning id into v_ed_id;

    insert into public.special_event_entries(edition_id, user_id, group_snapshot, entry_rating, registered_at, status)
    select v_ed_id, p.id, jsonb_build_object('country_code', coalesce(p.country_code, 'US')),
      coalesce((select r.verified_elo from public.sport_ratings r where r.user_id = p.id and r.sport = 'running'), 1050),
      v_now - interval '1 hour', 'registered'
    from public.profiles p
    where p.id in (v_alice_uid, v_bob_uid, v_carla_uid, v_marcus_uid) and p.id = any(v_all);
  end if;
end;
$$;
