-- Ensure pre-existing, unlocked, and future-activated open fields always seat house-match competitors and workouts.

create or replace function private.house_match_ids(p_sport text, p_elo numeric, p_exclude uuid[], p_limit integer)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce((
    select array_agg(id order by distance, id) from (
      select u.id,
        abs(
          case when p_sport in ('running', 'cycling')
            then coalesce(r.verified_elo, 1000)
            else coalesce(r.open_elo, 1000)
          end - coalesce(p_elo, 1000)
        ) as distance
      from auth.users u
      left join public.sport_ratings r on r.user_id = u.id and r.sport = p_sport
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

create or replace function private.ensure_house_wave_workouts(p_sport text, p_start timestamptz, p_end timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare athlete uuid; n integer := 0; when_at timestamptz; meters numeric; seconds numeric; category uuid;
begin
  if p_start > clock_timestamp() or p_end <= p_start then return; end if;
  when_at := greatest(p_start, least(clock_timestamp() - interval '1 minute', p_end - interval '1 second'));
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

create or replace function private.seat_house_accounts(p_field public.week_fields)
returns void language plpgsql security definer set search_path = '' as $$
declare added uuid[]; seated uuid[];
begin
  if p_field.crew_id is not null or p_field.wave_start > clock_timestamp() then return; end if;
  perform private.ensure_house_wave_workouts(p_field.sport, p_field.wave_start, p_field.week_end);
  if cardinality(p_field.member_ids) >= p_field.capacity then return; end if;
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
  update public.wave_enrollments e
  set field_id = case when e.field_id is null and e.crew_id is null then p_field.id else e.field_id end,
      peer_ids = array(select x::text from unnest(seated) x where x <> e.user_id)
  where e.sport = p_field.sport and e.wave_start = p_field.wave_start and e.week_end = p_field.week_end and e.user_id = any(seated);
end; $$;

create or replace function private.finalize_week_wave(p_sport text, p_start timestamptz, p_end timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare pool jsonb; head jsonb; roster uuid[]; assigned uuid[] := '{}'; crew uuid; cap integer; f uuid;
  target_elo numeric; label text; syn text[]; existing_field public.week_fields;
begin
  if p_start > clock_timestamp() then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_sport || extract(epoch from p_start)::text, 61028));
  if exists(select 1 from public.week_fields where sport = p_sport and wave_start = p_start and week_end = p_end) then
    update public.week_fields set roster_locked_at = coalesce(roster_locked_at, statement_timestamp())
      where sport = p_sport and wave_start = p_start and week_end = p_end and roster_locked_at is null;
    for existing_field in
      select * from public.week_fields
      where sport = p_sport and wave_start = p_start and week_end = p_end and crew_id is null
      order by cardinality(member_ids), id
    loop
      perform private.seat_house_accounts(existing_field);
    end loop;
    return;
  end if;
  with latest as (
    select distinct on (e.user_id) e.* from public.wave_enrollments e
    where e.sport = p_sport and e.wave_start <= p_start order by e.user_id, e.wave_start desc
  ), candidates as (
    select e.user_id, e.capacity, e.registered_at,
      case when e.crew_id is not null and exists(select 1 from public.crew_members m where m.crew_id = e.crew_id and m.user_id = e.user_id and m.status = 'active') then e.crew_id end as crew_id,
      case when p_sport in ('running', 'cycling') then case when r.lock_period = p_start then r.lock_verified else r.verified_elo end else case when r.lock_period = p_start then r.lock_open else r.open_elo end end as elo
    from latest e join public.sport_ratings r on r.user_id = e.user_id and r.sport = e.sport and r.opted_in
    where e.registered_at <= p_start and (
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
  loop
    perform private.seat_house_accounts(existing_field);
  end loop;
  update public.weekly_field_choices c set attempted_wave = p_start
    where c.actor_id = any(assigned) and c.repeat and c.attempted_wave is null and c.expires_at > p_start
      and exists(select 1 from public.week_fields source where source.id = c.field_id and source.sport = p_sport and source.week_end <= p_start)
      and exists(select 1 from public.weekly_field_choices rev where rev.field_id = c.field_id and rev.actor_id = c.recipient_id
        and rev.recipient_id = c.actor_id and rev.track = c.track and rev.repeat and rev.expires_at > p_start);
end; $$;

create or replace function public.resolve_week_field(p_sport text, p_wave_start timestamptz, p_week_end timestamptz) returns public.week_fields
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); f public.week_fields;
begin
  if uid is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.wave_enrollments where user_id = uid and sport = p_sport and wave_start = p_wave_start and week_end = p_week_end)
    and not exists(select 1 from public.wave_enrollments where user_id = uid and sport = p_sport and auto_enroll_next and week_end <= p_wave_start
      and p_wave_start = (date_trunc('week', p_wave_start at time zone 'America/New_York') + interval '6 hours') at time zone 'America/New_York'
      and p_week_end = private.wave_week_end(p_wave_start))
    and not exists(select 1 from public.week_fields where sport = p_sport and wave_start = p_wave_start and week_end = p_week_end and uid = any(member_ids)) then
    raise exception 'not_registered';
  end if;
  if p_wave_start > statement_timestamp() then return null; end if;
  perform private.finalize_week_wave(p_sport, p_wave_start, p_week_end);
  select field.* into f from public.week_fields field
    where field.sport = p_sport and field.wave_start = p_wave_start and field.week_end = p_week_end and uid = any(field.member_ids)
    order by exists(select 1 from public.wave_enrollments e where e.user_id = uid and e.sport = p_sport and e.field_id = field.id) desc, field.created_at desc, field.id limit 1;
  if f.id is null then raise exception 'field_not_assigned'; end if;
  if f.crew_id is null and f.wave_start <= clock_timestamp() then
    perform private.seat_house_accounts(f);
    select * into f from public.week_fields where id = f.id;
  end if;
  return f;
end; $$;

do $$
declare
  field public.week_fields;
  enrollment public.wave_enrollments;
begin

  update public.sport_ratings r
  set opted_in = true
  from auth.users u
  where r.user_id = u.id
    and u.raw_app_meta_data->>'fixture' = 'house-match-pool'
    and not r.opted_in;

  for enrollment in
    select * from public.wave_enrollments
    where crew_id is null and wave_start <= clock_timestamp() and week_end > clock_timestamp() and field_id is null
  loop
    perform private.finalize_week_wave(enrollment.sport, enrollment.wave_start, enrollment.week_end);
  end loop;

  for field in
    select * from public.week_fields
    where crew_id is null and wave_start <= clock_timestamp() and week_end > clock_timestamp()
    order by cardinality(member_ids), id
  loop
    perform private.seat_house_accounts(field);
  end loop;
end; $$;
