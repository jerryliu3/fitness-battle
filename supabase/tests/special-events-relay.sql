-- Run after migrations inside a rollback-only transaction. Not a seed.
do $$
<<fixture>>
declare
  admin_id uuid := gen_random_uuid();
  a1 uuid := gen_random_uuid(); a2 uuid := gen_random_uuid(); a_watch uuid := gen_random_uuid();
  b1 uuid := gen_random_uuid(); b2 uuid := gen_random_uuid();
  crew_a uuid := gen_random_uuid(); crew_b uuid := gen_random_uuid();
  now_at timestamptz := clock_timestamp();
  start_at timestamptz;
  day1 date;
  relay_manual public.special_event_editions;
  relay_random public.special_event_editions;
  lineup jsonb;
  standings jsonb;
begin
  insert into auth.users(id, email) values
    (admin_id, admin_id::text || '@test.invalid'),
    (a1, a1::text || '@test.invalid'), (a2, a2::text || '@test.invalid'), (a_watch, a_watch::text || '@test.invalid'),
    (b1, b1::text || '@test.invalid'), (b2, b2::text || '@test.invalid');

  insert into public.profiles(id, display_name) values
    (admin_id, 'Admin'), (a1, 'Alice'), (a2, 'Aaron'), (a_watch, 'Watcher'), (b1, 'Ben'), (b2, 'Bea')
  on conflict (id) do update set display_name = excluded.display_name;

  insert into public.crews(id, name, invite_code, sport, created_by) values
    (crew_a, 'Alpha Crew', substr(crew_a::text, 1, 8), 'running', a1),
    (crew_b, 'Beta Crew', substr(crew_b::text, 1, 8), 'running', b1);
  insert into public.crew_members(crew_id, user_id, display_name) values
    (crew_a, a1, 'Alice'), (crew_a, a2, 'Aaron'), (crew_a, a_watch, 'Watcher'),
    (crew_b, b1, 'Ben'), (crew_b, b2, 'Bea');

  start_at := ((now_at at time zone 'America/New_York')::date::timestamp + interval '6 hours') at time zone 'America/New_York';
  day1 := (start_at at time zone 'America/New_York')::date;

  -- 1. Manual full-week locked Crew Relay.
  relay_manual := public.admin_save_special_event_edition(
    admin_id, null, 'test-crew-relay-' || substr(admin_id::text, 1, 8), 'crew-relay', 'running',
    'Crew Relay', '1 baton per day',
    '{"version":1,"grouping":{"kind":"crew","minRoster":2,"maxRoster":8},"match":{"kind":"single_round","targetHeatSize":8,"minHeatSize":2},"cadence":{"unit":"single_week","roundCount":1,"scoreMode":"round_window"},"scoring":{"mode":"relay_handoff","legsPerDay":1,"assignmentMode":"manual","lockPolicy":"full_week","maxLegsPerMember":4},"divisionMode":"none"}'::jsonb,
    now_at - interval '1 day', now_at + interval '1 day', now_at + interval '1 day', now_at + interval '8 days', true
  );

  perform set_config('request.jwt.claim.sub', a1::text, true); perform public.register_special_event(relay_manual.id, crew_a, null);
  perform set_config('request.jwt.claim.sub', a2::text, true); perform public.register_special_event(relay_manual.id, crew_a, null);
  perform set_config('request.jwt.claim.sub', b1::text, true); perform public.register_special_event(relay_manual.id, crew_b, null);
  perform set_config('request.jwt.claim.sub', b2::text, true); perform public.register_special_event(relay_manual.id, crew_b, null);

  -- Set Day 1 baton to Alice before start (after aligning start_at to today).
  update public.special_event_editions
  set starts_at = start_at + interval '1 day', registration_closes_at = start_at + interval '1 day', ends_at = start_at + interval '8 days'
  where id = relay_manual.id;

  perform set_config('request.jwt.claim.sub', a1::text, true);
  perform public.set_special_event_relay_legs(
    relay_manual.id, crew_a,
    jsonb_build_array(jsonb_build_object('legDay', (day1 + 1)::text, 'slotIndex', 1, 'userId', a1))
  );

  -- Finalize -> locks full week and fills all 7 days evenly.
  perform public.admin_advance_special_event(admin_id, relay_manual.id, 'finalize');
  lineup := public.special_event_relay_lineup(relay_manual.id, crew_a);
  if jsonb_array_length(lineup->'legs') <> 7 then
    raise exception 'expected 7 daily relay legs, got %', jsonb_array_length(lineup->'legs');
  end if;

  -- Full-week lock rejects mid-week edits.
  begin
    perform public.set_special_event_relay_legs(
      relay_manual.id, crew_a,
      jsonb_build_array(jsonb_build_object('legDay', (day1 + 2)::text, 'slotIndex', 1, 'userId', a2))
    );
    raise exception 'edited locked full-week relay lineup';
  exception when others then
    if sqlerrm <> 'relay_lineup_locked' then raise; end if;
  end;

  -- Non-participating crewmate (Watcher) can still view Crew Relay standings; opponent PII stays hidden.
  perform set_config('request.jwt.claim.sub', a_watch::text, true);
  standings := public.special_event_standings(relay_manual.id);
  if jsonb_array_length(standings->'rounds'->0->'heats'->0->'sides') <> 2 then
    raise exception 'expected 2 crews in heat standings';
  end if;
  if exists (
    select 1 from jsonb_array_elements(standings->'rounds'->0->'heats'->0->'sides') s
    where s->>'userId' is not null
  ) then
    raise exception 'crew standings leaked athlete userId';
  end if;

  -- 2. Random Draw Relay rejects manual edits and hides legs until start.
  relay_random := public.admin_save_special_event_edition(
    admin_id, null, 'test-rand-relay-' || substr(admin_id::text, 1, 8), 'crew-relay-random', 'running',
    'Mystery Baton', 'Random draw',
    '{"version":1,"grouping":{"kind":"crew","minRoster":2,"maxRoster":8},"match":{"kind":"single_round","targetHeatSize":8,"minHeatSize":2},"cadence":{"unit":"single_week","roundCount":1,"scoreMode":"round_window"},"scoring":{"mode":"relay_handoff","legsPerDay":1,"assignmentMode":"random","lockPolicy":"full_week","maxLegsPerMember":4},"divisionMode":"none"}'::jsonb,
    now_at - interval '1 day', now_at + interval '1 day', now_at + interval '1 day', now_at + interval '8 days', true
  );
  perform set_config('request.jwt.claim.sub', a1::text, true); perform public.register_special_event(relay_random.id, crew_a, null);
  perform set_config('request.jwt.claim.sub', a2::text, true); perform public.register_special_event(relay_random.id, crew_a, null);
  perform set_config('request.jwt.claim.sub', b1::text, true); perform public.register_special_event(relay_random.id, crew_b, null);
  perform set_config('request.jwt.claim.sub', b2::text, true); perform public.register_special_event(relay_random.id, crew_b, null);

  begin
    perform public.set_special_event_relay_legs(relay_random.id, crew_a, '[]'::jsonb);
    raise exception 'manual edit allowed on random relay';
  exception when others then
    if sqlerrm <> 'relay_random_locked' then raise; end if;
  end;

  perform public.admin_advance_special_event(admin_id, relay_random.id, 'finalize');
  lineup := public.special_event_relay_lineup(relay_random.id, crew_a);
  if jsonb_array_length(lineup->'legs') <> 7 then
    raise exception 'expected 7 randomly drawn legs after finalize';
  end if;
end;
$$;
