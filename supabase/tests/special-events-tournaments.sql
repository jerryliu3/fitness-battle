-- Run after migrations inside a rollback-only transaction. Not a seed.
do $$
<<fixture>>
declare
  admin_id uuid := gen_random_uuid();
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); u3 uuid := gen_random_uuid();
  u4 uuid := gen_random_uuid(); u5 uuid := gen_random_uuid(); u6 uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
  category uuid := (select id from public.categories where slug = 'running' limit 1);
  now_at timestamptz := clock_timestamp();
  day1_start timestamptz;
  survivor public.special_event_editions;
  bracket public.special_event_editions;
  view_json jsonb;
begin
  insert into auth.users(id, email) values
    (admin_id, admin_id::text || '@test.invalid'),
    (u1, u1::text || '@test.invalid'), (u2, u2::text || '@test.invalid'),
    (u3, u3::text || '@test.invalid'), (u4, u4::text || '@test.invalid'),
    (u5, u5::text || '@test.invalid'), (u6, u6::text || '@test.invalid'),
    (outsider, outsider::text || '@test.invalid');

  insert into public.profiles(id, display_name) values
    (admin_id, 'Admin'), (u1, 'Seed 1'), (u2, 'Seed 2'), (u3, 'Seed 3'),
    (u4, 'Seed 4'), (u5, 'Seed 5'), (u6, 'Seed 6'), (outsider, 'Outsider')
  on conflict (id) do update set display_name = excluded.display_name;

  insert into public.sport_ratings(user_id, sport, open_elo, verified_elo, opted_in) values
    (u1, 'running', 1800, 1800, true), (u2, 'running', 1700, 1700, true),
    (u3, 'running', 1600, 1600, true), (u4, 'running', 1500, 1500, true),
    (u5, 'running', 1400, 1400, true), (u6, 'running', 1300, 1300, true)
  on conflict (user_id, sport) do update set verified_elo = excluded.verified_elo;

  -- 1. Daily Survivor with 4 real athletes (adaptive -> 3 daily rounds, 1 out/day, daily score reset).
  day1_start := (((now_at at time zone 'America/New_York')::date - 3)::timestamp + interval '6 hours') at time zone 'America/New_York';
  survivor := public.admin_save_special_event_edition(
    admin_id, null, 'test-daily-surv-' || substr(admin_id::text, 1, 8), 'running-survivor', 'running',
    'Daily Survivor', '1 out each night',
    '{"version":1,"grouping":{"kind":"solo"},"match":{"kind":"survivor_heat","targetHeatSize":8,"minHeatSize":3,"eliminatePerRound":1},"cadence":{"unit":"daily","roundCount":7,"scoreMode":"round_window"},"scoring":{"mode":"total_volume"},"divisionMode":"rating_tiers"}'::jsonb,
    now_at - interval '1 day', now_at + interval '1 day', now_at + interval '1 day', now_at + interval '8 days', true
  );

  for i in 1..4 loop
    perform set_config('request.jwt.claim.sub', (array[u1, u2, u3, u4])[i]::text, true);
    perform public.register_special_event(survivor.id, null, null);
  end loop;

  -- Backdate window so Day 1 already ended and Day 2 is active.
  update public.special_event_editions
  set registration_opens_at = day1_start - interval '7 days', registration_closes_at = day1_start,
      starts_at = day1_start, ends_at = day1_start + interval '7 days'
  where id = survivor.id;

  -- Seed Day 1 runs: u1=8km, u2=6km, u3=4km, u4=1km (u4 eliminated in Round 1).
  insert into public.activities(user_id, provider, external_id, category_id, started_at, metric_value, sport, distance_m, moving_sec, verified, provenance, disposition, compete_key)
  values
    (u1, 'strava', 't-d1-1', category, day1_start + interval '2 hours', 8000, 'running', 8000, 2400, true, 'recorded', 'counted', 't-d1-1'),
    (u2, 'strava', 't-d1-2', category, day1_start + interval '2 hours', 6000, 'running', 6000, 1800, true, 'recorded', 'counted', 't-d1-2'),
    (u3, 'strava', 't-d1-3', category, day1_start + interval '2 hours', 4000, 'running', 4000, 1200, true, 'recorded', 'counted', 't-d1-3'),
    (u4, 'strava', 't-d1-4', category, day1_start + interval '2 hours', 1000, 'running', 1000, 400, true, 'recorded', 'counted', 't-d1-4');
  update private.competition_fact_versions set accepted_at = day1_start + interval '3 hours' where owner_id in (u1, u2, u3, u4);

  perform set_config('request.jwt.claim.sub', u1::text, true);
  view_json := public.special_event_standings(survivor.id);
  if (select count(*) from public.special_event_rounds where edition_id = survivor.id) <> 3 then
    raise exception 'expected 3 adaptive daily rounds for 4 athletes';
  end if;
  -- Since day1_start was 3 days ago, all 3 daily rounds should catch up and settle in a single call!
  if (select count(*) from public.special_event_rounds where edition_id = survivor.id and settled_at is not null) <> 3
    or (select settled_at from public.special_event_editions where id = survivor.id) is null then
    raise exception 'expected multi-day catch-up settlement in a single call';
  end if;
  if (select status from public.special_event_entries where edition_id = survivor.id and user_id = u4) <> 'eliminated'
    or (select eliminated_round from public.special_event_entries where edition_id = survivor.id and user_id = u4) <> 1 then
    raise exception 'expected u4 eliminated in Round 1';
  end if;

  -- Outsider cannot view standings.
  perform set_config('request.jwt.claim.sub', outsider::text, true);
  begin
    perform public.special_event_standings(survivor.id);
    raise exception 'outsider viewed standings';
  exception when others then
    if sqlerrm <> 'not_registered' then raise; end if;
  end;

  -- 2. Weekly 1v1 Bracket with 6 real athletes -> 8-slot bracket with 2 top-seed byes (zero bots!).
  bracket := public.admin_save_special_event_edition(
    admin_id, null, 'test-ko-' || substr(admin_id::text, 1, 8), 'running-knockout', 'running',
    'Knockout Cup', '1v1 bracket',
    '{"version":1,"grouping":{"kind":"solo"},"match":{"kind":"knockout_1v1","maxBracketSize":8,"minBracketSize":2},"cadence":{"unit":"weekly","roundCount":3,"scoreMode":"round_window"},"scoring":{"mode":"total_volume"},"divisionMode":"rating_tiers"}'::jsonb,
    now_at - interval '1 day', now_at + interval '1 day', now_at + interval '1 day', now_at + interval '22 days', true
  );
  for i in 1..6 loop
    perform set_config('request.jwt.claim.sub', (array[u1, u2, u3, u4, u5, u6])[i]::text, true);
    perform public.register_special_event(bracket.id, null, null);
  end loop;

  perform public.admin_advance_special_event(admin_id, bracket.id, 'finalize');
  if (select count(*) from public.special_event_heats h join public.special_event_rounds r on r.id = h.round_id where r.edition_id = bracket.id and r.round_number = 1) <> 4 then
    raise exception 'expected 4 Round-1 heats for 6-athlete 8-slot bracket';
  end if;
  if (select count(*) from public.special_event_heats h join public.special_event_rounds r on r.id = h.round_id where r.edition_id = bracket.id and r.round_number = 1 and cardinality(h.side_ids) = 1) <> 2 then
    raise exception 'expected 2 bye heats for top seeds';
  end if;

  -- Force-settle Round 1 -> Round 2 should have 2 semifinal heats with top 2 seeds on opposite sides!
  perform public.admin_advance_special_event(admin_id, bracket.id, 'settle_round');
  if (select count(*) from public.special_event_heats h join public.special_event_rounds r on r.id = h.round_id where r.edition_id = bracket.id and r.round_number = 2) <> 2 then
    raise exception 'expected 2 Round-2 semifinal heats';
  end if;
  -- Settle SF and Final -> edition settled with champion receipt.
  perform public.admin_advance_special_event(admin_id, bracket.id, 'settle_round');
  perform public.admin_advance_special_event(admin_id, bracket.id, 'settle_round');
  if (select settled_at from public.special_event_editions where id = bracket.id) is null then
    raise exception 'expected knockout edition settled after Final';
  end if;
  if not exists (select 1 from public.special_event_receipts where edition_id = bracket.id and code = 'champion') then
    raise exception 'expected durable champion receipt';
  end if;
end;
$$;
