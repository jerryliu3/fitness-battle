-- ============================================================================
-- Seed Production & Demo Accounts (test@test.com and demo athletes)
-- ============================================================================
-- Seeds full rich data across all tables for:
--   1. test@test.com - Test production account (running + cycling focus, rich journey & crew)
--   2. alice@example.com, bob@example.com, carla@example.com, dana@example.com
--   3. elena@example.com, marcus@example.com, priya@example.com
--
-- Safe & idempotent:
--   - Uses ON CONFLICT DO UPDATE for all entities
--   - Uses dynamic America/New_York date_trunc('week', now()) relative offsets
--   - Honors existing user IDs if test@test.com was previously created via auth
-- ============================================================================

do $$
declare
  v_test_uid uuid;
  v_alice_uid uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  v_bob_uid   uuid := '22222222-2222-4222-8222-222222222222'::uuid;
  v_carla_uid uuid := '33333333-3333-4333-8333-333333333333'::uuid;
  v_dana_uid  uuid := '44444444-4444-4444-8444-444444444444'::uuid;
  v_elena_uid uuid := '55555555-5555-4555-8555-555555555555'::uuid;
  v_marcus_uid uuid := '66666666-6666-4666-8666-666666666666'::uuid;
  v_priya_uid uuid := '77777777-7777-4777-8777-777777777777'::uuid;

  v_cat_running uuid := '11111111-1111-4111-8111-111111111101'::uuid;
  v_cat_cycling uuid := '11111111-1111-4111-8111-111111111102'::uuid;
  v_cat_walking uuid := '11111111-1111-4111-8111-111111111103'::uuid;
  v_cat_strength uuid := '11111111-1111-4111-8111-111111111104'::uuid;

  v_crew_running uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid;
  v_crew_cycling uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid;

  v_battle_run uuid := '99999999-9999-4999-8999-999999999901'::uuid;
  v_battle_cycle uuid := '99999999-9999-4999-8999-999999999902'::uuid;

  v_week_start timestamptz;
  v_week_end timestamptz;
begin
  -- Calculate Eastern week bounds
  v_week_start := date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York';
  v_week_end   := v_week_start + interval '7 days';

  -- --------------------------------------------------------------------------
  -- 1. Ensure Categories exist
  -- --------------------------------------------------------------------------
  insert into public.categories (id, slug, name, unit, description) values
    (v_cat_running, 'running', 'Running', 'meters', 'Distance covered on foot runs.'),
    (v_cat_cycling, 'cycling', 'Cycling', 'meters', 'Ride distance from your tracker.'),
    (v_cat_walking, 'walking', 'Walking', 'meters', 'Walk and hike distance.'),
    (v_cat_strength, 'strength', 'Strength', 'seconds', 'Session duration from strength workouts.')
  on conflict (slug) do update set
    name = excluded.name,
    unit = excluded.unit,
    description = excluded.description;

  -- --------------------------------------------------------------------------
  -- 2. Auth Users
  -- --------------------------------------------------------------------------
  -- First, check if test@test.com already exists in auth.users
  select id into v_test_uid from auth.users where email = 'test@test.com' limit 1;
  if v_test_uid is null then
    v_test_uid := '00000000-0000-4000-8000-000000000001'::uuid;
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change_token_current,
      reauthentication_token,
      email_change,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      v_test_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'test@test.com',
      crypt('password123', gen_salt('bf')),
      now(),
      '', '', '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Test User"}'::jsonb,
      now(),
      now()
    );
  else
    update auth.users
    set
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      confirmation_token = coalesce(confirmation_token, ''),
      recovery_token = coalesce(recovery_token, ''),
      email_change_token_new = coalesce(email_change_token_new, ''),
      email_change_token_current = coalesce(email_change_token_current, ''),
      reauthentication_token = coalesce(reauthentication_token, ''),
      email_change = coalesce(email_change, ''),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"display_name":"Test User"}'::jsonb,
      updated_at = now()
    where id = v_test_uid;
  end if;

  -- Ensure demo users exist in auth.users
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    reauthentication_token, email_change,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (v_alice_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alice@example.com', crypt('password123', gen_salt('bf')), now(), '', '', '', '', '', '', '{"provider":"email","providers":["email"]}', '{"display_name":"Alice Park"}', now(), now()),
    (v_bob_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bob@example.com', crypt('password123', gen_salt('bf')), now(), '', '', '', '', '', '', '{"provider":"email","providers":["email"]}', '{"display_name":"Bob Chen"}', now(), now()),
    (v_carla_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carla@example.com', crypt('password123', gen_salt('bf')), now(), '', '', '', '', '', '', '{"provider":"email","providers":["email"]}', '{"display_name":"Carla Diaz"}', now(), now()),
    (v_dana_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dana@example.com', crypt('password123', gen_salt('bf')), now(), '', '', '', '', '', '', '{"provider":"email","providers":["email"]}', '{"display_name":"Dana Singh"}', now(), now()),
    (v_elena_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'elena@example.com', crypt('password123', gen_salt('bf')), now(), '', '', '', '', '', '', '{"provider":"email","providers":["email"]}', '{"display_name":"Elena Rostova"}', now(), now()),
    (v_marcus_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marcus@example.com', crypt('password123', gen_salt('bf')), now(), '', '', '', '', '', '', '{"provider":"email","providers":["email"]}', '{"display_name":"Marcus Vance"}', now(), now()),
    (v_priya_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'priya@example.com', crypt('password123', gen_salt('bf')), now(), '', '', '', '', '', '', '{"provider":"email","providers":["email"]}', '{"display_name":"Priya Patel"}', now(), now())
  on conflict (id) do update set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at),
    confirmation_token = coalesce(auth.users.confirmation_token, ''),
    recovery_token = coalesce(auth.users.recovery_token, ''),
    email_change_token_new = coalesce(auth.users.email_change_token_new, ''),
    email_change_token_current = coalesce(auth.users.email_change_token_current, ''),
    reauthentication_token = coalesce(auth.users.reauthentication_token, ''),
    email_change = coalesce(auth.users.email_change, ''),
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = excluded.updated_at;

  -- --------------------------------------------------------------------------
  -- 3. Auth Identities
  -- --------------------------------------------------------------------------
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values
    (v_test_uid, v_test_uid, jsonb_build_object('sub', v_test_uid::text, 'email', 'test@test.com'), 'email', 'test@test.com', now(), now(), now()),
    (v_alice_uid, v_alice_uid, jsonb_build_object('sub', v_alice_uid::text, 'email', 'alice@example.com'), 'email', 'alice@example.com', now(), now(), now()),
    (v_bob_uid, v_bob_uid, jsonb_build_object('sub', v_bob_uid::text, 'email', 'bob@example.com'), 'email', 'bob@example.com', now(), now(), now()),
    (v_carla_uid, v_carla_uid, jsonb_build_object('sub', v_carla_uid::text, 'email', 'carla@example.com'), 'email', 'carla@example.com', now(), now(), now()),
    (v_dana_uid, v_dana_uid, jsonb_build_object('sub', v_dana_uid::text, 'email', 'dana@example.com'), 'email', 'dana@example.com', now(), now(), now()),
    (v_elena_uid, v_elena_uid, jsonb_build_object('sub', v_elena_uid::text, 'email', 'elena@example.com'), 'email', 'elena@example.com', now(), now(), now()),
    (v_marcus_uid, v_marcus_uid, jsonb_build_object('sub', v_marcus_uid::text, 'email', 'marcus@example.com'), 'email', 'marcus@example.com', now(), now(), now()),
    (v_priya_uid, v_priya_uid, jsonb_build_object('sub', v_priya_uid::text, 'email', 'priya@example.com'), 'email', 'priya@example.com', now(), now(), now())
  on conflict (id) do update set
    identity_data = excluded.identity_data,
    provider_id = excluded.provider_id,
    last_sign_in_at = excluded.last_sign_in_at,
    updated_at = excluded.updated_at;

  -- --------------------------------------------------------------------------
  -- 4. Profiles
  -- --------------------------------------------------------------------------
  insert into public.profiles (
    id, display_name, city, primary_sport, timezone, onboarding_completed_at, backfill_completed_at, backfill_level
  ) values
    (v_test_uid, 'Test Athlete', 'New York', 'running', 'America/New_York', now() - interval '60 days', now() - interval '60 days', 'steady'),
    (v_alice_uid, 'Alice Park', 'Brooklyn', 'running', 'America/New_York', now() - interval '60 days', now() - interval '60 days', 'steady'),
    (v_bob_uid, 'Bob Chen', 'Queens', 'cycling', 'America/New_York', now() - interval '45 days', now() - interval '45 days', 'steady'),
    (v_carla_uid, 'Carla Diaz', 'Jersey City', 'running', 'America/New_York', now() - interval '90 days', now() - interval '90 days', 'heavy'),
    (v_dana_uid, 'Dana Singh', 'Manhattan', 'running', 'America/New_York', null, null, null),
    (v_elena_uid, 'Elena Rostova', 'Brooklyn', 'running', 'America/New_York', now() - interval '30 days', now() - interval '30 days', 'steady'),
    (v_marcus_uid, 'Marcus Vance', 'Manhattan', 'running', 'America/New_York', now() - interval '40 days', now() - interval '40 days', 'heavy'),
    (v_priya_uid, 'Priya Patel', 'Queens', 'cycling', 'America/New_York', now() - interval '20 days', now() - interval '20 days', 'light')
  on conflict (id) do update set
    display_name = excluded.display_name,
    city = excluded.city,
    primary_sport = excluded.primary_sport,
    timezone = excluded.timezone,
    onboarding_completed_at = coalesce(public.profiles.onboarding_completed_at, excluded.onboarding_completed_at),
    backfill_completed_at = coalesce(public.profiles.backfill_completed_at, excluded.backfill_completed_at),
    backfill_level = coalesce(public.profiles.backfill_level, excluded.backfill_level),
    updated_at = now();

  -- --------------------------------------------------------------------------
  -- 5. Athlete Prefs
  -- --------------------------------------------------------------------------
  insert into public.athlete_prefs (
    user_id, freezes_left, calibrated, onboarding_completed, clock_period_start,
    focus_family, focus_id, training_goal_distance, training_goal_deadline, lesson_done_on, units
  ) values
    (v_test_uid, 3, true, true, v_week_start, 'sport', 'running', 'half', current_date + interval '45 days', current_date, 'us'),
    (v_alice_uid, 3, true, true, v_week_start, 'sport', 'running', 'half', current_date + interval '45 days', current_date, 'us'),
    (v_bob_uid, 2, true, true, v_week_start, 'sport', 'cycling', 'marathon', current_date + interval '60 days', current_date, 'us'),
    (v_carla_uid, 3, true, true, v_week_start, 'health', 'sleep', '10k', current_date + interval '30 days', current_date, 'us'),
    (v_elena_uid, 3, true, true, v_week_start, 'sport', 'running', null, null, current_date, 'us'),
    (v_marcus_uid, 1, true, true, v_week_start, 'sport', 'running', '10k', current_date + interval '25 days', current_date, 'us'),
    (v_priya_uid, 3, true, true, v_week_start, 'sport', 'cycling', null, null, current_date, 'us'),
    (v_dana_uid, 3, false, false, v_week_start, 'sport', 'running', null, null, null, 'us')
  on conflict (user_id) do update set
    calibrated = excluded.calibrated,
    onboarding_completed = excluded.onboarding_completed,
    clock_period_start = excluded.clock_period_start,
    focus_family = excluded.focus_family,
    focus_id = excluded.focus_id,
    training_goal_distance = excluded.training_goal_distance,
    training_goal_deadline = excluded.training_goal_deadline,
    lesson_done_on = excluded.lesson_done_on,
    units = excluded.units,
    updated_at = now();

  -- --------------------------------------------------------------------------
  -- 6. Sport Ratings
  -- --------------------------------------------------------------------------
  insert into public.sport_ratings (
    user_id, sport, verified_elo, open_elo, opted_in, lock_verified, lock_open, lock_period
  ) values
    -- test@test.com
    (v_test_uid, 'running', 1150, 1175, true, 1150, 1175, v_week_start),
    (v_test_uid, 'cycling', 1060, 1080, true, 1060, 1080, v_week_start),
    (v_test_uid, 'walking', 1000, 1020, true, 1000, 1020, v_week_start),
    (v_test_uid, 'strength', 1020, 1035, true, 1020, 1035, v_week_start),
    -- Alice
    (v_alice_uid, 'running', 1125, 1145, true, 1125, 1145, v_week_start),
    (v_alice_uid, 'cycling', 1045, 1060, true, 1045, 1060, v_week_start),
    (v_alice_uid, 'walking', 1000, 1015, true, 1000, 1015, v_week_start),
    (v_alice_uid, 'strength', 1015, 1030, true, 1015, 1030, v_week_start),
    -- Bob
    (v_bob_uid, 'cycling', 1170, 1190, true, 1170, 1190, v_week_start),
    (v_bob_uid, 'running', 1005, 1020, true, 1005, 1020, v_week_start),
    (v_bob_uid, 'walking', 1000, 1010, true, 1000, 1010, v_week_start),
    (v_bob_uid, 'strength', 1000, 1000, false, 1000, 1000, v_week_start),
    -- Carla
    (v_carla_uid, 'running', 1205, 1225, true, 1205, 1225, v_week_start),
    (v_carla_uid, 'strength', 1115, 1140, true, 1115, 1140, v_week_start),
    (v_carla_uid, 'cycling', 1030, 1045, true, 1030, 1045, v_week_start),
    (v_carla_uid, 'walking', 1010, 1025, true, 1010, 1025, v_week_start),
    -- Elena, Marcus, Priya
    (v_elena_uid, 'running', 1095, 1110, true, 1095, 1110, v_week_start),
    (v_marcus_uid, 'running', 1140, 1160, true, 1140, 1160, v_week_start),
    (v_priya_uid, 'cycling', 1080, 1095, true, 1080, 1095, v_week_start)
  on conflict (user_id, sport) do update set
    verified_elo = excluded.verified_elo,
    open_elo = excluded.open_elo,
    opted_in = excluded.opted_in,
    lock_verified = excluded.lock_verified,
    lock_open = excluded.lock_open,
    lock_period = excluded.lock_period;

  -- --------------------------------------------------------------------------
  -- 7. Health Ratings (Sleep)
  -- --------------------------------------------------------------------------
  insert into public.health_ratings (
    user_id, metric, elo, opted_in, lock_elo, lock_period, auto_enroll_next
  ) values
    (v_test_uid, 'sleep', 1090, true, 1090, v_week_start, true),
    (v_alice_uid, 'sleep', 1080, true, 1080, v_week_start, true),
    (v_bob_uid, 'sleep', 1015, true, 1015, v_week_start, true),
    (v_carla_uid, 'sleep', 1130, true, 1130, v_week_start, true)
  on conflict (user_id, metric) do update set
    elo = excluded.elo,
    opted_in = excluded.opted_in,
    lock_elo = excluded.lock_elo,
    lock_period = excluded.lock_period;

  -- --------------------------------------------------------------------------
  -- 8. Crews & Members
  -- --------------------------------------------------------------------------
  insert into public.crews (
    id, name, invite_code, sport, format, target_sessions, journey_km, created_by
  ) values
    (v_crew_running, 'Weekday miles', 'WEEKLY', 'running', 'volume', 4, 60, v_alice_uid),
    (v_crew_cycling, 'Brooklyn Dawn Patrol', 'PATROL', 'cycling', 'volume', 3, 120, v_bob_uid)
  on conflict (id) do update set
    name = excluded.name,
    invite_code = excluded.invite_code,
    target_sessions = excluded.target_sessions,
    journey_km = excluded.journey_km,
    created_by = excluded.created_by;

  insert into public.crew_members (crew_id, user_id, display_name, status) values
    (v_crew_running, v_test_uid, 'Test Athlete', 'active'),
    (v_crew_running, v_alice_uid, 'Alice Park', 'active'),
    (v_crew_running, v_bob_uid, 'Bob Chen', 'active'),
    (v_crew_running, v_carla_uid, 'Carla Diaz', 'active'),
    (v_crew_running, v_elena_uid, 'Elena Rostova', 'active'),
    (v_crew_cycling, v_test_uid, 'Test Athlete', 'active'),
    (v_crew_cycling, v_bob_uid, 'Bob Chen', 'active'),
    (v_crew_cycling, v_alice_uid, 'Alice Park', 'active'),
    (v_crew_cycling, v_priya_uid, 'Priya Patel', 'active')
  on conflict (crew_id, user_id) do update set
    display_name = excluded.display_name,
    status = excluded.status;

  -- --------------------------------------------------------------------------
  -- 9. Week Fields (Shared field for current week)
  -- --------------------------------------------------------------------------
  insert into public.week_fields (
    crew_id, name, wave_start, week_end, sport, capacity, member_ids, synthetic_ids
  ) values
    (
      v_crew_running,
      'Weekday miles',
      v_week_start,
      v_week_end,
      'running',
      8,
      array[v_test_uid, v_alice_uid, v_bob_uid, v_carla_uid, v_elena_uid],
      array['synth:running:0', 'synth:running:1', 'synth:running:2']
    ),
    (
      v_crew_cycling,
      'Brooklyn Dawn Patrol',
      v_week_start,
      v_week_end,
      'cycling',
      8,
      array[v_test_uid, v_bob_uid, v_alice_uid, v_priya_uid],
      array['synth:cycling:0', 'synth:cycling:1', 'synth:cycling:2', 'synth:cycling:3']
    )
  on conflict (crew_id, wave_start) where crew_id is not null do update set
    name = excluded.name,
    week_end = excluded.week_end,
    member_ids = excluded.member_ids,
    synthetic_ids = excluded.synthetic_ids;

  -- --------------------------------------------------------------------------
  -- 10. Wave Enrollments
  -- --------------------------------------------------------------------------
  insert into public.wave_enrollments (
    user_id, sport, wave_start, week_end, capacity, peer_ids, synthetic_ids, auto_enroll_next, crew_id
  ) values
    -- test@test.com
    (
      v_test_uid,
      'running',
      v_week_start,
      v_week_end,
      8,
      array[v_alice_uid, v_bob_uid, v_carla_uid, v_elena_uid, v_marcus_uid],
      array['synth:running:0', 'synth:running:1'],
      true,
      v_crew_running
    ),
    (
      v_test_uid,
      'cycling',
      v_week_start,
      v_week_end,
      8,
      array[v_bob_uid, v_alice_uid, v_priya_uid],
      array['synth:cycling:0', 'synth:cycling:1', 'synth:cycling:2'],
      true,
      v_crew_cycling
    ),
    -- Alice
    (
      v_alice_uid,
      'running',
      v_week_start,
      v_week_end,
      8,
      array[v_test_uid, v_bob_uid, v_carla_uid, v_elena_uid, v_marcus_uid],
      array['synth:running:0', 'synth:running:1', 'synth:running:2'],
      true,
      v_crew_running
    ),
    (
      v_alice_uid,
      'cycling',
      v_week_start,
      v_week_end,
      8,
      array[v_test_uid, v_bob_uid, v_priya_uid],
      array['synth:cycling:0', 'synth:cycling:1', 'synth:cycling:2'],
      true,
      v_crew_cycling
    ),
    -- Bob
    (
      v_bob_uid,
      'cycling',
      v_week_start,
      v_week_end,
      8,
      array[v_test_uid, v_alice_uid, v_priya_uid],
      array['synth:cycling:0', 'synth:cycling:1', 'synth:cycling:2'],
      true,
      v_crew_cycling
    ),
    -- Carla
    (
      v_carla_uid,
      'running',
      v_week_start,
      v_week_end,
      8,
      array[v_test_uid, v_alice_uid, v_bob_uid, v_elena_uid],
      array['synth:running:0', 'synth:running:1', 'synth:running:2'],
      true,
      v_crew_running
    )
  on conflict (user_id, sport, wave_start) do update set
    week_end = excluded.week_end,
    peer_ids = excluded.peer_ids,
    synthetic_ids = excluded.synthetic_ids,
    auto_enroll_next = excluded.auto_enroll_next,
    crew_id = excluded.crew_id;

  -- --------------------------------------------------------------------------
  -- 11. Fitness Connections
  -- --------------------------------------------------------------------------
  insert into public.fitness_connections (user_id, provider, status, connected_at, updated_at) values
    (v_test_uid, 'strava', 'connected', now() - interval '60 days', now()),
    (v_test_uid, 'whoop', 'connected', now() - interval '30 days', now()),
    (v_alice_uid, 'strava', 'connected', now() - interval '60 days', now()),
    (v_alice_uid, 'whoop', 'connected', now() - interval '30 days', now()),
    (v_alice_uid, 'garmin', 'stub', now() - interval '10 days', now()),
    (v_bob_uid, 'strava', 'connected', now() - interval '45 days', now()),
    (v_bob_uid, 'garmin', 'connected', now() - interval '40 days', now()),
    (v_carla_uid, 'strava', 'connected', now() - interval '90 days', now()),
    (v_carla_uid, 'oura', 'connected', now() - interval '50 days', now())
  on conflict (user_id, provider) do update set
    status = excluded.status,
    updated_at = now();

  -- --------------------------------------------------------------------------
  -- 12. Activities (Alice, Bob, Carla, Elena, Marcus & test@test.com)
  -- --------------------------------------------------------------------------
  insert into public.activities (
    id, user_id, provider, external_id, category_id, started_at, metric_value,
    raw_name, moving_sec, sport, distance_m, avg_hr, verified, provenance, disposition, compete_key, source_label
  ) values
    -- test@test.com: Current Week Activities (Tons of rich sessions)
    ('00000000-0000-4000-8000-000000000011', v_test_uid, 'strava', 'act-test-w0-mon', v_cat_running, v_week_start + interval '7 hours', 9000, 'Prospect Park progression morning run', 2700, 'running', 9000, 155, true, 'recorded', 'counted', 'strava-act-test-w0-mon', 'Strava'),
    ('00000000-0000-4000-8000-000000000012', v_test_uid, 'strava', 'act-test-w0-tue', v_cat_running, v_week_start + interval '1 day 6 hours 30 mins', 5200, 'DUMBO waterfront morning shakeout', 1800, 'running', 5200, 138, true, 'recorded', 'counted', 'strava-act-test-w0-tue', 'Strava'),
    ('00000000-0000-4000-8000-000000000013', v_test_uid, 'strava', 'act-test-w0-wed', v_cat_running, v_week_start + interval '2 days 18 hours', 11200, 'Brooklyn bridge tempo threshold intervals', 3400, 'running', 11200, 168, true, 'recorded', 'counted', 'strava-act-test-w0-wed', 'Strava'),
    ('00000000-0000-4000-8000-000000000014', v_test_uid, 'strava', 'act-test-w0-thu', v_cat_running, v_week_start + interval '3 days 7 hours 15 mins', 6400, 'Fort Greene aerobic pace jog', 2200, 'running', 6400, 140, true, 'recorded', 'counted', 'strava-act-test-w0-thu', 'Strava'),
    ('00000000-0000-4000-8000-000000000015', v_test_uid, 'strava', 'act-test-w0-fri', v_cat_cycling, v_week_start + interval '4 days 17 hours 30 mins', 26000, 'Hudson Greenway recovery sunset spin', 4100, 'cycling', 26000, 132, true, 'recorded', 'counted', 'strava-act-test-w0-fri', 'Strava'),
    ('00000000-0000-4000-8000-000000000016', v_test_uid, 'strava', 'act-test-w0-sat', v_cat_running, v_week_start + interval '5 days 8 hours', 18000, 'Central Park loop endurance long run', 5600, 'running', 18000, 160, true, 'recorded', 'counted', 'strava-act-test-w0-sat', 'Strava'),

    -- test@test.com: Past 3 Weeks Sessions (Rich Journey & History)
    ('00000000-0000-4000-8000-000000000017', v_test_uid, 'strava', 'act-test-w1-tue', v_cat_running, v_week_start - interval '5 days 17 hours', 10500, 'Midweek tempo 10K test', 3200, 'running', 10500, 165, true, 'recorded', 'counted', 'strava-act-test-w1-tue', 'Strava'),
    ('00000000-0000-4000-8000-000000000018', v_test_uid, 'strava', 'act-test-w1-thu', v_cat_running, v_week_start - interval '3 days 6 hours', 8000, 'Aerobic endurance base run', 2500, 'running', 8000, 145, true, 'recorded', 'counted', 'strava-act-test-w1-thu', 'Strava'),
    ('00000000-0000-4000-8000-000000000019', v_test_uid, 'strava', 'act-test-w1-sat', v_cat_running, v_week_start - interval '1 day 14 hours', 20000, 'Half marathon training peak long run', 6200, 'running', 20000, 158, true, 'recorded', 'counted', 'strava-act-test-w1-sat', 'Strava'),
    ('00000000-0000-4000-8000-000000000020', v_test_uid, 'strava', 'act-test-w2-mon', v_cat_running, v_week_start - interval '13 days 17 hours', 7500, 'Recovery loop', 2400, 'running', 7500, 136, true, 'recorded', 'counted', 'strava-act-test-w2-mon', 'Strava'),
    ('00000000-0000-4000-8000-000000000021', v_test_uid, 'strava', 'act-test-w2-wed', v_cat_running, v_week_start - interval '11 days 6 hours', 12000, 'Mile repeats interval workout', 3700, 'running', 12000, 172, true, 'recorded', 'counted', 'strava-act-test-w2-wed', 'Strava'),
    ('00000000-0000-4000-8000-000000000022', v_test_uid, 'strava', 'act-test-w2-sat', v_cat_running, v_week_start - interval '8 days 15 hours', 16000, 'Weekend distance run', 5100, 'running', 16000, 154, true, 'recorded', 'counted', 'strava-act-test-w2-sat', 'Strava'),
    ('00000000-0000-4000-8000-000000000023', v_test_uid, 'strava', 'act-test-w3-tue', v_cat_running, v_week_start - interval '19 days 17 hours', 9500, 'Aerobic tempo session', 2900, 'running', 9500, 160, true, 'recorded', 'counted', 'strava-act-test-w3-tue', 'Strava'),
    ('00000000-0000-4000-8000-000000000024', v_test_uid, 'strava', 'act-test-w3-fri', v_cat_cycling, v_week_start - interval '16 days 7 hours', 32000, 'Brooklyn greenway distance ride', 4900, 'cycling', 32000, 140, true, 'recorded', 'counted', 'strava-act-test-w3-fri', 'Strava'),
    ('00000000-0000-4000-8000-000000000025', v_test_uid, 'strava', 'act-test-w3-sat', v_cat_running, v_week_start - interval '15 days 14 hours', 15000, 'Long run progression', 4800, 'running', 15000, 155, true, 'recorded', 'counted', 'strava-act-test-w3-sat', 'Strava'),

    -- Alice: Current Week
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa01', v_alice_uid, 'strava', 'act-alice-w0-mon', v_cat_running, v_week_start + interval '7 hours', 8200, 'Prospect Park morning loop', 2640, 'running', 8200, 154, true, 'recorded', 'counted', 'strava-act-alice-w0-mon', 'Strava'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa02', v_alice_uid, 'strava', 'act-alice-w0-tue', v_cat_running, v_week_start + interval '1 day 6 hours 45 mins', 4800, 'Brooklyn Heights recovery shakeout', 1720, 'running', 4800, 138, true, 'recorded', 'counted', 'strava-act-alice-w0-tue', 'Strava'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa03', v_alice_uid, 'strava', 'act-alice-w0-wed', v_cat_running, v_week_start + interval '2 days 18 hours 15 mins', 10500, 'Hudson River Greenway tempo intervals', 3240, 'running', 10500, 168, true, 'recorded', 'counted', 'strava-act-alice-w0-wed', 'Strava'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa04', v_alice_uid, 'strava', 'act-alice-w0-thu', v_cat_running, v_week_start + interval '3 days 7 hours 30 mins', 5600, 'Cobble Hill aerobic jog', 1980, 'running', 5600, 142, true, 'recorded', 'counted', 'strava-act-alice-w0-thu', 'Strava'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa05', v_alice_uid, 'strava', 'act-alice-w0-fri', v_cat_cycling, v_week_start + interval '4 days 17 hours', 24000, 'East River bridges recovery spin', 3900, 'cycling', 24000, 135, true, 'recorded', 'counted', 'strava-act-alice-w0-fri', 'Strava'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa06', v_alice_uid, 'strava', 'act-alice-w0-sat', v_cat_running, v_week_start + interval '5 days 8 hours 30 mins', 16800, 'Queensboro to Central Park long run', 5400, 'running', 16800, 158, true, 'recorded', 'counted', 'strava-act-alice-w0-sat', 'Strava'),

    -- Alice: Rich Past Weeks History
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa07', v_alice_uid, 'strava', 'act-alice-w1-tue', v_cat_running, v_week_start - interval '5 days 17 hours', 10000, 'Midweek threshold 10K', 3120, 'running', 10000, 164, true, 'recorded', 'counted', 'strava-act-alice-w1-tue', 'Strava'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa08', v_alice_uid, 'strava', 'act-alice-w1-sat', v_cat_running, v_week_start - interval '1 day 14 hours', 18500, 'Half marathon pacing long run', 5940, 'running', 18500, 156, true, 'recorded', 'counted', 'strava-act-alice-w1-sat', 'Strava'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa09', v_alice_uid, 'strava', 'act-alice-w1-thu', v_cat_running, v_week_start - interval '3 days 6 hours', 6200, 'Thursday aerobic maintenance run', 2160, 'running', 6200, 148, true, 'recorded', 'counted', 'strava-act-alice-w1-thu', 'Strava'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa10', v_alice_uid, 'strava', 'act-alice-w2-mon', v_cat_running, v_week_start - interval '13 days 17 hours', 7200, 'Prospect Park recovery jog', 2340, 'running', 7200, 149, true, 'recorded', 'counted', 'strava-act-alice-w2-mon', 'Strava'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa11', v_alice_uid, 'strava', 'act-alice-w2-wed', v_cat_running, v_week_start - interval '11 days 6 hours', 8500, 'Bridge repeats morning speed session', 2700, 'running', 8500, 153, true, 'recorded', 'counted', 'strava-act-alice-w2-wed', 'Strava'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa12', v_alice_uid, 'strava', 'act-alice-w2-fri', v_cat_cycling, v_week_start - interval '9 days 7 hours', 22000, 'Greenway distance endurance spin', 3600, 'cycling', 22000, 138, true, 'recorded', 'counted', 'strava-act-alice-w2-fri', 'Strava'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa13', v_alice_uid, 'strava', 'act-alice-w2-sun', v_cat_running, v_week_start - interval '7 days 15 hours', 16000, 'Sunday progression distance run', 5100, 'running', 16000, 155, true, 'recorded', 'counted', 'strava-act-alice-w2-sun', 'Strava'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa14', v_alice_uid, 'strava', 'act-alice-w3-tue', v_cat_running, v_week_start - interval '19 days 17 hours', 6800, 'Aerobic base check run', 2220, 'running', 6800, 150, true, 'recorded', 'counted', 'strava-act-alice-w3-tue', 'Strava'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa15', v_alice_uid, 'strava', 'act-alice-w3-thu', v_cat_running, v_week_start - interval '17 days 6 hours', 9200, 'Midweek endurance intervals', 2940, 'running', 9200, 154, true, 'recorded', 'counted', 'strava-act-alice-w3-thu', 'Strava'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa16', v_alice_uid, 'strava', 'act-alice-w3-sat', v_cat_running, v_week_start - interval '15 days 14 hours', 15000, 'Weekend aerobic mileage', 4800, 'running', 15000, 157, true, 'recorded', 'counted', 'strava-act-alice-w3-sat', 'Strava'),

    -- Bob: Current Week
    ('b2222222-bbbb-4bbb-8bbb-bbbbbbbbbb01', v_bob_uid, 'strava', 'act-bob-w0-mon', v_cat_cycling, v_week_start + interval '6 hours', 28000, 'Flushing Meadows tempo laps', 3600, 'cycling', 28000, 140, true, 'recorded', 'counted', 'strava-act-bob-w0-mon', 'Strava'),
    ('b2222222-bbbb-4bbb-8bbb-bbbbbbbbbb02', v_bob_uid, 'strava', 'act-bob-w0-wed', v_cat_cycling, v_week_start + interval '2 days 6 hours', 42000, 'Rockaway beach endurance loop', 5200, 'cycling', 42000, 146, true, 'recorded', 'counted', 'strava-act-bob-w0-wed', 'Strava'),
    ('b2222222-bbbb-4bbb-8bbb-bbbbbbbbbb03', v_bob_uid, 'strava', 'act-bob-w0-fri', v_cat_running, v_week_start + interval '4 days 7 hours', 6000, 'Queens cross-training shakeout', 2100, 'running', 6000, 134, true, 'recorded', 'counted', 'strava-act-bob-w0-fri', 'Strava'),
    ('b2222222-bbbb-4bbb-8bbb-bbbbbbbbbb04', v_bob_uid, 'strava', 'act-bob-w0-sat', v_cat_cycling, v_week_start + interval '5 days 7 hours 30 mins', 58000, 'Century builder endurance ride', 7200, 'cycling', 58000, 150, true, 'recorded', 'counted', 'strava-act-bob-w0-sat', 'Strava'),

    -- Carla: Current Week
    ('c3333333-cccc-4ccc-8ccc-cccccccccc01', v_carla_uid, 'strava', 'act-carla-w0-mon', v_cat_running, v_week_start + interval '7 hours', 10400, 'Hudson River waterfront run', 3180, 'running', 10400, 162, true, 'recorded', 'counted', 'strava-act-carla-w0-mon', 'Strava'),
    ('c3333333-cccc-4ccc-8ccc-cccccccccc02', v_carla_uid, 'mock', 'act-carla-w0-tue', v_cat_strength, v_week_start + interval '1 day 17 hours 30 mins', 3600, 'Lower body hypertrophy & deadlifts', 3600, 'strength', 0, 130, false, 'recorded', 'counted', 'mock-act-carla-w0-tue', 'Garmin'),
    ('c3333333-cccc-4ccc-8ccc-cccccccccc03', v_carla_uid, 'strava', 'act-carla-w0-thu', v_cat_running, v_week_start + interval '3 days 18 hours', 12200, 'Palisades Interstate hill repeats', 3700, 'running', 12200, 174, true, 'recorded', 'counted', 'strava-act-carla-w0-thu', 'Strava'),
    ('c3333333-cccc-4ccc-8ccc-cccccccccc04', v_carla_uid, 'strava', 'act-carla-w0-sat', v_cat_running, v_week_start + interval '5 days 9 hours', 21100, 'Saturday half marathon progression', 6120, 'running', 21100, 166, true, 'recorded', 'counted', 'strava-act-carla-w0-sat', 'Strava'),

    -- Elena & Marcus
    ('e5555555-eeee-4eee-8eee-eeeeeeeeee01', v_elena_uid, 'strava', 'act-elena-w0-tue', v_cat_running, v_week_start + interval '1 day 7 hours', 7500, 'Prospect Park loop with Elena', 2400, 'running', 7500, 150, true, 'recorded', 'counted', 'strava-act-elena-w0-tue', 'Strava'),
    ('66666666-6666-4666-8666-666666666601', v_marcus_uid, 'strava', 'act-marcus-w0-wed', v_cat_running, v_week_start + interval '2 days 19 hours', 11000, 'Central Park reservoir tempo', 3300, 'running', 11000, 165, true, 'recorded', 'counted', 'strava-act-marcus-w0-wed', 'Strava')
  on conflict (id) do update set
    started_at = excluded.started_at,
    metric_value = excluded.metric_value,
    distance_m = excluded.distance_m,
    moving_sec = excluded.moving_sec,
    avg_hr = excluded.avg_hr;

  -- --------------------------------------------------------------------------
  -- 13. Crew Entries
  -- --------------------------------------------------------------------------
  insert into public.crew_entries (
    crew_id, user_id, activity_id, started_at, sport, distance_m, moving_sec, disposition, provenance
  ) values
    -- Weekday miles (test@test.com + Alice + Carla + Bob + Elena)
    (v_crew_running, v_test_uid, 'strava-act-test-w0-mon', v_week_start + interval '7 hours', 'running', 9000, 2700, 'counted', 'recorded'),
    (v_crew_running, v_test_uid, 'strava-act-test-w0-wed', v_week_start + interval '2 days 18 hours', 'running', 11200, 3400, 'counted', 'recorded'),
    (v_crew_running, v_test_uid, 'strava-act-test-w0-sat', v_week_start + interval '5 days 8 hours', 'running', 18000, 5600, 'counted', 'recorded'),
    (v_crew_running, v_alice_uid, 'strava-act-alice-w0-mon', v_week_start + interval '7 hours', 'running', 8200, 2640, 'counted', 'recorded'),
    (v_crew_running, v_alice_uid, 'strava-act-alice-w0-wed', v_week_start + interval '2 days 18 hours 15 mins', 'running', 10500, 3240, 'counted', 'recorded'),
    (v_crew_running, v_alice_uid, 'strava-act-alice-w0-sat', v_week_start + interval '5 days 8 hours 30 mins', 'running', 16800, 5400, 'counted', 'recorded'),
    (v_crew_running, v_bob_uid, 'strava-act-bob-w0-fri', v_week_start + interval '4 days 7 hours', 'running', 6000, 2100, 'counted', 'recorded'),
    (v_crew_running, v_carla_uid, 'strava-act-carla-w0-mon', v_week_start + interval '7 hours', 'running', 10400, 3180, 'counted', 'recorded'),
    (v_crew_running, v_carla_uid, 'strava-act-carla-w0-sat', v_week_start + interval '5 days 9 hours', 'running', 21100, 6120, 'counted', 'recorded'),
    (v_crew_running, v_elena_uid, 'strava-act-elena-w0-tue', v_week_start + interval '1 day 7 hours', 'running', 7500, 2400, 'counted', 'recorded'),
    -- Brooklyn Dawn Patrol (Cycling crew)
    (v_crew_cycling, v_test_uid, 'strava-act-test-w0-fri', v_week_start + interval '4 days 17 hours 30 mins', 'cycling', 26000, 4100, 'counted', 'recorded'),
    (v_crew_cycling, v_bob_uid, 'strava-act-bob-w0-mon', v_week_start + interval '6 hours', 'cycling', 28000, 3600, 'counted', 'recorded'),
    (v_crew_cycling, v_bob_uid, 'strava-act-bob-w0-wed', v_week_start + interval '2 days 6 hours', 'cycling', 42000, 5200, 'counted', 'recorded'),
    (v_crew_cycling, v_alice_uid, 'strava-act-alice-w0-fri', v_week_start + interval '4 days 17 hours', 'cycling', 24000, 3900, 'counted', 'recorded')
  on conflict (crew_id, user_id, activity_id) do update set
    started_at = excluded.started_at,
    distance_m = excluded.distance_m,
    moving_sec = excluded.moving_sec;

  -- --------------------------------------------------------------------------
  -- 14. Crew Cheers & Notices
  -- --------------------------------------------------------------------------
  insert into public.crew_cheers (id, crew_id, from_user, activity_id, created_at) values
    ('cc000000-0000-4000-8000-000000000001', v_crew_running, v_bob_uid, 'strava-act-alice-w0-sat', now() - interval '4 hours'),
    ('cc000000-0000-4000-8000-000000000002', v_crew_running, v_carla_uid, 'strava-act-test-w0-sat', now() - interval '2 days'),
    ('cc000000-0000-4000-8000-000000000003', v_crew_running, v_test_uid, 'strava-act-carla-w0-sat', now() - interval '2 hours')
  on conflict (id) do nothing;

  insert into public.crew_notices (id, user_id, crew_id, kind, body, created_at) values
    ('ce000000-0000-4000-8000-000000000001', v_test_uid, v_crew_running, 'journey_progress', 'Weekday miles has crossed 50 km towards the 60 km weekly journey!', now() - interval '3 hours'),
    ('ce000000-0000-4000-8000-000000000002', v_test_uid, v_crew_running, 'member_cheer', 'Carla Diaz cheered your 18.0 km weekend long run.', now() - interval '4 hours'),
    ('ce000000-0000-4000-8000-000000000003', v_bob_uid, v_crew_cycling, 'journey_milestone', 'Brooklyn Dawn Patrol unlocked week milestone: 100+ km collective endurance.', now() - interval '1 day')
  on conflict (id) do nothing;

  -- --------------------------------------------------------------------------
  -- 15. Sleep Nights & Readiness Marks
  -- --------------------------------------------------------------------------
  insert into public.sleep_nights (
    user_id, night_id, day, score, duration_min, efficiency, deep_min, rem_min, light_min, awake_min, source, verified
  ) values
    -- test@test.com (Whoop)
    (v_test_uid, 'slp-test-d0', current_date, 90, 480, 95, 90, 110, 255, 25, 'whoop', true),
    (v_test_uid, 'slp-test-d1', current_date - 1, 88, 470, 94, 85, 105, 255, 25, 'whoop', true),
    (v_test_uid, 'slp-test-d2', current_date - 2, 84, 450, 92, 75, 95, 250, 30, 'whoop', true),
    (v_test_uid, 'slp-test-d3', current_date - 3, 79, 420, 89, 70, 85, 235, 30, 'whoop', true),
    (v_test_uid, 'slp-test-d4', current_date - 4, 86, 460, 93, 80, 100, 255, 25, 'whoop', true),
    -- Alice
    (v_alice_uid, 'slp-alice-d0', current_date, 88, 465, 94, 85, 105, 250, 25, 'whoop', true),
    (v_alice_uid, 'slp-alice-d1', current_date - 1, 91, 480, 96, 95, 110, 255, 20, 'whoop', true),
    (v_alice_uid, 'slp-alice-d2', current_date - 2, 82, 440, 91, 75, 95, 240, 30, 'whoop', true),
    -- Bob
    (v_bob_uid, 'slp-bob-d0', current_date, 80, 430, 90, 70, 85, 245, 30, 'garmin', true),
    (v_bob_uid, 'slp-bob-d1', current_date - 1, 84, 455, 92, 75, 95, 255, 30, 'garmin', true),
    -- Carla
    (v_carla_uid, 'slp-carla-d0', current_date, 92, 490, 97, 100, 120, 250, 20, 'oura', true),
    (v_carla_uid, 'slp-carla-d1', current_date - 1, 89, 475, 95, 92, 110, 253, 20, 'oura', true)
  on conflict (user_id, night_id) do update set
    score = excluded.score,
    duration_min = excluded.duration_min;

  insert into public.readiness_marks (user_id, provider, external_id, day, score) values
    (v_test_uid, 'whoop', 'readiness-test-d0', current_date, 88),
    (v_test_uid, 'whoop', 'readiness-test-d1', current_date - 1, 85),
    (v_alice_uid, 'whoop', 'readiness-alice-d0', current_date, 86),
    (v_alice_uid, 'whoop', 'readiness-alice-d1', current_date - 1, 91),
    (v_bob_uid, 'garmin', 'readiness-bob-d0', current_date, 79),
    (v_carla_uid, 'oura', 'readiness-carla-d0', current_date, 93)
  on conflict (user_id, provider, external_id) do update set
    score = excluded.score;

  -- --------------------------------------------------------------------------
  -- 16. Compete Duels
  -- --------------------------------------------------------------------------
  insert into public.compete_duels (
    user_id, duel_id, sport, period_start, rival_id, rival_name, rival_elo, source
  ) values
    (v_test_uid, 'duel-test-marcus-w0', 'running', v_week_start, v_marcus_uid, 'Marcus Vance', 1160, 'auto'),
    (v_alice_uid, 'duel-alice-marcus-w0', 'running', v_week_start, v_marcus_uid, 'Marcus Vance', 1160, 'auto'),
    (v_bob_uid, 'duel-bob-priya-w0', 'cycling', v_week_start, v_priya_uid, 'Priya Patel', 1095, 'auto')
  on conflict (user_id, duel_id) do update set
    rival_name = excluded.rival_name,
    rival_elo = excluded.rival_elo;

  -- --------------------------------------------------------------------------
  -- 17. Period Results (Settled Season History)
  -- --------------------------------------------------------------------------
  insert into public.period_results (
    user_id, period_start, sport, track, period_end, place, field_size, effort, distance_m, moving_sec, elo_before, elo_after, frozen, settled_at, acknowledged_at
  ) values
    -- test@test.com: Past 4 Weeks
    (v_test_uid, v_week_start - interval '7 days', 'running', 'open', v_week_start, 1, 18, 54000, 54000, 16900, 1145, 1175, false, v_week_start, now()),
    (v_test_uid, v_week_start - interval '14 days', 'running', 'open', v_week_start - interval '7 days', 2, 16, 49500, 49500, 15500, 1120, 1145, false, v_week_start - interval '7 days', now()),
    (v_test_uid, v_week_start - interval '21 days', 'running', 'open', v_week_start - interval '14 days', 3, 20, 46000, 46000, 14400, 1105, 1120, false, v_week_start - interval '14 days', now()),
    (v_test_uid, v_week_start - interval '28 days', 'running', 'open', v_week_start - interval '21 days', 2, 15, 47500, 47500, 14900, 1085, 1105, false, v_week_start - interval '21 days', now()),
    -- Alice
    (v_alice_uid, v_week_start - interval '7 days', 'running', 'open', v_week_start, 2, 18, 48500, 48500, 15600, 1122, 1145, false, v_week_start, now()),
    (v_alice_uid, v_week_start - interval '14 days', 'running', 'open', v_week_start - interval '7 days', 1, 16, 52300, 52300, 16800, 1098, 1122, false, v_week_start - interval '7 days', now()),
    (v_alice_uid, v_week_start - interval '21 days', 'running', 'open', v_week_start - interval '14 days', 4, 20, 41200, 41200, 13400, 1090, 1098, false, v_week_start - interval '14 days', now()),
    (v_alice_uid, v_week_start - interval '28 days', 'running', 'open', v_week_start - interval '21 days', 3, 15, 44500, 44500, 14200, 1072, 1090, false, v_week_start - interval '21 days', now()),
    -- Bob
    (v_bob_uid, v_week_start - interval '7 days', 'cycling', 'open', v_week_start, 1, 14, 145000, 145000, 18200, 1165, 1190, false, v_week_start, now()),
    -- Carla
    (v_carla_uid, v_week_start - interval '7 days', 'running', 'open', v_week_start, 1, 18, 62000, 62000, 18900, 1200, 1225, false, v_week_start, now())
  on conflict (user_id, period_start, sport, track) do update set
    place = excluded.place,
    effort = excluded.effort,
    elo_after = excluded.elo_after,
    acknowledged_at = excluded.acknowledged_at;

  -- --------------------------------------------------------------------------
  -- 18. Health Period Results
  -- --------------------------------------------------------------------------
  insert into public.health_period_results (
    user_id, result_id, metric, period_start, period_end, place, field_size, score, elo_before, elo_after, settled_at
  ) values
    (v_test_uid, 'health-res-test-w1', 'sleep', v_week_start - interval '7 days', v_week_start, 2, 12, 88, 1075, 1090, v_week_start),
    (v_alice_uid, 'health-res-alice-w1', 'sleep', v_week_start - interval '7 days', v_week_start, 3, 12, 86, 1065, 1080, v_week_start),
    (v_carla_uid, 'health-res-carla-w1', 'sleep', v_week_start - interval '7 days', v_week_start, 1, 12, 93, 1110, 1130, v_week_start)
  on conflict (user_id, result_id) do update set
    place = excluded.place,
    score = excluded.score,
    elo_after = excluded.elo_after;

  -- --------------------------------------------------------------------------
  -- 19. Battles, Periods & Standings
  -- --------------------------------------------------------------------------
  insert into public.battles (
    id, name, mode, category_id, period_kind, status, invite_code, created_by
  ) values
    (v_battle_run, 'NYC Metro Runners', 'group', v_cat_running, 'weekly', 'active', 'NYCRUN', v_alice_uid),
    (v_battle_cycle, 'Five Boro Century', 'group', v_cat_cycling, 'weekly', 'active', 'BORORIDE', v_bob_uid)
  on conflict (id) do update set
    name = excluded.name,
    status = excluded.status,
    invite_code = excluded.invite_code;

  insert into public.battle_memberships (battle_id, user_id, role) values
    (v_battle_run, v_test_uid, 'member'),
    (v_battle_run, v_alice_uid, 'owner'),
    (v_battle_run, v_carla_uid, 'member'),
    (v_battle_run, v_marcus_uid, 'member'),
    (v_battle_run, v_elena_uid, 'member'),
    (v_battle_run, v_bob_uid, 'member'),
    (v_battle_cycle, v_test_uid, 'member'),
    (v_battle_cycle, v_bob_uid, 'owner'),
    (v_battle_cycle, v_alice_uid, 'member'),
    (v_battle_cycle, v_priya_uid, 'member')
  on conflict (battle_id, user_id) do nothing;

  insert into public.periods (id, battle_id, kind, starts_at, ends_at, is_current) values
    ('88888888-8888-4888-8888-888888888801', v_battle_run, 'weekly', v_week_start, v_week_end, true),
    ('88888888-8888-4888-8888-888888888802', v_battle_cycle, 'weekly', v_week_start, v_week_end, true)
  on conflict (id) do update set
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    is_current = excluded.is_current;

  insert into public.standings (period_id, user_id, score, rank) values
    ('88888888-8888-4888-8888-888888888801', v_test_uid, 55800, 1),
    ('88888888-8888-4888-8888-888888888801', v_alice_uid, 51100, 2),
    ('88888888-8888-4888-8888-888888888801', v_carla_uid, 47300, 3),
    ('88888888-8888-4888-8888-888888888801', v_marcus_uid, 38200, 4),
    ('88888888-8888-4888-8888-888888888801', v_elena_uid, 29500, 5),
    ('88888888-8888-4888-8888-888888888801', v_bob_uid, 12000, 6),
    ('88888888-8888-4888-8888-888888888802', v_bob_uid, 128000, 1),
    ('88888888-8888-4888-8888-888888888802', v_priya_uid, 84000, 2),
    ('88888888-8888-4888-8888-888888888802', v_test_uid, 26000, 3),
    ('88888888-8888-4888-8888-888888888802', v_alice_uid, 24000, 4)
  on conflict (period_id, user_id) do update set
    score = excluded.score,
    rank = excluded.rank,
    updated_at = now();

end $$;
