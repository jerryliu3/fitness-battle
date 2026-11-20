-- Run after migrations inside a rollback-only transaction. Not a seed.
do $$
<<fixture>>
declare
  real_uid uuid := gen_random_uuid();
  alice_uid uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  demo_ed_id uuid;
  real_list jsonb;
  alice_list jsonb;
  standings jsonb;
begin
  -- Real production athlete (non-demo email) must NEVER see demo_only editions.
  insert into auth.users(id, email) values (real_uid, 'real-prod-' || substr(real_uid::text, 1, 8) || '@example.org');
  insert into public.profiles(id, display_name, country_code) values (real_uid, 'Real Athlete', 'US') on conflict do nothing;

  select id into demo_ed_id from public.special_event_editions where demo_only = true limit 1;
  if demo_ed_id is null then
    insert into public.special_event_editions(
      slug, series_key, sport, title, subtitle, config,
      registration_opens_at, registration_closes_at, starts_at, ends_at, published, demo_only
    ) values (
      'test-demo-only-' || substr(real_uid::text, 1, 8), 'demo-test', 'running',
      'Demo Only Event', 'Isolated',
      '{"version":1,"grouping":{"kind":"solo"},"match":{"kind":"single_round","targetHeatSize":8,"minHeatSize":2},"cadence":{"unit":"single_week","roundCount":1,"scoreMode":"round_window"},"scoring":{"mode":"total_volume"},"divisionMode":"none"}'::jsonb,
      clock_timestamp() - interval '1 day', clock_timestamp() + interval '1 day', clock_timestamp() + interval '1 day', clock_timestamp() + interval '8 days', true, true
    ) returning id into demo_ed_id;
  end if;

  perform set_config('request.jwt.claim.sub', real_uid::text, true);
  real_list := public.list_special_events();
  if exists (select 1 from jsonb_array_elements(real_list) e where (e->>'id')::uuid = demo_ed_id) then
    raise exception 'real production athlete should never see demo_only special events';
  end if;

  begin
    perform public.register_special_event(demo_ed_id, null, null);
    raise exception 'real athlete should not be able to register in demo_only edition';
  exception when others then
    if sqlerrm not like '%edition_not_found%' then raise; end if;
  end;

  -- If seeded demo accounts exist, verify Alice sees all 5 seeded editions and live standings.
  if exists (select 1 from public.profiles where id = alice_uid) then
    perform set_config('request.jwt.claim.sub', alice_uid::text, true);
    alice_list := public.list_special_events();
    if jsonb_array_length(alice_list) < 5 then
      raise exception 'expected at least 5 seeded demo special events for alice, got %', jsonb_array_length(alice_list);
    end if;

    select id into demo_ed_id from public.special_event_editions where slug = 'demo-metro-2v2';
    if demo_ed_id is not null then
      standings := public.special_event_standings(demo_ed_id);
      if jsonb_array_length(standings->'rounds') < 1 or jsonb_array_length(standings->'mySquad') <> 2 then
        raise exception 'expected live Metro 2v2 standings with 2-person squad breakdown for alice';
      end if;
    end if;
  end if;
end;
$$;
