-- Open fields seat the same ten stored accounts in every sport, every week.
-- Generated filler ids are cleared and can no longer be written.

create or replace function private.wave_synthetics(p_sport text, p_elo numeric, p_count integer, p_seed text)
returns text[] language sql immutable set search_path = '' as $$ select '{}'::text[]; $$;

create function private.reject_synthetic_field_fillers()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.synthetic_ids := '{}'::text[];
  return new;
end; $$;
revoke all on function private.reject_synthetic_field_fillers() from public, anon, authenticated;
create trigger week_fields_no_synthetic_fillers before insert or update on public.week_fields
  for each row execute function private.reject_synthetic_field_fillers();
create trigger wave_enrollments_no_synthetic_fillers before insert or update on public.wave_enrollments
  for each row execute function private.reject_synthetic_field_fillers();
update public.week_fields set synthetic_ids = '{}' where cardinality(synthetic_ids) > 0;
update public.wave_enrollments set synthetic_ids = '{}' where cardinality(synthetic_ids) > 0;

create function private.house_match_ids(p_sport text, p_elo numeric, p_exclude uuid[], p_limit integer)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce((
    select array_agg(id order by distance, id) from (
      select u.id,
        abs(case when p_sport in ('running','cycling') then r.verified_elo else r.open_elo end - coalesce(p_elo, 1000)) as distance
      from auth.users u
      join public.sport_ratings r on r.user_id = u.id and r.sport = p_sport and r.opted_in
      where u.raw_app_meta_data->>'fixture' = 'house-match-pool'
        and not u.id = any(coalesce(p_exclude, '{}'::uuid[]))
        and not exists (
          select 1 from public.athlete_blocks b
          where (b.blocker_id = u.id and b.blocked_id = any(coalesce(p_exclude, '{}'::uuid[])))
             or (b.blocked_id = u.id and b.blocker_id = any(coalesce(p_exclude, '{}'::uuid[])))
        )
      order by 2, u.id
      limit greatest(0, coalesce(p_limit, 0))
    ) picked
  ), '{}'::uuid[]);
$$;
revoke all on function private.house_match_ids(text, numeric, uuid[], integer) from public, anon, authenticated;

create function private.ensure_house_wave_workouts(p_sport text, p_start timestamptz, p_end timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare athlete uuid; n integer := 0; when_at timestamptz; meters numeric; seconds numeric; category uuid;
begin
  if p_start > clock_timestamp() or p_end <= p_start then return; end if;
  when_at := least(clock_timestamp() - interval '1 minute', p_end - interval '1 second');
  if when_at < p_start then return; end if;
  select id into category from public.categories where slug = p_sport;
  if category is null then return; end if;
  for athlete in select u.id from auth.users u where u.raw_app_meta_data->>'fixture' = 'house-match-pool' order by u.id loop
    n := n + 1;
    if exists (
      select 1 from public.activities a
      where a.user_id = athlete and a.sport = p_sport and a.disposition = 'counted' and a.provenance = 'recorded'
        and a.started_at >= p_start and a.started_at < least(p_end, clock_timestamp())
    ) then continue; end if;
    meters := case p_sport when 'cycling' then 14000 when 'walking' then 2800 when 'strength' then 0 else 5200 end + n * 400;
    seconds := case p_sport when 'cycling' then 2700 when 'strength' then 2000 else 1900 end + n * 80;
    insert into public.activities(
      user_id, provider, external_id, category_id, started_at, metric_value, moving_sec, avg_hr, raw_name,
      sport, distance_m, verified, provenance, disposition, compete_key, source_label
    ) values (
      athlete, 'mock', 'house-' || athlete::text || '-' || p_sport || '-' || extract(epoch from p_start)::bigint,
      category, when_at, case when p_sport = 'strength' then seconds else meters end, seconds, 130 + n,
      'Training', p_sport, meters, p_sport <> 'strength', 'recorded', 'counted',
      'house-' || athlete::text || '-' || p_sport || '-' || extract(epoch from p_start)::bigint, 'manual'
    ) on conflict (user_id, provider, external_id) do nothing;
  end loop;
end; $$;
revoke all on function private.ensure_house_wave_workouts(text, timestamptz, timestamptz) from public, anon, authenticated;

-- Exclusion is this field only, so the same accounts can fill every open event.
create function private.seat_house_accounts(p_field public.week_fields)
returns void language plpgsql security definer set search_path = '' as $$
declare added uuid[]; seated uuid[];
begin
  if p_field.crew_id is not null or p_field.wave_start > clock_timestamp() or cardinality(p_field.member_ids) >= p_field.capacity then return; end if;
  perform private.ensure_house_wave_workouts(p_field.sport, p_field.wave_start, p_field.week_end);
  added := private.house_match_ids(
    p_field.sport,
    (select percentile_disc(0.5) within group (order by case when p_field.sport in ('running','cycling') then r.verified_elo else r.open_elo end)
      from public.sport_ratings r where r.user_id = any(p_field.member_ids) and r.sport = p_field.sport),
    p_field.member_ids, p_field.capacity - cardinality(p_field.member_ids));
  if coalesce(cardinality(added), 0) = 0 then return; end if;
  seated := p_field.member_ids || added;
  update public.week_fields f set member_ids = seated,
    entry_ratings = coalesce(f.entry_ratings, '{}'::jsonb) || coalesce((
      select jsonb_object_agg(r.user_id::text, jsonb_build_object(
        'open', case when r.lock_period = f.wave_start then r.lock_open else r.open_elo end,
        'verified', case when r.lock_period = f.wave_start then r.lock_verified else r.verified_elo end))
      from public.sport_ratings r where r.sport = f.sport and r.user_id = any(added)), '{}'::jsonb)
  where f.id = p_field.id;
  insert into public.wave_enrollments(user_id, sport, wave_start, week_end, capacity, peer_ids, synthetic_ids, auto_enroll_next, crew_id, registered_at, field_id)
  select id, p_field.sport, p_field.wave_start, p_field.week_end, p_field.capacity,
    array(select x::text from unnest(seated) x where x <> id), '{}', true, null, p_field.wave_start - interval '1 minute', p_field.id
  from unnest(added) id
  on conflict (user_id, sport) do update set
    wave_start = excluded.wave_start, week_end = excluded.week_end, capacity = excluded.capacity,
    peer_ids = excluded.peer_ids, crew_id = null, field_id = excluded.field_id, auto_enroll_next = true,
    registered_at = least(public.wave_enrollments.registered_at, excluded.registered_at);
  update public.wave_enrollments e set peer_ids = array(select x::text from unnest(seated) x where x <> e.user_id)
    where e.sport = p_field.sport and e.wave_start = p_field.wave_start and e.week_end = p_field.week_end and e.user_id = any(seated);
end; $$;
revoke all on function private.seat_house_accounts(public.week_fields) from public, anon, authenticated;

create function private.seat_house_accounts_on_field()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.seat_house_accounts(new);
  return new;
end; $$;
revoke all on function private.seat_house_accounts_on_field() from public, anon, authenticated;
create trigger week_fields_seat_house_accounts after insert on public.week_fields
  for each row execute function private.seat_house_accounts_on_field();

do $$
declare
  names text[] := array['Noah Brooks','Priya Shah','Hana Ito','Owen Blake','Sofia Rossi','Jonah Adeyemi','Mina Cho','Chris Dalton','Lila Berg','Sam Okonkwo'];
  cities text[] := array['Brooklyn','Queens','Manhattan','Jersey City','Brooklyn','Queens','Manhattan','Hoboken','Brooklyn','Queens'];
  sports text[] := array['running','cycling','walking','strength'];
  athlete uuid; n integer; seed_sport text; mail text; elo numeric;
  monday timestamptz := date_trunc('week', clock_timestamp() at time zone 'America/New_York') at time zone 'America/New_York';
  field public.week_fields;
begin
  for n in 1..10 loop
    athlete := ('c0ffee00-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
    if exists(select 1 from auth.users where id = athlete and raw_app_meta_data->>'fixture' is distinct from 'house-match-pool') then
      raise exception 'reserved_house_id_in_use';
    end if;
    mail := 'house-match-' || n || '@example.com';
    elo := 900 + n * 70;
    insert into auth.users(
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
      reauthentication_token, email_change, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      athlete, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', mail,
      extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')), now(), '', '', '', '', '', '',
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'fixture', 'house-match-pool'),
      jsonb_build_object('display_name', names[n]), now(), now()
    ) on conflict (id) do nothing;
    insert into auth.identities(id, user_id, provider_id, identity_data, provider, created_at, updated_at)
      values(athlete, athlete, athlete::text, jsonb_build_object('sub', athlete::text, 'email', mail, 'email_verified', true), 'email', now(), now())
      on conflict (provider_id, provider) do nothing;
    insert into public.profiles(id, display_name, city, primary_sport)
      values(athlete, names[n], cities[n], 'running')
      on conflict (id) do update set display_name = excluded.display_name, city = excluded.city, primary_sport = excluded.primary_sport;
    insert into public.athlete_prefs(user_id, freezes_left, calibrated, onboarding_completed, clock_period_start, focus_family, focus_id, units)
      values(athlete, 3, true, true, monday, 'sport', 'running', 'us')
      on conflict (user_id) do update set onboarding_completed = true, calibrated = true;
    foreach seed_sport in array sports loop
      insert into public.sport_ratings(user_id, sport, open_elo, verified_elo, opted_in, lock_open, lock_verified, lock_period)
        values(athlete, seed_sport, elo, elo, true, elo, elo, monday)
        on conflict (user_id, sport) do update set opted_in = true, open_elo = excluded.open_elo, verified_elo = excluded.verified_elo,
          lock_open = excluded.lock_open, lock_verified = excluded.lock_verified, lock_period = excluded.lock_period;
    end loop;
  end loop;
  for field in
    select * from public.week_fields
    where crew_id is null and wave_start <= clock_timestamp() and week_end > clock_timestamp() and cardinality(member_ids) < capacity
    order by cardinality(member_ids), id
  loop
    perform private.seat_house_accounts(field);
  end loop;
end; $$;
