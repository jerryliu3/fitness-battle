-- Add multi-session activities for demo accounts in production (Alice, Bob, Carla)
do $$
declare
  v_week_start timestamptz := date_trunc('week', now() at time zone 'America/New_York') at time zone 'America/New_York';
  v_alice_uid uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  v_bob_uid uuid := '22222222-2222-4222-8222-222222222222'::uuid;
  v_carla_uid uuid := '33333333-3333-4333-8333-333333333333'::uuid;
  v_cat_running uuid := 'c1111111-1111-4111-8111-111111111111'::uuid;
begin
  if not exists (select 1 from auth.users where id = v_alice_uid) then
    return;
  end if;

  insert into public.activities (
    id, user_id, provider, external_id, category_id, started_at, metric_value, raw_name, moving_sec, sport, distance_m, avg_hr, verified, provenance, disposition, compete_key, source_label
  ) values
    -- Alice: Tuesday afternoon strength session
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa21', v_alice_uid, 'whoop', 'act-alice-w0-tue-2', null, v_week_start + interval '1 day 17 hours 30 mins', 0, 'Core & stability strength', 2700, 'strength', 0, 132, false, 'recorded', 'counted', 'strava-act-alice-w0-tue-2', 'WHOOP'),
    -- Alice: Thursday evening recovery shakeout
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa22', v_alice_uid, 'strava', 'act-alice-w0-thu-2', v_cat_running, v_week_start + interval '3 days 18 hours 15 mins', 3200, 'Evening recovery shakeout', 1140, 'running', 3200, 130, true, 'recorded', 'counted', 'strava-act-alice-w0-thu-2', 'Strava'),
    -- Bob: Monday evening recovery run
    ('b2222222-bbbb-4bbb-8bbb-bbbbbbbbbb21', v_bob_uid, 'garmin', 'act-bob-w0-mon-2', v_cat_running, v_week_start + interval '18 hours', 4000, 'Cross-training recovery jog', 1440, 'running', 4000, 135, true, 'recorded', 'counted', 'strava-act-bob-w0-mon-2', 'Garmin'),
    -- Carla: Monday evening strength session
    ('c3333333-cccc-4ccc-8ccc-cccccccccc21', v_carla_uid, 'whoop', 'act-carla-w0-mon-2', null, v_week_start + interval '17 hours 30 mins', 0, 'Lower body strength & mobility', 3000, 'strength', 0, 128, false, 'recorded', 'counted', 'strava-act-carla-w0-mon-2', 'WHOOP')
  on conflict (user_id, provider, external_id) do nothing;
end;
$$;
