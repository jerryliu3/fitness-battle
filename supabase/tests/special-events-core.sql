-- Run after migrations inside a rollback-only transaction. Not a seed.
do $$
<<fixture>>
declare
  admin_id uuid := gen_random_uuid();
  runner_a uuid := gen_random_uuid();
  runner_b uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
  crew_id uuid := gen_random_uuid();
  category uuid := (select id from public.categories where slug = 'running' limit 1);
  now_at timestamptz := clock_timestamp();
  open_edition public.special_event_editions;
  closed_edition public.special_event_editions;
  relay_edition public.special_event_editions;
  country_edition public.special_event_editions;
  draft_edition public.special_event_editions;
  side_a uuid;
  round_id uuid;
  heat_id uuid;
  day1 date;
  day2 date;
  day1_start timestamptz;
  day1_end timestamptz;
  listed jsonb;
  scored numeric;
begin
  insert into auth.users(id, email) values
    (admin_id, admin_id::text || '@test.invalid'),
    (runner_a, runner_a::text || '@test.invalid'),
    (runner_b, runner_b::text || '@test.invalid'),
    (outsider, outsider::text || '@test.invalid');

  insert into public.profiles(id, display_name, country_code) values
    (admin_id, 'Admin', 'US'),
    (runner_a, 'Runner A', 'US'),
    (runner_b, 'Runner B', 'CA'),
    (outsider, 'Outsider', null)
  on conflict (id) do update set display_name = excluded.display_name, country_code = excluded.country_code;

  insert into public.sport_ratings(user_id, sport, open_elo, verified_elo, opted_in)
  values (runner_a, 'running', 1200, 1450, true)
  on conflict (user_id, sport) do update set verified_elo = excluded.verified_elo;

  insert into public.crews(id, name, invite_code, sport, created_by)
  values (crew_id, 'Relay Test Crew', substr(crew_id::text, 1, 8), 'running', runner_a);
  insert into public.crew_members(crew_id, user_id, display_name)
  values (crew_id, runner_a, 'Runner A'), (crew_id, runner_b, 'Runner B');

  -- 1. Admin creates published registering, closed, relay, country, and unpublished draft editions.
  open_edition := public.admin_save_special_event_edition(
    admin_id, null, 'test-survivor-' || substr(admin_id::text, 1, 8), 'running-survivor', 'running',
    'Daily Survivor', '1 eliminated each day',
    '{"version":1,"grouping":{"kind":"solo"},"match":{"kind":"survivor_heat","targetHeatSize":8,"minHeatSize":3,"eliminatePerRound":1},"cadence":{"unit":"daily","roundCount":7,"scoreMode":"round_window"},"scoring":{"mode":"total_volume"},"divisionMode":"rating_tiers"}'::jsonb,
    now_at - interval '1 day', now_at + interval '2 days', now_at + interval '2 days', now_at + interval '9 days', true
  );

  closed_edition := public.admin_save_special_event_edition(
    admin_id, null, 'test-closed-' || substr(admin_id::text, 1, 8), 'running-survivor', 'running',
    'Already Started', 'No partial weeks',
    '{"version":1,"grouping":{"kind":"solo"},"match":{"kind":"knockout_1v1","maxBracketSize":16,"minBracketSize":2},"cadence":{"unit":"weekly","roundCount":3,"scoreMode":"round_window"},"scoring":{"mode":"total_volume"},"divisionMode":"rating_tiers"}'::jsonb,
    now_at - interval '8 days', now_at - interval '1 hour', now_at - interval '1 hour', now_at + interval '6 days', true
  );

  relay_edition := public.admin_save_special_event_edition(
    admin_id, null, 'test-relay-' || substr(admin_id::text, 1, 8), 'crew-relay-run', 'running',
    'Crew Relay', 'Daily baton handoff',
    '{"version":1,"grouping":{"kind":"crew","minRoster":2,"maxRoster":8},"match":{"kind":"single_round","targetHeatSize":8,"minHeatSize":2},"cadence":{"unit":"single_week","roundCount":1,"scoreMode":"round_window"},"scoring":{"mode":"relay_handoff","legsPerDay":1,"assignmentMode":"manual","lockPolicy":"full_week","maxLegsPerMember":4},"divisionMode":"none"}'::jsonb,
    now_at - interval '1 day', now_at + interval '2 days', now_at + interval '2 days', now_at + interval '9 days', true
  );

  country_edition := public.admin_save_special_event_edition(
    admin_id, null, 'test-country-' || substr(admin_id::text, 1, 8), 'country-squads', 'running',
    'Country 3v3', 'Equal-size country squads',
    '{"version":1,"grouping":{"kind":"profile_attr","attr":"country_code","targetSquadSize":3,"minSquadSize":2,"leftoverPolicy":"spectate"},"match":{"kind":"single_round","targetHeatSize":4,"minHeatSize":2},"cadence":{"unit":"single_week","roundCount":1,"scoreMode":"round_window"},"scoring":{"mode":"total_volume"},"divisionMode":"rating_tiers"}'::jsonb,
    now_at - interval '1 day', now_at + interval '2 days', now_at + interval '2 days', now_at + interval '9 days', true
  );

  draft_edition := public.admin_save_special_event_edition(
    admin_id, null, 'test-draft-' || substr(admin_id::text, 1, 8), 'draft-series', 'running',
    'Unpublished Draft', 'Hidden',
    '{"version":1,"grouping":{"kind":"solo"},"match":{"kind":"single_round","targetHeatSize":8,"minHeatSize":2},"cadence":{"unit":"single_week","roundCount":1,"scoreMode":"round_window"},"scoring":{"mode":"total_volume"},"divisionMode":"none"}'::jsonb,
    now_at - interval '1 day', now_at + interval '2 days', now_at + interval '2 days', now_at + interval '9 days', false
  );

  -- 2. Runner A registers and cancels before cutoff, then re-registers.
  perform set_config('request.jwt.claim.sub', runner_a::text, true);
  perform public.register_special_event(open_edition.id, null, null);
  if (select entry_rating from public.special_event_entries where edition_id = open_edition.id and user_id = runner_a) <> 1450 then
    raise exception 'expected verified_elo snapshot 1450';
  end if;
  perform public.cancel_special_event(open_edition.id);
  if (select status from public.special_event_entries where edition_id = open_edition.id and user_id = runner_a) <> 'cancelled' then
    raise exception 'expected cancelled status';
  end if;
  perform public.register_special_event(open_edition.id, null, null);

  -- 3. No partial-week joins: registration after cutoff is rejected.
  begin
    perform public.register_special_event(closed_edition.id, null, null);
    raise exception 'late partial-week join allowed';
  exception when others then
    if sqlerrm <> 'registration_closed' then raise; end if;
  end;

  -- 4. Crew validation & country validation.
  perform public.register_special_event(relay_edition.id, crew_id, null);
  perform public.register_special_event(country_edition.id, null, null);
  if (select group_snapshot->>'country_code' from public.special_event_entries where edition_id = country_edition.id and user_id = runner_a) <> 'US' then
    raise exception 'country_code snapshot missing';
  end if;

  -- Outsider cannot join crew relay for a crew they are not in, nor country event without a country.
  perform set_config('request.jwt.claim.sub', outsider::text, true);
  begin
    perform public.register_special_event(relay_edition.id, crew_id, null);
    raise exception 'non-member joined crew relay';
  exception when others then
    if sqlerrm <> 'not_a_crew_member' then raise; end if;
  end;
  begin
    perform public.register_special_event(country_edition.id, null, null);
    raise exception 'missing country accepted';
  exception when others then
    if sqlerrm <> 'country_required' then raise; end if;
  end;

  -- Unpublished draft must not appear in list_special_events.
  listed := public.list_special_events();
  if exists (select 1 from jsonb_array_elements(listed) x where (x->>'id')::uuid = draft_edition.id) then
    raise exception 'unpublished draft leaked';
  end if;

  -- 5. Daily baton relay scoring + midnight deadline freeze check.
  day1 := ((now_at at time zone 'America/New_York')::date - 2);
  day2 := day1 + 1;
  day1_start := (day1::timestamp + interval '6 hours') at time zone 'America/New_York';
  day1_end := (day2::timestamp) at time zone 'America/New_York';

  update public.special_event_editions
  set starts_at = day1_start, ends_at = day1_end + interval '6 days', registration_closes_at = day1_start, registration_opens_at = day1_start - interval '7 days'
  where id = relay_edition.id;

  insert into public.special_event_sides(edition_id, side_kind, crew_id, display_name, entry_rating, roster_locked_at)
  values (relay_edition.id, 'crew', crew_id, 'Relay Test Crew', 1300, day1_start)
  returning id into side_a;

  update public.special_event_entries set side_id = side_a, status = 'active'
  where edition_id = relay_edition.id and user_id = runner_a;
  insert into public.special_event_entries(edition_id, user_id, side_id, requested_crew_id, status)
  values (relay_edition.id, runner_b, side_a, crew_id, 'active');

  -- Day 1 baton belongs ONLY to Runner A; Day 2 baton belongs ONLY to Runner B.
  insert into public.special_event_relay_legs(side_id, leg_day, slot_index, user_id)
  values (side_a, day1, 1, runner_a), (side_a, day2, 1, runner_b);

  insert into public.special_event_rounds(edition_id, round_number, starts_at, ends_at, heat_size, advance_count, score_mode)
  values (relay_edition.id, 1, day1_start, day1_end, 8, 1, 'round_window')
  returning id into round_id;
  insert into public.special_event_heats(round_id, division_key, heat_index, side_ids)
  values (round_id, 'open', 1, array[side_a])
  returning id into heat_id;

  -- Runner A runs 5000m on Day 1 (counts!), Runner B runs 9000m on Day 1 (off-leg -> MUST NOT count!).
  insert into public.activities(user_id, provider, external_id, category_id, started_at, metric_value, sport, distance_m, moving_sec, verified, provenance, disposition, compete_key)
  values
    (runner_a, 'strava', 'se-a-d1', category, day1_start + interval '2 hours', 5000, 'running', 5000, 1500, true, 'recorded', 'counted', 'se-a-d1'),
    (runner_b, 'strava', 'se-b-d1', category, day1_start + interval '3 hours', 9000, 'running', 9000, 2700, true, 'recorded', 'counted', 'se-b-d1');
  -- Simulate facts accepted before Day 1 midnight close.
  update private.competition_fact_versions
  set accepted_at = day1_start + interval '4 hours'
  where owner_id in (runner_a, runner_b);

  -- Late-imported run for Runner A after Day 1 midnight close MUST NOT alter Day 1 score.
  insert into public.activities(user_id, provider, external_id, category_id, started_at, metric_value, sport, distance_m, moving_sec, verified, provenance, disposition, compete_key)
  values (runner_a, 'strava', 'se-a-d1-late', category, day1_start + interval '5 hours', 8000, 'running', 8000, 2400, true, 'recorded', 'counted', 'se-a-d1-late');

  select score into scored from private.special_event_heat_scores(heat_id) where side_id = side_a;
  if scored <> 5000 then
    raise exception 'expected relay Day 1 score 5000 (baton-gated & deadline-frozen), got %', scored;
  end if;

  -- 6. Privilege & RLS checks.
  if has_table_privilege('authenticated', 'public.special_event_editions', 'INSERT')
    or has_table_privilege('authenticated', 'public.special_event_entries', 'UPDATE')
    or has_table_privilege('authenticated', 'public.special_event_receipts', 'INSERT') then
    raise exception 'direct special event writes granted to authenticated';
  end if;
  if has_function_privilege('authenticated', 'private.special_event_heat_scores(uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.list_special_events()', 'EXECUTE') then
    raise exception 'special event RPC permissions too broad';
  end if;

  set local role authenticated;
  if exists (select 1 from public.special_event_editions where id = draft_edition.id) then
    raise exception 'RLS exposed unpublished special event';
  end if;
  if exists (select 1 from public.special_event_entries where user_id = runner_a) then
    raise exception 'RLS exposed another athlete entry';
  end if;
  reset role;
end;
$$;
