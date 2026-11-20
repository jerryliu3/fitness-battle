-- Run after migrations inside a rollback-only transaction. Not a seed.
do $$
<<fixture>>
declare
  admin_id uuid := gen_random_uuid();
  ny1 uuid := gen_random_uuid(); ny2 uuid := gen_random_uuid();
  ldn1 uuid := gen_random_uuid(); ldn2 uuid := gen_random_uuid();
  now_at timestamptz := clock_timestamp();
  city_cup public.special_event_editions;
  active_tpl public.special_event_templates;
  paused_tpl public.special_event_templates;
  tpl_series text := 'test-auto-' || substr(admin_id::text, 1, 8);
  paused_series text := 'test-paused-' || substr(admin_id::text, 1, 8);
  mon_start_day date := date_trunc('week', (now_at at time zone 'America/New_York'))::date + 7;
  mon_start_at timestamptz := ((mon_start_day::timestamp + interval '6 hours') at time zone 'America/New_York');
  created integer;
  created_again integer;
  auto_ed public.special_event_editions;
begin
  insert into auth.users(id, email) values
    (admin_id, admin_id::text || '@test.invalid'),
    (ny1, ny1::text || '@test.invalid'), (ny2, ny2::text || '@test.invalid'),
    (ldn1, ldn1::text || '@test.invalid'), (ldn2, ldn2::text || '@test.invalid');

  insert into public.profiles(id, display_name, country_code, city_slug) values
    (admin_id, 'Admin', 'US', 'us:new-york'),
    (ny1, 'NY One', 'US', null), (ny2, 'NY Two', 'US', 'us:new-york'),
    (ldn1, 'LDN One', 'GB', 'gb:london'), (ldn2, 'LDN Two', 'GB', 'gb:london')
  on conflict (id) do update set display_name = excluded.display_name, city_slug = excluded.city_slug;

  -- 1. Canonical city_slug registration: missing/invalid rejected, valid persisted to profile & finalized as 2v2 squads.
  city_cup := public.admin_save_special_event_edition(
    admin_id, null, 'test-city-2v2-' || substr(admin_id::text, 1, 8), 'city-squads', 'running',
    'Metro 2v2', 'Canonical city squads',
    '{"version":1,"grouping":{"kind":"profile_attr","attr":"city_slug","targetSquadSize":2,"minSquadSize":2,"leftoverPolicy":"spectate"},"match":{"kind":"single_round","targetHeatSize":4,"minHeatSize":2},"cadence":{"unit":"single_week","roundCount":1,"scoreMode":"round_window"},"scoring":{"mode":"total_volume"},"divisionMode":"rating_tiers"}'::jsonb,
    now_at - interval '1 day', now_at + interval '1 day', now_at + interval '1 day', now_at + interval '8 days', true
  );

  perform set_config('request.jwt.claim.sub', ny1::text, true);
  begin
    perform public.register_special_event(city_cup.id, null, 'not-a-city');
    raise exception 'expected invalid city_slug rejection';
  exception when others then
    if sqlerrm not like '%city_required%' then raise; end if;
  end;

  perform public.register_special_event(city_cup.id, null, 'US:New-York');
  if (select city_slug from public.profiles where id = ny1) <> 'us:new-york' then
    raise exception 'expected canonical city_slug persisted to profile';
  end if;

  for i in 1..3 loop
    perform set_config('request.jwt.claim.sub', (array[ny2, ldn1, ldn2])[i]::text, true);
    perform public.register_special_event(city_cup.id, null, null);
  end loop;

  perform public.admin_advance_special_event(admin_id, city_cup.id, 'finalize');
  if (select count(*) from public.special_event_sides where edition_id = city_cup.id and group_attr = 'city_slug') <> 2 then
    raise exception 'expected 2 canonical city squads';
  end if;

  -- 2. Repeating auto-schedule templates: active materializes once & advances by cadence_weeks; paused is skipped.
  active_tpl := public.admin_save_special_event_template(
    admin_id, null, tpl_series, 'running',
    'Auto Daily Survivor', 'Repeats bi-weekly',
    '{"version":1,"grouping":{"kind":"solo"},"match":{"kind":"survivor_heat","targetHeatSize":8,"minHeatSize":3,"eliminatePerRound":1},"cadence":{"unit":"daily","roundCount":7,"scoreMode":"round_window"},"scoring":{"mode":"total_volume"},"divisionMode":"rating_tiers"}'::jsonb,
    2::smallint, true, mon_start_at
  );

  paused_tpl := public.admin_save_special_event_template(
    admin_id, null, paused_series, 'running',
    'Paused Series', 'Should not materialize',
    '{"version":1,"grouping":{"kind":"solo"},"match":{"kind":"single_round","targetHeatSize":8,"minHeatSize":2},"cadence":{"unit":"single_week","roundCount":1,"scoreMode":"round_window"},"scoring":{"mode":"total_volume"},"divisionMode":"rating_tiers"}'::jsonb,
    1::smallint, false, mon_start_at
  );

  created := public.admin_run_special_event_templates(admin_id);
  if created < 1 then
    raise exception 'expected at least 1 materialized edition, got %', created;
  end if;

  select * into auto_ed from public.special_event_editions where series_key = tpl_series limit 1;
  if auto_ed.id is null or not auto_ed.published then
    raise exception 'expected published materialized edition for %', tpl_series;
  end if;
  if ((auto_ed.ends_at at time zone 'America/New_York')::date - (auto_ed.starts_at at time zone 'America/New_York')::date) <> 7 then
    raise exception 'expected 1-week duration for bi-weekly daily survivor, got % to %', auto_ed.starts_at, auto_ed.ends_at;
  end if;

  if (select ((next_start_at at time zone 'America/New_York')::date - mon_start_day) from public.special_event_templates where id = active_tpl.id) <> 14 then
    raise exception 'expected next_start_at to advance by 14 days for cadence_weeks=2';
  end if;

  if exists (select 1 from public.special_event_editions where series_key = paused_series) then
    raise exception 'paused template should not materialize';
  end if;

  created_again := public.admin_run_special_event_templates(admin_id);
  if created_again <> 0 then
    raise exception 'expected idempotent second run (0 created), got %', created_again;
  end if;
end;
$$;
