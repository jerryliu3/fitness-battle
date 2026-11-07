-- Add multi-session activities for demo accounts in production (Alice, Bob, Carla)
do $$
declare
  v_week_start timestamptz := date_trunc('week', now() at time zone 'America/New_York') at time zone 'America/New_York';
  v_alice_uid uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  v_bob_uid uuid := '22222222-2222-4222-8222-222222222222'::uuid;
  v_carla_uid uuid := '33333333-3333-4333-8333-333333333333'::uuid;
  v_cat_running uuid;
  v_cat_strength uuid;
begin
  if not exists (select 1 from auth.users where id = v_alice_uid) then
    return;
  end if;

  select id into v_cat_running from public.categories where slug = 'running' limit 1;
  select id into v_cat_strength from public.categories where slug = 'strength' limit 1;

  if v_cat_running is null or v_cat_strength is null then
    return;
  end if;

  insert into public.activities (
    id, user_id, provider, external_id, category_id, started_at, metric_value, raw_name, moving_sec, sport, distance_m, avg_hr, verified, provenance, disposition, compete_key, source_label
  ) values
    -- Alice: Weekly strength sessions (Mon, Tue, Thu, Fri, Sat)
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa20', v_alice_uid, 'whoop', 'act-alice-w0-mon-str', v_cat_strength, v_week_start + interval '18 hours', 2700, 'Monday evening kettlebell & core', 2700, 'strength', 0, 136, false, 'recorded', 'counted', 'strava-act-alice-w0-mon-str', 'WHOOP'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa21', v_alice_uid, 'whoop', 'act-alice-w0-tue-2', v_cat_strength, v_week_start + interval '1 day 17 hours 30 mins', 3300, 'Core & stability strength', 3300, 'strength', 0, 138, false, 'recorded', 'counted', 'strava-act-alice-w0-tue-2', 'WHOOP'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa23', v_alice_uid, 'whoop', 'act-alice-w0-thu-str', v_cat_strength, v_week_start + interval '3 days 12 hours 15 mins', 3600, 'Midday compound lifts & tempo squats', 3600, 'strength', 0, 144, false, 'recorded', 'counted', 'strava-act-alice-w0-thu-str', 'WHOOP'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa24', v_alice_uid, 'whoop', 'act-alice-w0-fri-str', v_cat_strength, v_week_start + interval '4 days 18 hours 30 mins', 2700, 'Friday posterior chain & mobility', 2700, 'strength', 0, 134, false, 'recorded', 'counted', 'strava-act-alice-w0-fri-str', 'WHOOP'),
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa25', v_alice_uid, 'whoop', 'act-alice-w0-sat-str', v_cat_strength, v_week_start + interval '5 days 15 hours', 3900, 'Weekend full-body strength circuit', 3900, 'strength', 0, 146, false, 'recorded', 'counted', 'strava-act-alice-w0-sat-str', 'WHOOP'),
    -- Alice: Thursday evening recovery shakeout
    ('a1111111-aaaa-4aaa-8aaa-aaaaaaaaaa22', v_alice_uid, 'strava', 'act-alice-w0-thu-2', v_cat_running, v_week_start + interval '3 days 18 hours 15 mins', 3200, 'Evening recovery shakeout', 1140, 'running', 3200, 130, true, 'recorded', 'counted', 'strava-act-alice-w0-thu-2', 'Strava'),
    -- Bob: Monday evening recovery run
    ('b2222222-bbbb-4bbb-8bbb-bbbbbbbbbb21', v_bob_uid, 'garmin', 'act-bob-w0-mon-2', v_cat_running, v_week_start + interval '18 hours', 4000, 'Cross-training recovery jog', 1440, 'running', 4000, 135, true, 'recorded', 'counted', 'strava-act-bob-w0-mon-2', 'Garmin'),
    -- Carla: Monday evening strength session
    ('c3333333-cccc-4ccc-8ccc-cccccccccc21', v_carla_uid, 'whoop', 'act-carla-w0-mon-2', v_cat_strength, v_week_start + interval '17 hours 30 mins', 3000, 'Lower body strength & mobility', 3000, 'strength', 0, 128, false, 'recorded', 'counted', 'strava-act-carla-w0-mon-2', 'WHOOP')
  on conflict (user_id, provider, external_id) do update set
    started_at = excluded.started_at,
    metric_value = excluded.metric_value,
    moving_sec = excluded.moving_sec,
    avg_hr = excluded.avg_hr;
end;
$$;
