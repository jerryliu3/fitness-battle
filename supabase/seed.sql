-- Local testing accounts (same shape as Goalmaxxing / Cadence).
-- Confirmed email, password password123:
--   alice@example.com  finished onboarding, crew owner
--   bob@example.com    finished onboarding, crew member
--   carla@example.com  finished onboarding, crew member
--   dana@example.com   signed-up only, so onboarding can be retested
--
-- `pnpm supabase:reset` applies migrations, then this file.

insert into public.categories (id, slug, name, unit, description) values
  ('11111111-1111-4111-8111-111111111101', 'running', 'Running', 'meters', 'Distance covered on foot runs.'),
  ('11111111-1111-4111-8111-111111111102', 'cycling', 'Cycling', 'meters', 'Ride distance from your tracker.'),
  ('11111111-1111-4111-8111-111111111103', 'walking', 'Walking', 'meters', 'Walk and hike distance.'),
  ('11111111-1111-4111-8111-111111111104', 'strength', 'Strength', 'seconds', 'Session duration from strength workouts.')
on conflict (slug) do nothing;

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
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Alice Park"}',
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'bob@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Bob Chen"}',
    now(),
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'carla@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Carla Diaz"}',
    now(),
    now()
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'dana@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"Dana Singh"}',
    now(),
    now()
  )
on conflict (id) do update
set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  confirmation_token = excluded.confirmation_token,
  recovery_token = excluded.recovery_token,
  email_change_token_new = excluded.email_change_token_new,
  email_change_token_current = excluded.email_change_token_current,
  reauthentication_token = excluded.reauthentication_token,
  email_change = excluded.email_change,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at;

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
  (
    '11111111-1111-4111-8111-111111111111',
    '11111111-1111-4111-8111-111111111111',
    '{"sub":"11111111-1111-4111-8111-111111111111","email":"alice@example.com"}',
    'email',
    'alice@example.com',
    now(),
    now(),
    now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '22222222-2222-4222-8222-222222222222',
    '{"sub":"22222222-2222-4222-8222-222222222222","email":"bob@example.com"}',
    'email',
    'bob@example.com',
    now(),
    now(),
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '33333333-3333-4333-8333-333333333333',
    '{"sub":"33333333-3333-4333-8333-333333333333","email":"carla@example.com"}',
    'email',
    'carla@example.com',
    now(),
    now(),
    now()
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '44444444-4444-4444-8444-444444444444',
    '{"sub":"44444444-4444-4444-8444-444444444444","email":"dana@example.com"}',
    'email',
    'dana@example.com',
    now(),
    now(),
    now()
  )
on conflict (id) do update
set
  identity_data = excluded.identity_data,
  provider_id = excluded.provider_id,
  last_sign_in_at = excluded.last_sign_in_at,
  updated_at = excluded.updated_at;

-- Signup trigger creates the profile row. Fill local-test fields after that.
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
  (
    '11111111-1111-4111-8111-111111111111',
    'Alice Park',
    'Brooklyn',
    'running',
    'America/New_York',
    now(),
    now(),
    'steady'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Bob Chen',
    'Queens',
    'running',
    'America/New_York',
    now(),
    now(),
    'light'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Carla Diaz',
    'Jersey City',
    'running',
    'America/New_York',
    now(),
    now(),
    'heavy'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'Dana Singh',
    '',
    'running',
    'UTC',
    null,
    null,
    null
  )
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

-- Dana has no prefs row, so sign-in still opens onboarding.
insert into public.athlete_prefs (
  user_id,
  freezes_left,
  calibrated,
  onboarding_completed,
  clock_period_start,
  focus_family,
  focus_id
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    3,
    true,
    true,
    (date_trunc('week', (now() at time zone 'utc')) at time zone 'utc'),
    'sport',
    'running'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    3,
    true,
    true,
    (date_trunc('week', (now() at time zone 'utc')) at time zone 'utc'),
    'sport',
    'running'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    3,
    true,
    true,
    (date_trunc('week', (now() at time zone 'utc')) at time zone 'utc'),
    'sport',
    'running'
  )
on conflict (user_id) do update
set
  calibrated = excluded.calibrated,
  onboarding_completed = excluded.onboarding_completed,
  clock_period_start = excluded.clock_period_start,
  focus_family = excluded.focus_family,
  focus_id = excluded.focus_id,
  updated_at = now();

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
  (
    '11111111-1111-4111-8111-111111111111',
    'running',
    1040,
    1040,
    true,
    1040,
    1040,
    (date_trunc('week', (now() at time zone 'utc')) at time zone 'utc')
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'running',
    980,
    980,
    true,
    980,
    980,
    (date_trunc('week', (now() at time zone 'utc')) at time zone 'utc')
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'running',
    1010,
    1010,
    true,
    1010,
    1010,
    (date_trunc('week', (now() at time zone 'utc')) at time zone 'utc')
  )
on conflict (user_id, sport) do update
set
  verified_elo = excluded.verified_elo,
  open_elo = excluded.open_elo,
  opted_in = excluded.opted_in,
  lock_verified = excluded.lock_verified,
  lock_open = excluded.lock_open,
  lock_period = excluded.lock_period;

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
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Weekday miles',
  'WEEKLY',
  'running',
  'volume',
  3,
  40,
  '11111111-1111-4111-8111-111111111111'
)
on conflict (id) do update
set
  name = excluded.name,
  invite_code = excluded.invite_code,
  created_by = excluded.created_by;

insert into public.crew_members (crew_id, user_id, display_name, status)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Alice Park', 'active'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', 'Bob Chen', 'active'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '33333333-3333-4333-8333-333333333333', 'Carla Diaz', 'active')
on conflict (crew_id, user_id) do update
set
  display_name = excluded.display_name,
  status = excluded.status;

-- This week's runs, counted as demo so local boards are not empty.
-- Distances stay in metric_value (meters) and distance_m.
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
  verified,
  provenance,
  disposition,
  compete_key,
  source_label
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
    '11111111-1111-4111-8111-111111111111',
    'mock',
    'seed-alice-mon',
    '11111111-1111-4111-8111-111111111101',
    (date_trunc('week', (now() at time zone 'utc')) at time zone 'utc') + interval '1 day 7 hours',
    8200,
    'Prospect Park loop',
    2640,
    'running',
    8200,
    false,
    'demo',
    'counted',
    'mock-seed-alice-mon',
    'Local seed'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
    '22222222-2222-4222-8222-222222222222',
    'mock',
    'seed-bob-tue',
    '11111111-1111-4111-8111-111111111101',
    (date_trunc('week', (now() at time zone 'utc')) at time zone 'utc') + interval '2 days 6 hours',
    5100,
    'Queens easy',
    1920,
    'running',
    5100,
    false,
    'demo',
    'counted',
    'mock-seed-bob-tue',
    'Local seed'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03',
    '33333333-3333-4333-8333-333333333333',
    'mock',
    'seed-carla-wed',
    '11111111-1111-4111-8111-111111111101',
    (date_trunc('week', (now() at time zone 'utc')) at time zone 'utc') + interval '3 days 18 hours',
    10400,
    'Hudson path',
    3180,
    'running',
    10400,
    false,
    'demo',
    'counted',
    'mock-seed-carla-wed',
    'Local seed'
  )
on conflict (id) do update
set
  started_at = excluded.started_at,
  metric_value = excluded.metric_value,
  distance_m = excluded.distance_m,
  moving_sec = excluded.moving_sec;

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
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'mock-seed-alice-mon',
    (date_trunc('week', (now() at time zone 'utc')) at time zone 'utc') + interval '1 day 7 hours',
    'running',
    8200,
    2640,
    'counted',
    'demo'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '22222222-2222-4222-8222-222222222222',
    'mock-seed-bob-tue',
    (date_trunc('week', (now() at time zone 'utc')) at time zone 'utc') + interval '2 days 6 hours',
    'running',
    5100,
    1920,
    'counted',
    'demo'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '33333333-3333-4333-8333-333333333333',
    'mock-seed-carla-wed',
    (date_trunc('week', (now() at time zone 'utc')) at time zone 'utc') + interval '3 days 18 hours',
    'running',
    10400,
    3180,
    'counted',
    'demo'
  )
on conflict (crew_id, user_id, activity_id) do update
set
  started_at = excluded.started_at,
  distance_m = excluded.distance_m,
  moving_sec = excluded.moving_sec;
