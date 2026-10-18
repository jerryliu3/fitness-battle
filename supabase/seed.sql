-- ============================================================================
-- Local Testing Accounts & Seed Data
-- ============================================================================
-- Seed accounts (password: password123):
--   alice@example.com  - Finished onboarding, crew owner (Weekday miles), running focus
--   bob@example.com    - Finished onboarding, cycling focus, crew member
--   carla@example.com  - Finished onboarding, high-volume runner, sleep focus, crew member
--   dana@example.com   - Uncalibrated / signed-up only (tests onboarding walkthrough)
-- Peer athletes (for rich leaderboards, duels & crew life):
--   elena@example.com  - Elena Rostova (Brooklyn, runner)
--   marcus@example.com - Marcus Vance (Manhattan, rival runner in duel)
--   priya@example.com  - Priya Patel (Queens, cyclist)
--
-- Applied automatically by `pnpm supabase:reset`.
-- All timestamps dynamically anchor to America/New_York current week.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Categories
-- ----------------------------------------------------------------------------
insert into public.categories (id, slug, name, unit, description) values
  ('11111111-1111-4111-8111-111111111101', 'running', 'Running', 'meters', 'Distance covered on foot runs.'),
  ('11111111-1111-4111-8111-111111111102', 'cycling', 'Cycling', 'meters', 'Ride distance from your tracker.'),
  ('11111111-1111-4111-8111-111111111103', 'walking', 'Walking', 'meters', 'Walk and hike distance.'),
  ('11111111-1111-4111-8111-111111111104', 'strength', 'Strength', 'seconds', 'Session duration from strength workouts.')
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- 2. Auth Users
-- ----------------------------------------------------------------------------
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
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'alice@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Alice Park"}',
    now(), now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'bob@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Bob Chen"}',
    now(), now()
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'carla@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Carla Diaz"}',
    now(), now()
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'dana@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Dana Singh"}',
    now(), now()
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'elena@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Elena Rostova"}',
    now(), now()
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'marcus@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Marcus Vance"}',
    now(), now()
  ),
  (
    '77777777-7777-4777-8777-777777777777',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'priya@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Priya Patel"}',
    now(), now()
  )
on conflict (id) do update
set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at;

-- ----------------------------------------------------------------------------
-- 3. Auth Identities
-- ----------------------------------------------------------------------------
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  ('11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', '{"sub":"11111111-1111-4111-8111-111111111111","email":"alice@example.com"}', 'email', 'alice@example.com', now(), now(), now()),
  ('22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', '{"sub":"22222222-2222-4222-8222-222222222222","email":"bob@example.com"}', 'email', 'bob@example.com', now(), now(), now()),
  ('33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', '{"sub":"33333333-3333-4333-8333-333333333333","email":"carla@example.com"}', 'email', 'carla@example.com', now(), now(), now()),
  ('44444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444', '{"sub":"44444444-4444-4444-8444-444444444444","email":"dana@example.com"}', 'email', 'dana@example.com', now(), now(), now()),
  ('55555555-5555-4555-8555-555555555555', '55555555-5555-4555-8555-555555555555', '{"sub":"55555555-5555-4555-8555-555555555555","email":"elena@example.com"}', 'email', 'elena@example.com', now(), now(), now()),
  ('66666666-6666-4666-8666-666666666666', '66666666-6666-4666-8666-666666666666', '{"sub":"66666666-6666-4666-8666-666666666666","email":"marcus@example.com"}', 'email', 'marcus@example.com', now(), now(), now()),
  ('77777777-7777-4777-8777-777777777777', '77777777-7777-4777-8777-777777777777', '{"sub":"77777777-7777-4777-8777-777777777777","email":"priya@example.com"}', 'email', 'priya@example.com', now(), now(), now())
on conflict (id) do update
set
  identity_data = excluded.identity_data,
  provider_id = excluded.provider_id,
  last_sign_in_at = excluded.last_sign_in_at,
  updated_at = excluded.updated_at;

-- ----------------------------------------------------------------------------
-- 4. Profiles
-- ----------------------------------------------------------------------------
insert into public.profiles (
  id,
  display_name,
  city,
  primary_sport,
  timezone,
  onboarding_completed_at,
  backfill_completed_at,
  backfill_level
)
values
  ('11111111-1111-4111-8111-111111111111', 'Alice Park', 'Brooklyn', 'running', 'America/New_York', now() - interval '60 days', now() - interval '60 days', 'steady'),
  ('22222222-2222-4222-8222-222222222222', 'Bob Chen', 'Queens', 'cycling', 'America/New_York', now() - interval '45 days', now() - interval '45 days', 'steady'),
  ('33333333-3333-4333-8333-333333333333', 'Carla Diaz', 'Jersey City', 'running', 'America/New_York', now() - interval '90 days', now() - interval '90 days', 'heavy'),
  ('44444444-4444-4444-8444-444444444444', 'Dana Singh', 'Manhattan', 'running', 'America/New_York', null, null, null),
  ('55555555-5555-4555-8555-555555555555', 'Elena Rostova', 'Brooklyn', 'running', 'America/New_York', now() - interval '30 days', now() - interval '30 days', 'steady'),
  ('66666666-6666-4666-8666-666666666666', 'Marcus Vance', 'Manhattan', 'running', 'America/New_York', now() - interval '40 days', now() - interval '40 days', 'heavy'),
  ('77777777-7777-4777-8777-777777777777', 'Priya Patel', 'Queens', 'cycling', 'America/New_York', now() - interval '20 days', now() - interval '20 days', 'light')
on conflict (id) do update
set
  display_name = excluded.display_name,
  city = excluded.city,
  primary_sport = excluded.primary_sport,
  timezone = excluded.timezone,
  onboarding_completed_at = excluded.onboarding_completed_at,
  backfill_completed_at = excluded.backfill_completed_at,
  backfill_level = excluded.backfill_level,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 5. Athlete Prefs (Dana omitted so login retests onboarding)
-- ----------------------------------------------------------------------------
insert into public.athlete_prefs (
  user_id,
  freezes_left,
  calibrated,
  onboarding_completed,
  clock_period_start,
  focus_family,
  focus_id,
  training_goal_distance,
  training_goal_deadline,
  lesson_done_on
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    3,
    true,
    true,
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    'sport',
    'running',
    'half',
    current_date + interval '45 days',
    current_date
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    2,
    true,
    true,
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    'sport',
    'cycling',
    'marathon',
    current_date + interval '60 days',
    current_date
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    3,
    true,
    true,
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    'health',
    'sleep',
    '10k',
    current_date + interval '30 days',
    current_date
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    3,
    true,
    true,
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    'sport',
    'running',
    null,
    null,
    current_date
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    1,
    true,
    true,
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    'sport',
    'running',
    '10k',
    current_date + interval '25 days',
    current_date
  ),
  (
    '77777777-7777-4777-8777-777777777777',
    3,
    true,
    true,
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    'sport',
    'cycling',
    null,
    null,
    current_date
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    3,
    false,
    false,
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    'sport',
    'running',
    null,
    null,
    null
  )
on conflict (user_id) do update
set
  calibrated = excluded.calibrated,
  onboarding_completed = excluded.onboarding_completed,
  clock_period_start = excluded.clock_period_start,
  focus_family = excluded.focus_family,
  focus_id = excluded.focus_id,
  training_goal_distance = excluded.training_goal_distance,
  training_goal_deadline = excluded.training_goal_deadline,
  lesson_done_on = excluded.lesson_done_on,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 6. Sport Ratings
-- ----------------------------------------------------------------------------
insert into public.sport_ratings (
  user_id,
  sport,
  verified_elo,
  open_elo,
  opted_in,
  lock_verified,
  lock_open,
  lock_period
)
values
  -- Alice
  ('11111111-1111-4111-8111-111111111111', 'running', 1125, 1145, true, 1125, 1145, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York')),
  ('11111111-1111-4111-8111-111111111111', 'cycling', 1045, 1060, true, 1045, 1060, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York')),
  ('11111111-1111-4111-8111-111111111111', 'walking', 1000, 1015, true, 1000, 1015, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York')),
  ('11111111-1111-4111-8111-111111111111', 'strength', 1015, 1030, true, 1015, 1030, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York')),
  -- Bob
  ('22222222-2222-4222-8222-222222222222', 'cycling', 1170, 1190, true, 1170, 1190, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York')),
  ('22222222-2222-4222-8222-222222222222', 'running', 1005, 1020, true, 1005, 1020, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York')),
  ('22222222-2222-4222-8222-222222222222', 'walking', 1000, 1010, true, 1000, 1010, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York')),
  ('22222222-2222-4222-8222-222222222222', 'strength', 1000, 1000, false, 1000, 1000, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York')),
  -- Carla
  ('33333333-3333-4333-8333-333333333333', 'running', 1205, 1225, true, 1205, 1225, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York')),
  ('33333333-3333-4333-8333-333333333333', 'strength', 1115, 1140, true, 1115, 1140, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York')),
  ('33333333-3333-4333-8333-333333333333', 'cycling', 1030, 1045, true, 1030, 1045, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York')),
  ('33333333-3333-4333-8333-333333333333', 'walking', 1010, 1025, true, 1010, 1025, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York')),
  -- Elena
  ('55555555-5555-4555-8555-555555555555', 'running', 1095, 1110, true, 1095, 1110, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York')),
  -- Marcus
  ('66666666-6666-4666-8666-666666666666', 'running', 1140, 1160, true, 1140, 1160, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York')),
  -- Priya
  ('77777777-7777-4777-8777-777777777777', 'cycling', 1080, 1095, true, 1080, 1095, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'))
on conflict (user_id, sport) do update
set
  verified_elo = excluded.verified_elo,
  open_elo = excluded.open_elo,
  opted_in = excluded.opted_in,
  lock_verified = excluded.lock_verified,
  lock_open = excluded.lock_open,
  lock_period = excluded.lock_period;

-- ----------------------------------------------------------------------------
-- 7. Health Ratings (Sleep)
-- ----------------------------------------------------------------------------
insert into public.health_ratings (
  user_id,
  metric,
  elo,
  opted_in,
  lock_elo,
  lock_period,
  auto_enroll_next
)
values
  ('11111111-1111-4111-8111-111111111111', 'sleep', 1080, true, 1080, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'), true),
  ('22222222-2222-4222-8222-222222222222', 'sleep', 1015, true, 1015, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'), true),
  ('33333333-3333-4333-8333-333333333333', 'sleep', 1130, true, 1130, (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'), true)
on conflict (user_id, metric) do update
set
  elo = excluded.elo,
  opted_in = excluded.opted_in,
  lock_elo = excluded.lock_elo,
  lock_period = excluded.lock_period;

-- ----------------------------------------------------------------------------
-- 8. Crews & Members
-- ----------------------------------------------------------------------------
insert into public.crews (
  id,
  name,
  invite_code,
  sport,
  format,
  target_sessions,
  journey_km,
  created_by
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Weekday miles',
    'WEEKLY',
    'running',
    'volume',
    4,
    60,
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Brooklyn Dawn Patrol',
    'PATROL',
    'cycling',
    'volume',
    3,
    120,
    '22222222-2222-4222-8222-222222222222'
  )
on conflict (id) do update
set
  name = excluded.name,
  invite_code = excluded.invite_code,
  target_sessions = excluded.target_sessions,
  journey_km = excluded.journey_km,
  created_by = excluded.created_by;

insert into public.crew_members (crew_id, user_id, display_name, status)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Alice Park', 'active'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', 'Bob Chen', 'active'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'Carla Diaz', 'active'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '55555555-5555-4555-8555-555555555555', 'Elena Rostova', 'active'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'Bob Chen', 'active'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', 'Alice Park', 'active'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '77777777-7777-4777-8777-777777777777', 'Priya Patel', 'active')
on conflict (crew_id, user_id) do update
set
  display_name = excluded.display_name,
  status = excluded.status;

-- ----------------------------------------------------------------------------
-- 9. Crew Week Fields (Seating & shared field for current week)
-- ----------------------------------------------------------------------------
insert into public.crew_week_fields (
  crew_id,
  wave_start,
  week_end,
  sport,
  capacity,
  member_ids,
  synthetic_ids
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '7 days',
    'running',
    8,
    array[
      '11111111-1111-4111-8111-111111111111'::uuid,
      '22222222-2222-4222-8222-222222222222'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      '55555555-5555-4555-8555-555555555555'::uuid
    ],
    array['synth-pace-1140', 'synth-tempo-1130']
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '7 days',
    'cycling',
    8,
    array[
      '22222222-2222-4222-8222-222222222222'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      '77777777-7777-4777-8777-777777777777'::uuid
    ],
    array['synth-cadence-1050']
  )
on conflict (crew_id, wave_start) do update
set
  week_end = excluded.week_end,
  member_ids = excluded.member_ids,
  synthetic_ids = excluded.synthetic_ids;

-- ----------------------------------------------------------------------------
-- 10. Wave Enrollments
-- ----------------------------------------------------------------------------
insert into public.wave_enrollments (
  user_id,
  sport,
  wave_start,
  week_end,
  capacity,
  peer_ids,
  synthetic_ids,
  auto_enroll_next,
  crew_id
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'running',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '7 days',
    8,
    array['33333333-3333-4333-8333-333333333333', '66666666-6666-4666-8666-666666666666'],
    array['synth-pace-1140', 'synth-tempo-1130'],
    true,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'cycling',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '7 days',
    8,
    array['22222222-2222-4222-8222-222222222222'],
    array['synth-cadence-1050'],
    true,
    null
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'cycling',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '7 days',
    8,
    array['77777777-7777-4777-8777-777777777777'],
    array['synth-peloton-1180'],
    true,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'running',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '7 days',
    8,
    array['11111111-1111-4111-8111-111111111111'],
    array['synth-ultra-1220'],
    true,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  )
on conflict (user_id, sport, wave_start) do update
set
  week_end = excluded.week_end,
  auto_enroll_next = excluded.auto_enroll_next,
  crew_id = excluded.crew_id;

-- ----------------------------------------------------------------------------
-- 11. Fitness Connections
-- ----------------------------------------------------------------------------
insert into public.fitness_connections (user_id, provider, status, connected_at, updated_at) values
  ('11111111-1111-4111-8111-111111111111', 'strava', 'connected', now() - interval '60 days', now()),
  ('11111111-1111-4111-8111-111111111111', 'whoop', 'connected', now() - interval '30 days', now()),
  ('11111111-1111-4111-8111-111111111111', 'garmin', 'stub', now() - interval '10 days', now()),
  ('22222222-2222-4222-8222-222222222222', 'strava', 'connected', now() - interval '45 days', now()),
  ('22222222-2222-4222-8222-222222222222', 'garmin', 'connected', now() - interval '40 days', now()),
  ('33333333-3333-4333-8333-333333333333', 'strava', 'connected', now() - interval '90 days', now()),
  ('33333333-3333-4333-8333-333333333333', 'oura', 'connected', now() - interval '50 days', now())
on conflict (user_id, provider) do update
set
  status = excluded.status,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 11. Activities (Current Week & Prior Weeks)
-- ----------------------------------------------------------------------------
insert into public.activities (
  id,
  user_id,
  provider,
  external_id,
  category_id,
  started_at,
  metric_value,
  raw_name,
  moving_sec,
  sport,
  distance_m,
  avg_hr,
  verified,
  provenance,
  disposition,
  compete_key,
  source_label
)
values
  -- Alice: Current Week
  (
    'a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    '11111111-1111-4111-8111-111111111111',
    'strava',
    'act-alice-w0-mon',
    '11111111-1111-4111-8111-111111111101',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '1 day 7 hours',
    8200,
    'Prospect Park morning loop',
    2640,
    'running',
    8200,
    154,
    true,
    'recorded',
    'counted',
    'strava-act-alice-w0-mon',
    'Strava'
  ),
  (
    'a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa02',
    '11111111-1111-4111-8111-111111111111',
    'strava',
    'act-alice-w0-tue',
    '11111111-1111-4111-8111-111111111101',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '2 days 6 hours 45 mins',
    4800,
    'Brooklyn Heights recovery shakeout',
    1720,
    'running',
    4800,
    138,
    true,
    'recorded',
    'counted',
    'strava-act-alice-w0-tue',
    'Strava'
  ),
  (
    'a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa03',
    '11111111-1111-4111-8111-111111111111',
    'strava',
    'act-alice-w0-wed',
    '11111111-1111-4111-8111-111111111101',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '3 days 18 hours 15 mins',
    10500,
    'Hudson River Greenway tempo intervals',
    3240,
    'running',
    10500,
    168,
    true,
    'recorded',
    'counted',
    'strava-act-alice-w0-wed',
    'Strava'
  ),
  (
    'a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa04',
    '11111111-1111-4111-8111-111111111111',
    'strava',
    'act-alice-w0-thu',
    '11111111-1111-4111-8111-111111111101',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '4 days 7 hours 30 mins',
    5600,
    'Cobble Hill aerobic jog',
    1980,
    'running',
    5600,
    142,
    true,
    'recorded',
    'counted',
    'strava-act-alice-w0-thu',
    'Strava'
  ),
  (
    'a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa05',
    '11111111-1111-4111-8111-111111111111',
    'strava',
    'act-alice-w0-fri',
    '11111111-1111-4111-8111-111111111102',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '5 days 17 hours',
    24000,
    'East River bridges recovery spin',
    3900,
    'cycling',
    24000,
    135,
    true,
    'recorded',
    'counted',
    'strava-act-alice-w0-fri',
    'Strava'
  ),
  (
    'a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa06',
    '11111111-1111-4111-8111-111111111111',
    'strava',
    'act-alice-w0-sat',
    '11111111-1111-4111-8111-111111111101',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '6 days 8 hours 30 mins',
    16800,
    'Queensboro to Central Park long run',
    5400,
    'running',
    16800,
    158,
    true,
    'recorded',
    'counted',
    'strava-act-alice-w0-sat',
    'Strava'
  ),
  -- Alice: Last Week
  (
    'a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa07',
    '11111111-1111-4111-8111-111111111111',
    'strava',
    'act-alice-w1-tue',
    '11111111-1111-4111-8111-111111111101',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') - interval '5 days',
    10000,
    'Midweek threshold 10K',
    3120,
    'running',
    10000,
    164,
    true,
    'recorded',
    'counted',
    'strava-act-alice-w1-tue',
    'Strava'
  ),
  (
    'a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa08',
    '11111111-1111-4111-8111-111111111111',
    'strava',
    'act-alice-w1-sat',
    '11111111-1111-4111-8111-111111111101',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') - interval '1 day 16 hours',
    18500,
    'Half marathon pacing long run',
    5940,
    'running',
    18500,
    156,
    true,
    'recorded',
    'counted',
    'strava-act-alice-w1-sat',
    'Strava'
  ),
  -- Bob: Current Week (Cycling & Running)
  (
    'b2222222-bbbb-4bbb-8bbb-bbbbbbbbbb01',
    '22222222-2222-4222-8222-222222222222',
    'strava',
    'act-bob-w0-mon',
    '11111111-1111-4111-8111-111111111102',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '1 day 6 hours',
    28000,
    'Flushing Meadows tempo laps',
    3600,
    'cycling',
    28000,
    140,
    true,
    'recorded',
    'counted',
    'strava-act-bob-w0-mon',
    'Strava'
  ),
  (
    'b2222222-bbbb-4bbb-8bbb-bbbbbbbbbb02',
    '22222222-2222-4222-8222-222222222222',
    'strava',
    'act-bob-w0-wed',
    '11111111-1111-4111-8111-111111111102',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '3 days 6 hours',
    42000,
    'Rockaway beach endurance loop',
    5200,
    'cycling',
    42000,
    146,
    true,
    'recorded',
    'counted',
    'strava-act-bob-w0-wed',
    'Strava'
  ),
  (
    'b2222222-bbbb-4bbb-8bbb-bbbbbbbbbb03',
    '22222222-2222-4222-8222-222222222222',
    'strava',
    'act-bob-w0-fri',
    '11111111-1111-4111-8111-111111111101',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '5 days 7 hours',
    6000,
    'Queens cross-training shakeout',
    2100,
    'running',
    6000,
    134,
    true,
    'recorded',
    'counted',
    'strava-act-bob-w0-fri',
    'Strava'
  ),
  (
    'b2222222-bbbb-4bbb-8bbb-bbbbbbbbbb04',
    '22222222-2222-4222-8222-222222222222',
    'strava',
    'act-bob-w0-sat',
    '11111111-1111-4111-8111-111111111102',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '6 days 7 hours 30 mins',
    58000,
    'Century builder endurance ride',
    7200,
    'cycling',
    58000,
    150,
    true,
    'recorded',
    'counted',
    'strava-act-bob-w0-sat',
    'Strava'
  ),
  -- Carla: Current Week (Running & Heavy Strength)
  (
    'c3333333-cccc-4ccc-8ccc-cccccccccc01',
    '33333333-3333-4333-8333-333333333333',
    'strava',
    'act-carla-w0-mon',
    '11111111-1111-4111-8111-111111111101',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '1 day 18 hours',
    10400,
    'Hudson River waterfront run',
    3180,
    'running',
    10400,
    162,
    true,
    'recorded',
    'counted',
    'strava-act-carla-w0-mon',
    'Strava'
  ),
  (
    'c3333333-cccc-4ccc-8ccc-cccccccccc02',
    '33333333-3333-4333-8333-333333333333',
    'mock',
    'act-carla-w0-tue',
    '11111111-1111-4111-8111-111111111104',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '2 days 17 hours 30 mins',
    3600,
    'Lower body hypertrophy & deadlifts',
    3600,
    'strength',
    0,
    130,
    false,
    'recorded',
    'counted',
    'mock-act-carla-w0-tue',
    'Garmin'
  ),
  (
    'c3333333-cccc-4ccc-8ccc-cccccccccc03',
    '33333333-3333-4333-8333-333333333333',
    'strava',
    'act-carla-w0-thu',
    '11111111-1111-4111-8111-111111111101',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '4 days 18 hours',
    12200,
    'Palisades Interstate hill repeats',
    3700,
    'running',
    12200,
    174,
    true,
    'recorded',
    'counted',
    'strava-act-carla-w0-thu',
    'Strava'
  ),
  (
    'c3333333-cccc-4ccc-8ccc-cccccccccc04',
    '33333333-3333-4333-8333-333333333333',
    'strava',
    'act-carla-w0-sat',
    '11111111-1111-4111-8111-111111111101',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '6 days 9 hours',
    21100,
    'Saturday half marathon progression',
    6120,
    'running',
    21100,
    166,
    true,
    'recorded',
    'counted',
    'strava-act-carla-w0-sat',
    'Strava'
  ),
  -- Elena & Marcus
  (
    'e5555555-eeee-4eee-8eee-eeeeeeeeee01',
    '55555555-5555-4555-8555-555555555555',
    'strava',
    'act-elena-w0-tue',
    '11111111-1111-4111-8111-111111111101',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '2 days 7 hours',
    7500,
    'Prospect Park loop with Elena',
    2400,
    'running',
    7500,
    150,
    true,
    'recorded',
    'counted',
    'strava-act-elena-w0-tue',
    'Strava'
  ),
  (
    '66666666-6666-4666-8666-666666666601',
    '66666666-6666-4666-8666-666666666666',
    'strava',
    'act-marcus-w0-wed',
    '11111111-1111-4111-8111-111111111101',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '3 days 19 hours',
    11000,
    'Central Park reservoir tempo',
    3300,
    'running',
    11000,
    165,
    true,
    'recorded',
    'counted',
    'strava-act-marcus-w0-wed',
    'Strava'
  )
on conflict (id) do update
set
  started_at = excluded.started_at,
  metric_value = excluded.metric_value,
  distance_m = excluded.distance_m,
  moving_sec = excluded.moving_sec,
  avg_hr = excluded.avg_hr;

-- ----------------------------------------------------------------------------
-- 12. Crew Entries
-- ----------------------------------------------------------------------------
insert into public.crew_entries (
  crew_id,
  user_id,
  activity_id,
  started_at,
  sport,
  distance_m,
  moving_sec,
  disposition,
  provenance
)
values
  -- Weekday miles (Alice's crew)
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'strava-act-alice-w0-mon', (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '1 day 7 hours', 'running', 8200, 2640, 'counted', 'recorded'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'strava-act-alice-w0-wed', (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '3 days 18 hours 15 mins', 'running', 10500, 3240, 'counted', 'recorded'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'strava-act-alice-w0-sat', (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '6 days 8 hours 30 mins', 'running', 16800, 5400, 'counted', 'recorded'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', 'strava-act-bob-w0-fri', (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '5 days 7 hours', 'running', 6000, 2100, 'counted', 'recorded'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'strava-act-carla-w0-mon', (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '1 day 18 hours', 'running', 10400, 3180, 'counted', 'recorded'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'strava-act-carla-w0-sat', (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '6 days 9 hours', 'running', 21100, 6120, 'counted', 'recorded'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '55555555-5555-4555-8555-555555555555', 'strava-act-elena-w0-tue', (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '2 days 7 hours', 'running', 7500, 2400, 'counted', 'recorded'),
  -- Brooklyn Dawn Patrol (Cycling crew)
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'strava-act-bob-w0-mon', (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '1 day 6 hours', 'cycling', 28000, 3600, 'counted', 'recorded'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', 'strava-act-bob-w0-wed', (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '3 days 6 hours', 'cycling', 42000, 5200, 'counted', 'recorded'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', 'strava-act-alice-w0-fri', (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '5 days 17 hours', 'cycling', 24000, 3900, 'counted', 'recorded')
on conflict (crew_id, user_id, activity_id) do update
set
  started_at = excluded.started_at,
  distance_m = excluded.distance_m,
  moving_sec = excluded.moving_sec;

-- ----------------------------------------------------------------------------
-- 13. Crew Cheers
-- ----------------------------------------------------------------------------
insert into public.crew_cheers (id, crew_id, from_user, activity_id, created_at) values
  ('cc000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', 'strava-act-alice-w0-sat', now() - interval '4 hours'),
  ('cc000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'strava-act-alice-w0-wed', now() - interval '2 days'),
  ('cc000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'strava-act-carla-w0-sat', now() - interval '2 hours')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 14. Crew Notices
-- ----------------------------------------------------------------------------
insert into public.crew_notices (id, user_id, crew_id, kind, body, created_at) values
  (
    'ce000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'journey_progress',
    'Weekday miles has crossed 50 km towards the 60 km weekly journey!',
    now() - interval '3 hours'
  ),
  (
    'ce000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'member_cheer',
    'Bob Chen cheered your 16.8 km weekend long run.',
    now() - interval '4 hours'
  ),
  (
    'ce000000-0000-4000-8000-000000000003',
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'journey_milestone',
    'Brooklyn Dawn Patrol unlocked week milestone: 100+ km collective endurance.',
    now() - interval '1 day'
  )
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 15. Sleep Nights (Past 10 Days for Alice, Bob, Carla)
-- ----------------------------------------------------------------------------
insert into public.sleep_nights (
  user_id,
  night_id,
  day,
  score,
  duration_min,
  efficiency,
  deep_min,
  rem_min,
  light_min,
  awake_min,
  source,
  verified
)
values
  -- Alice (Whoop source)
  ('11111111-1111-4111-8111-111111111111', 'slp-alice-d0', current_date, 88, 465, 94, 85, 105, 250, 25, 'whoop', true),
  ('11111111-1111-4111-8111-111111111111', 'slp-alice-d1', current_date - 1, 91, 480, 96, 95, 110, 255, 20, 'whoop', true),
  ('11111111-1111-4111-8111-111111111111', 'slp-alice-d2', current_date - 2, 82, 440, 91, 75, 95, 240, 30, 'whoop', true),
  ('11111111-1111-4111-8111-111111111111', 'slp-alice-d3', current_date - 3, 76, 410, 88, 65, 80, 235, 30, 'whoop', true),
  ('11111111-1111-4111-8111-111111111111', 'slp-alice-d4', current_date - 4, 85, 455, 93, 80, 100, 250, 25, 'whoop', true),
  ('11111111-1111-4111-8111-111111111111', 'slp-alice-d5', current_date - 5, 89, 470, 95, 90, 105, 255, 20, 'whoop', true),
  ('11111111-1111-4111-8111-111111111111', 'slp-alice-d6', current_date - 6, 84, 450, 92, 78, 98, 246, 28, 'whoop', true),
  -- Bob (Garmin source)
  ('22222222-2222-4222-8222-222222222222', 'slp-bob-d0', current_date, 80, 430, 90, 70, 85, 245, 30, 'garmin', true),
  ('22222222-2222-4222-8222-222222222222', 'slp-bob-d1', current_date - 1, 84, 455, 92, 75, 95, 255, 30, 'garmin', true),
  ('22222222-2222-4222-8222-222222222222', 'slp-bob-d2', current_date - 2, 79, 420, 89, 68, 88, 234, 30, 'garmin', true),
  -- Carla (Oura source)
  ('33333333-3333-4333-8333-333333333333', 'slp-carla-d0', current_date, 92, 490, 97, 100, 120, 250, 20, 'oura', true),
  ('33333333-3333-4333-8333-333333333333', 'slp-carla-d1', current_date - 1, 89, 475, 95, 92, 110, 253, 20, 'oura', true),
  ('33333333-3333-4333-8333-333333333333', 'slp-carla-d2', current_date - 2, 94, 510, 98, 105, 125, 260, 20, 'oura', true)
on conflict (user_id, night_id) do update
set
  score = excluded.score,
  duration_min = excluded.duration_min;

-- ----------------------------------------------------------------------------
-- 16. Readiness Marks
-- ----------------------------------------------------------------------------
insert into public.readiness_marks (user_id, provider, external_id, day, score) values
  ('11111111-1111-4111-8111-111111111111', 'whoop', 'readiness-alice-d0', current_date, 86),
  ('11111111-1111-4111-8111-111111111111', 'whoop', 'readiness-alice-d1', current_date - 1, 91),
  ('11111111-1111-4111-8111-111111111111', 'whoop', 'readiness-alice-d2', current_date - 2, 80),
  ('11111111-1111-4111-8111-111111111111', 'whoop', 'readiness-alice-d3', current_date - 3, 74),
  ('22222222-2222-4222-8222-222222222222', 'garmin', 'readiness-bob-d0', current_date, 79),
  ('33333333-3333-4333-8333-333333333333', 'oura', 'readiness-carla-d0', current_date, 93)
on conflict (user_id, provider, external_id) do update
set
  score = excluded.score;

-- ----------------------------------------------------------------------------
-- 17. Compete Duels
-- ----------------------------------------------------------------------------
insert into public.compete_duels (
  user_id,
  duel_id,
  sport,
  period_start,
  rival_id,
  rival_name,
  rival_elo,
  source
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'duel-alice-marcus-w0',
    'running',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    '66666666-6666-4666-8666-666666666666',
    'Marcus Vance',
    1160,
    'auto'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'duel-bob-priya-w0',
    'cycling',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    '77777777-7777-4777-8777-777777777777',
    'Priya Patel',
    1095,
    'auto'
  )
on conflict (user_id, duel_id) do update
set
  rival_name = excluded.rival_name,
  rival_elo = excluded.rival_elo;

-- ----------------------------------------------------------------------------
-- 18. Period Results (Settled Season History - Past 4 Weeks)
-- ----------------------------------------------------------------------------
insert into public.period_results (
  user_id,
  period_start,
  sport,
  track,
  period_end,
  place,
  field_size,
  effort,
  distance_m,
  moving_sec,
  elo_before,
  elo_after,
  frozen,
  settled_at,
  acknowledged_at
)
values
  -- Alice - Week -1
  (
    '11111111-1111-4111-8111-111111111111',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') - interval '7 days',
    'running',
    'open',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    2,
    18,
    48500,
    48500,
    15600,
    1122,
    1145,
    false,
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    now()
  ),
  -- Alice - Week -2
  (
    '11111111-1111-4111-8111-111111111111',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') - interval '14 days',
    'running',
    'open',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') - interval '7 days',
    1,
    16,
    52300,
    52300,
    16800,
    1098,
    1122,
    false,
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') - interval '7 days',
    now()
  ),
  -- Alice - Week -3
  (
    '11111111-1111-4111-8111-111111111111',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') - interval '21 days',
    'running',
    'open',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') - interval '14 days',
    4,
    20,
    41200,
    41200,
    13400,
    1090,
    1098,
    false,
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') - interval '14 days',
    now()
  ),
  -- Alice - Week -4
  (
    '11111111-1111-4111-8111-111111111111',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') - interval '28 days',
    'running',
    'open',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') - interval '21 days',
    3,
    15,
    44500,
    44500,
    14200,
    1072,
    1090,
    false,
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') - interval '21 days',
    now()
  ),
  -- Bob - Week -1 (Cycling)
  (
    '22222222-2222-4222-8222-222222222222',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') - interval '7 days',
    'cycling',
    'open',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    1,
    14,
    145000,
    145000,
    18200,
    1165,
    1190,
    false,
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    now()
  ),
  -- Carla - Week -1 (Running)
  (
    '33333333-3333-4333-8333-333333333333',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') - interval '7 days',
    'running',
    'open',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    1,
    18,
    62000,
    62000,
    18900,
    1200,
    1225,
    false,
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    now()
  )
on conflict (user_id, period_start, sport, track) do update
set
  place = excluded.place,
  effort = excluded.effort,
  elo_after = excluded.elo_after,
  acknowledged_at = excluded.acknowledged_at;

-- ----------------------------------------------------------------------------
-- 19. Health Period Results (Sleep History)
-- ----------------------------------------------------------------------------
insert into public.health_period_results (
  user_id,
  result_id,
  metric,
  period_start,
  period_end,
  place,
  field_size,
  score,
  elo_before,
  elo_after,
  settled_at
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'health-res-alice-w1',
    'sleep',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') - interval '7 days',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    3,
    12,
    86,
    1065,
    1080,
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York')
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'health-res-carla-w1',
    'sleep',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') - interval '7 days',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    1,
    12,
    93,
    1110,
    1130,
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York')
  )
on conflict (user_id, result_id) do update
set
  place = excluded.place,
  score = excluded.score,
  elo_after = excluded.elo_after;

-- ----------------------------------------------------------------------------
-- 20. Battles, Periods & Standings (NYC Runners League)
-- ----------------------------------------------------------------------------
insert into public.battles (
  id,
  name,
  mode,
  category_id,
  period_kind,
  status,
  invite_code,
  created_by
)
values
  (
    '99999999-9999-4999-8999-999999999901',
    'NYC Metro Runners',
    'group',
    '11111111-1111-4111-8111-111111111101',
    'weekly',
    'active',
    'NYCRUN',
    '11111111-1111-4111-8111-111111111111'
  ),
  (
    '99999999-9999-4999-8999-999999999902',
    'Five Boro Century',
    'group',
    '11111111-1111-4111-8111-111111111102',
    'weekly',
    'active',
    'BORORIDE',
    '22222222-2222-4222-8222-222222222222'
  )
on conflict (id) do update
set
  name = excluded.name,
  status = excluded.status,
  invite_code = excluded.invite_code;

insert into public.battle_memberships (battle_id, user_id, role) values
  ('99999999-9999-4999-8999-999999999901', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('99999999-9999-4999-8999-999999999901', '33333333-3333-4333-8333-333333333333', 'member'),
  ('99999999-9999-4999-8999-999999999901', '66666666-6666-4666-8666-666666666666', 'member'),
  ('99999999-9999-4999-8999-999999999901', '55555555-5555-4555-8555-555555555555', 'member'),
  ('99999999-9999-4999-8999-999999999901', '22222222-2222-4222-8222-222222222222', 'member'),
  ('99999999-9999-4999-8999-999999999902', '22222222-2222-4222-8222-222222222222', 'owner'),
  ('99999999-9999-4999-8999-999999999902', '11111111-1111-4111-8111-111111111111', 'member'),
  ('99999999-9999-4999-8999-999999999902', '77777777-7777-4777-8777-777777777777', 'member')
on conflict (battle_id, user_id) do nothing;

insert into public.periods (
  id,
  battle_id,
  kind,
  starts_at,
  ends_at,
  is_current
)
values
  (
    '88888888-8888-4888-8888-888888888801',
    '99999999-9999-4999-8999-999999999901',
    'weekly',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '7 days',
    true
  ),
  (
    '88888888-8888-4888-8888-888888888802',
    '99999999-9999-4999-8999-999999999902',
    'weekly',
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York'),
    (date_trunc('week', (now() at time zone 'America/New_York')) at time zone 'America/New_York') + interval '7 days',
    true
  )
on conflict (id) do update
set
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  is_current = excluded.is_current;

insert into public.standings (period_id, user_id, score, rank) values
  ('88888888-8888-4888-8888-888888888801', '11111111-1111-4111-8111-111111111111', 51100, 1),
  ('88888888-8888-4888-8888-888888888801', '33333333-3333-4333-8333-333333333333', 47300, 2),
  ('88888888-8888-4888-8888-888888888801', '66666666-6666-4666-8666-666666666666', 38200, 3),
  ('88888888-8888-4888-8888-888888888801', '55555555-5555-4555-8555-555555555555', 29500, 4),
  ('88888888-8888-4888-8888-888888888801', '22222222-2222-4222-8222-222222222222', 12000, 5),
  ('88888888-8888-4888-8888-888888888802', '22222222-2222-4222-8222-222222222222', 128000, 1),
  ('88888888-8888-4888-8888-888888888802', '77777777-7777-4777-8777-777777777777', 84000, 2),
  ('88888888-8888-4888-8888-888888888802', '11111111-1111-4111-8111-111111111111', 24000, 3)
on conflict (period_id, user_id) do update
set
  score = excluded.score,
  rank = excluded.rank,
  updated_at = now();
