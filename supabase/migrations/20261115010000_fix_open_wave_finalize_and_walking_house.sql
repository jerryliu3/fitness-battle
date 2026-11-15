-- Fix private.finalize_week_wave early return when another field (e.g. a crew field)
-- already exists in the same (sport, wave_start, week_end) wave, exclude house-match-pool
-- accounts from autonomous candidate pooling, and seed daily_health_readings for walking
-- house-match accounts so walking fields reflect real house steps.

create or replace function private.ensure_house_wave_workouts(p_sport text, p_start timestamptz, p_end timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare
  athlete uuid;
  n integer := 0;
  when_at timestamptz;
  meters numeric;
  seconds numeric;
  category uuid;
  start_day date;
  end_day date;
  end_bound date;
begin
  if p_start > clock_timestamp() or p_end <= p_start then return; end if;
  when_at := greatest(p_start, least(clock_timestamp() - interval '1 minute', p_end - interval '1 second'));
  start_day := (timezone('America/New_York', p_start))::date;
  end_day := (timezone('America/New_York', when_at))::date;
  end_bound := (timezone('America/New_York', p_end))::date;
  select id into category from public.categories where slug = p_sport;
  for athlete in select u.id from auth.users u where u.raw_app_meta_data->>'fixture' = 'house-match-pool' order by u.id loop
    n := n + 1;
    if p_sport = 'walking' then
      insert into public.daily_health_readings(user_id, provider, day, steps)
      select
        athlete,
        'mock',
        d::date,
        3400 + n * 450 + ((extract(doy from d)::integer + n) % 4) * 300
      from generate_series(start_day::timestamp, end_day::timestamp, interval '1 day') as d
      where d::date < end_bound
      on conflict (user_id, provider, day) do nothing;
    end if;
    if category is null or exists (
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

create or replace function private.finalize_week_wave(p_sport text, p_start timestamptz, p_end timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare
  pool jsonb;
  head jsonb;
  roster uuid[];
  assigned uuid[] := '{}';
  crew uuid;
  cap integer;
  f uuid;
  target_elo numeric;
  label text;
  syn text[];
  existing_field public.week_fields;
begin
  if p_start > clock_timestamp() then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_sport || extract(epoch from p_start)::text, 61028));
  update public.week_fields set roster_locked_at = coalesce(roster_locked_at, statement_timestamp())
    where sport = p_sport and wave_start = p_start and week_end = p_end and roster_locked_at is null;
  with latest as (
    select distinct on (e.user_id) e.* from public.wave_enrollments e
    where e.sport = p_sport and e.wave_start <= p_start order by e.user_id, e.wave_start desc
  ), candidates as (
    select e.user_id, e.capacity, e.registered_at,
      case when e.crew_id is not null and exists(select 1 from public.crew_members m where m.crew_id = e.crew_id and m.user_id = e.user_id and m.status = 'active') then e.crew_id end as crew_id,
      case when p_sport in ('running', 'cycling') then case when r.lock_period = p_start then r.lock_verified else r.verified_elo end else case when r.lock_period = p_start then r.lock_open else r.open_elo end end as elo
    from latest e
    join auth.users u on u.id = e.user_id
    join public.sport_ratings r on r.user_id = e.user_id and r.sport = e.sport and r.opted_in
    where coalesce(u.raw_app_meta_data->>'fixture', '') <> 'house-match-pool'
      and e.registered_at <= p_start
      and not exists (
        select 1 from public.week_fields wf
        where wf.sport = p_sport
          and wf.wave_start = p_start
          and wf.week_end = p_end
          and e.user_id = any(wf.member_ids)
      )
      and (
        (e.wave_start = p_start and e.week_end = p_end) or
        (e.week_end <= p_start and e.auto_enroll_next and p_start = (date_trunc('week', p_start at time zone 'America/New_York') + interval '6 hours') at time zone 'America/New_York')
      )
  ) select coalesce(jsonb_agg(to_jsonb(c) order by c.crew_id nulls last, c.elo, c.registered_at, c.user_id), '[]') into pool from candidates c;
  while jsonb_array_length(pool) > 0 loop
    head := pool->0; crew := (head->>'crew_id')::uuid; cap := (head->>'capacity')::integer;
    select array_agg((x->>'user_id')::uuid order by x->>'user_id'), percentile_disc(0.5) within group(order by (x->>'elo')::numeric)
      into roster, target_elo from (
        select x from jsonb_array_elements(pool) x where (x->>'crew_id')::uuid is not distinct from crew and (x->>'capacity')::integer = cap
          and (crew is not null or abs((x->>'elo')::numeric - (head->>'elo')::numeric) <= 400)
        order by ((x->>'user_id')::uuid = (head->>'user_id')::uuid) desc, exists(
          select 1 from public.weekly_field_choices c join public.weekly_field_choices rev
            on rev.field_id = c.field_id and rev.actor_id = c.recipient_id and rev.recipient_id = c.actor_id and rev.track = c.track and rev.repeat
          join public.week_fields source on source.id = c.field_id and source.sport = p_sport and source.week_end <= p_start
          where c.actor_id = (head->>'user_id')::uuid and c.recipient_id = (x->>'user_id')::uuid and c.repeat
            and c.expires_at > p_start and rev.expires_at > p_start and c.attempted_wave is null and rev.attempted_wave is null
        ) desc, abs((x->>'elo')::numeric - (head->>'elo')::numeric), x->>'user_id' limit cap
      ) picks;
    f := gen_random_uuid(); syn := private.wave_synthetics(p_sport, target_elo, cap - cardinality(roster), f::text);
    label := coalesce((select name from public.crews where id = crew), 'Open Field');
    insert into public.week_fields(id, sport, wave_start, week_end, capacity, crew_id, name, member_ids, synthetic_ids, roster_locked_at)
      values(f, p_sport, p_start, p_end, cap, crew, label, roster, syn, statement_timestamp());
    update public.wave_enrollments e set field_id = f, crew_id = crew,
      peer_ids = array(select id::text from unnest(roster) id where id <> e.user_id), synthetic_ids = syn
      where e.user_id = any(roster) and e.sport = p_sport and e.wave_start = p_start and e.week_end = p_end;
    assigned := assigned || roster;
    select coalesce(jsonb_agg(x), '[]') into pool from jsonb_array_elements(pool) x where not (x->>'user_id')::uuid = any(roster);
  end loop;
  for existing_field in
    select * from public.week_fields
    where sport = p_sport and wave_start = p_start and week_end = p_end and crew_id is null
    order by cardinality(member_ids), id
  loop
    perform private.seat_house_accounts(existing_field);
  end loop;
  if cardinality(assigned) > 0 then
    update public.weekly_field_choices c set attempted_wave = p_start
      where c.actor_id = any(assigned) and c.repeat and c.attempted_wave is null and c.expires_at > p_start
        and exists(select 1 from public.week_fields source where source.id = c.field_id and source.sport = p_sport and source.week_end <= p_start)
        and exists(select 1 from public.weekly_field_choices rev where rev.field_id = c.field_id and rev.actor_id = c.recipient_id
          and rev.recipient_id = c.actor_id and rev.track = c.track and rev.repeat and rev.expires_at > p_start);
  end if;
end; $$;

do $$
declare
  field public.week_fields;
  wave record;
begin
  update public.sport_ratings r
  set opted_in = true
  from auth.users u
  where r.user_id = u.id
    and u.raw_app_meta_data->>'fixture' = 'house-match-pool'
    and not r.opted_in;

  for wave in
    select distinct sport, wave_start, week_end
    from public.wave_enrollments
    where crew_id is null and wave_start <= clock_timestamp() and week_end > clock_timestamp() and field_id is null
  loop
    perform private.finalize_week_wave(wave.sport, wave.wave_start, wave.week_end);
  end loop;

  for field in
    select * from public.week_fields
    where crew_id is null and wave_start <= clock_timestamp() and week_end > clock_timestamp()
    order by cardinality(member_ids), id
  loop
    perform private.seat_house_accounts(field);
  end loop;
end; $$;
