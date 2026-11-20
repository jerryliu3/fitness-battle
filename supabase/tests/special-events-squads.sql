-- Run after migrations inside a rollback-only transaction. Not a seed.
do $$
<<fixture>>
declare
  admin_id uuid := gen_random_uuid();
  us1 uuid := gen_random_uuid(); us2 uuid := gen_random_uuid(); us3 uuid := gen_random_uuid();
  us4 uuid := gen_random_uuid(); us5 uuid := gen_random_uuid();
  ca1 uuid := gen_random_uuid(); ca2 uuid := gen_random_uuid(); ca3 uuid := gen_random_uuid();
  jp1 uuid := gen_random_uuid();
  category uuid := (select id from public.categories where slug = 'running' limit 1);
  now_at timestamptz := clock_timestamp();
  start_at timestamptz := now_at - interval '2 hours';
  cup public.special_event_editions;
  small_cup public.special_event_editions;
  us_view jsonb;
  jp_view jsonb;
begin
  insert into auth.users(id, email) values
    (admin_id, admin_id::text || '@test.invalid'),
    (us1, us1::text || '@test.invalid'), (us2, us2::text || '@test.invalid'), (us3, us3::text || '@test.invalid'),
    (us4, us4::text || '@test.invalid'), (us5, us5::text || '@test.invalid'),
    (ca1, ca1::text || '@test.invalid'), (ca2, ca2::text || '@test.invalid'), (ca3, ca3::text || '@test.invalid'),
    (jp1, jp1::text || '@test.invalid');

  insert into public.profiles(id, display_name, country_code) values
    (admin_id, 'Admin', 'US'),
    (us1, 'US One', 'US'), (us2, 'US Two', 'US'), (us3, 'US Three', 'US'), (us4, 'US Four', 'US'), (us5, 'US Five', 'US'),
    (ca1, 'CA One', 'CA'), (ca2, 'CA Two', 'CA'), (ca3, 'CA Three', 'CA'),
    (jp1, 'JP Solo', 'JP')
  on conflict (id) do update set display_name = excluded.display_name, country_code = excluded.country_code;

  insert into public.sport_ratings(user_id, sport, open_elo, verified_elo, opted_in) values
    (us1, 'running', 1900, 1900, true), (us2, 'running', 1800, 1800, true), (us3, 'running', 1700, 1700, true),
    (us4, 'running', 1200, 1200, true), (us5, 'running', 1100, 1100, true),
    (ca1, 'running', 1850, 1850, true), (ca2, 'running', 1750, 1750, true), (ca3, 'running', 1650, 1650, true),
    (jp1, 'running', 1500, 1500, true)
  on conflict (user_id, sport) do update set verified_elo = excluded.verified_elo;

  -- 1. Country 3v3 with 5 US + 3 CA + 1 JP -> forms 2 equal 3-person squads; 2 US + 1 JP become spectators.
  cup := public.admin_save_special_event_edition(
    admin_id, null, 'test-country-3v3-' || substr(admin_id::text, 1, 8), 'country-squads', 'running',
    'Nations 3v3', 'Equal-size country squads',
    '{"version":1,"grouping":{"kind":"profile_attr","attr":"country_code","targetSquadSize":3,"minSquadSize":2,"leftoverPolicy":"spectate"},"match":{"kind":"single_round","targetHeatSize":4,"minHeatSize":2},"cadence":{"unit":"single_week","roundCount":1,"scoreMode":"round_window"},"scoring":{"mode":"total_volume"},"divisionMode":"rating_tiers"}'::jsonb,
    now_at - interval '1 day', now_at + interval '1 day', now_at + interval '1 day', now_at + interval '8 days', true
  );

  for i in 1..9 loop
    perform set_config('request.jwt.claim.sub', (array[us1, us2, us3, us4, us5, ca1, ca2, ca3, jp1])[i]::text, true);
    perform public.register_special_event(cup.id, null, null);
  end loop;

  update public.special_event_editions
  set starts_at = start_at, registration_closes_at = start_at, registration_opens_at = start_at - interval '7 days', ends_at = start_at + interval '7 days'
  where id = cup.id;

  perform public.admin_advance_special_event(admin_id, cup.id, 'finalize');

  if (select count(*) from public.special_event_sides where edition_id = cup.id) <> 2 then
    raise exception 'expected 2 equal 3-person squads';
  end if;
  if (select count(*) from public.special_event_entries where edition_id = cup.id and status = 'spectating' and spectate_heat_id is not null) <> 3 then
    raise exception 'expected 3 unseated leftovers in spectating status with heat link';
  end if;

  -- Add verified runs for US #1 (us1=4000m, us2=3000m) and CA #1 (ca1=5000m); leftover us4's run MUST NOT add to US #1!
  insert into public.activities(user_id, provider, external_id, category_id, started_at, metric_value, sport, distance_m, moving_sec, verified, provenance, disposition, compete_key)
  values
    (us1, 'strava', 'sq-us1', category, start_at + interval '30 minutes', 4000, 'running', 4000, 1200, true, 'recorded', 'counted', 'sq-us1'),
    (us2, 'strava', 'sq-us2', category, start_at + interval '30 minutes', 3000, 'running', 3000, 900, true, 'recorded', 'counted', 'sq-us2'),
    (us4, 'strava', 'sq-us4', category, start_at + interval '30 minutes', 9000, 'running', 9000, 2700, true, 'recorded', 'counted', 'sq-us4'),
    (ca1, 'strava', 'sq-ca1', category, start_at + interval '30 minutes', 5000, 'running', 5000, 1500, true, 'recorded', 'counted', 'sq-ca1');

  perform set_config('request.jwt.claim.sub', us1::text, true);
  us_view := public.special_event_standings(cup.id);
  if (us_view->'rounds'->0->'heats'->0->'sides'->0->>'groupValue') <> 'US'
    or (us_view->'rounds'->0->'heats'->0->'sides'->0->>'score')::numeric <> 7000 then
    raise exception 'expected US #1 pooled score 7000 (excluding spectator us4), got %', us_view->'rounds'->0->'heats'->0->'sides'->0;
  end if;
  if jsonb_array_length(us_view->'mySquad') <> 3 then
    raise exception 'expected 3 teammates in own squad breakdown';
  end if;
  if exists (select 1 from jsonb_array_elements(us_view->'rounds'->0->'heats'->0->'sides') s where s->>'userId' is not null) then
    raise exception 'squad standings leaked opponent userId';
  end if;

  -- Unseated JP spectator can watch live standings with empty mySquad.
  perform set_config('request.jwt.claim.sub', jp1::text, true);
  jp_view := public.special_event_standings(cup.id);
  if jp_view->>'myStatus' <> 'spectating' or jsonb_array_length(jp_view->'mySquad') <> 0 then
    raise exception 'expected spectator view for unseated JP entrant';
  end if;

  -- 2. Low-liquidity adaptive step-down: 2 US + 2 CA on a targetSquadSize=3 / minSquadSize=2 edition -> 2v2!
  small_cup := public.admin_save_special_event_edition(
    admin_id, null, 'test-country-2v2-' || substr(admin_id::text, 1, 8), 'country-squads', 'running',
    'Adaptive Nations', 'Steps down to 2v2',
    '{"version":1,"grouping":{"kind":"profile_attr","attr":"country_code","targetSquadSize":3,"minSquadSize":2,"leftoverPolicy":"spectate"},"match":{"kind":"single_round","targetHeatSize":4,"minHeatSize":2},"cadence":{"unit":"single_week","roundCount":1,"scoreMode":"round_window"},"scoring":{"mode":"total_volume"},"divisionMode":"rating_tiers"}'::jsonb,
    now_at - interval '1 day', now_at + interval '1 day', now_at + interval '1 day', now_at + interval '8 days', true
  );
  for i in 1..4 loop
    perform set_config('request.jwt.claim.sub', (array[us1, us2, ca1, ca2])[i]::text, true);
    perform public.register_special_event(small_cup.id, null, null);
  end loop;
  perform public.admin_advance_special_event(admin_id, small_cup.id, 'finalize');
  if (select count(*) from public.special_event_sides where edition_id = small_cup.id) <> 2 then
    raise exception 'expected adaptive step-down to 2 equal 2-person squads';
  end if;
end;
$$;
